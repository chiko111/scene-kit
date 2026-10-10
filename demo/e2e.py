import json, sys
from playwright.sync_api import sync_playwright, expect

import os, tempfile
SCRATCH = os.environ.get('E2E_OUT', tempfile.gettempdir())
URL = 'https://localhost:5173/'
errors = []
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f' — {detail}' if detail and not cond else ''))

def scene_json(page):
    page.get_by_role('tab', name='JSON').click()
    data = json.loads(page.get_by_label('Scene JSON').input_value())
    return data

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(ignore_https_errors=True, viewport={'width': 1440, 'height': 1000})
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_selector('.ske-root')

    # 1. Add a background image by URL
    page.get_by_placeholder('https://cdn…/image.webp').fill('https://localhost:5173/bg.png')
    page.get_by_role('button', name='Add image').click()
    page.wait_for_selector('.ske-canvas .sk-img')
    img_ok = page.eval_on_selector('.ske-canvas .sk-img', 'i => i.complete && i.naturalWidth > 0')
    check('image by URL renders', img_ok)

    # 2. Reject http:// URL
    page.get_by_placeholder('https://cdn…/image.webp').fill('http://localhost/x.png')
    page.get_by_role('button', name='Add image').click()
    expect(page.get_by_text('Image URL must start with https://')).to_be_visible()
    check('http URL rejected', True)

    # 3. Upload animated webp via file input
    page.set_input_files('input[type=file]', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'coin.webp'))
    page.get_by_role('button', name='Add image').click()
    page.wait_for_function("document.querySelectorAll('.ske-canvas .sk-img').length === 2")
    check('upload adds animated webp', True)

    # 4. Add button + effects
    page.get_by_role('button', name='+ Button').click()
    expect(page.locator('.ske-canvas .sk-btn')).to_have_text('Play now')
    page.get_by_role('button', name='+ Pulse').click()
    page.get_by_role('button', name='+ Pulsing outline').click()
    page.get_by_role('button', name='+ Fade in').click()
    ring = page.locator('.ske-canvas .sk-ring')
    check('outline ring rendered', ring.count() == 1)
    anims = page.eval_on_selector('.ske-canvas .sk-btn', "b => b.parentElement.getAnimations().map(a => a.animationName + ':' + a.playState)")
    check('pulse + fade animations running', any(a.startswith('sk-pulse:running') for a in anims) and any(a.startswith('sk-fade') for a in anims), str(anims))
    ring_anim = page.eval_on_selector('.ske-canvas .sk-ring', "r => r.getAnimations().map(a => a.animationName + ':' + a.playState)")
    check('ring animation running', ring_anim == ['sk-ring:running'], str(ring_anim))

    # 5. Pause toggle pauses CSS animations
    page.get_by_role('button', name='Pause animations').click()
    paused = page.eval_on_selector('.ske-canvas .sk-btn', "b => b.parentElement.getAnimations().map(a => a.playState)")
    check('pause toggles playState', all(s == 'paused' for s in paused), str(paused))
    page.get_by_role('button', name='Play animations').click()

    # 6. Drag the selected button
    before = scene_json(page)['nodes'][-1]['frame']
    page.get_by_role('tab', name='Properties').click()
    box = page.locator('.ske-box.is-selected').bounding_box()
    page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] / 2 + 60, box['y'] + box['height'] / 2 + 30, steps=8)
    page.mouse.up()
    after = scene_json(page)['nodes'][-1]['frame']
    check('drag moves node', after['x'] > before['x'] and after['y'] > before['y'], f'{before} -> {after}')

    # 7. Undo drag = exactly one step
    page.get_by_role('tab', name='Properties').click()
    page.keyboard.press('Control+z')
    undone = scene_json(page)['nodes'][-1]['frame']
    check('undo reverts whole drag in one step', undone == before, f'{undone} vs {before}')
    page.keyboard.press('Control+Shift+z')
    check('redo restores drag', scene_json(page)['nodes'][-1]['frame'] == after)

    # 8. Resize via handle with min size
    page.get_by_role('tab', name='Properties').click()
    se = page.locator('.ske-handle-se').bounding_box()
    page.mouse.move(se['x'] + 5, se['y'] + 5)
    page.mouse.down()
    page.mouse.move(se['x'] - 2000, se['y'] - 2000, steps=5)
    page.mouse.up()
    tiny = scene_json(page)['nodes'][-1]['frame']
    check('resize clamps to min size', tiny['w'] >= 1 and tiny['h'] >= 1, str(tiny))
    page.get_by_role('tab', name='Properties').click()
    page.keyboard.press('Control+z')

    # 9. Typing a label = single undo step
    label = page.get_by_label('Label', exact=True)
    label.fill('Bet now')
    label.press('Tab')
    expect(page.locator('.ske-canvas .sk-btn')).to_have_text('Bet now')
    page.locator('.ske-stage').click(position={'x': 5, 'y': 5})  # deselect via empty stage? (stage, not overlay)
    page.keyboard.press('Control+z')
    expect(page.locator('.ske-canvas .sk-btn')).to_have_text('Play now')
    check('label edit undone in one step', True)
    page.keyboard.press('Control+Shift+z')
    expect(page.locator('.ske-canvas .sk-btn')).to_have_text('Bet now')

    # 10. Action: invalid promo id is never committed
    page.locator('.ske-layer-name', has_text='Button').click()
    page.get_by_label('Action', exact=True).select_option('openPromo')
    promo = page.get_by_label('Promo id', exact=True)
    promo.fill('bad id!')
    invalid = promo.get_attribute('aria-invalid')
    promo.press('Tab')
    data = scene_json(page)
    check('invalid promo id not committed', data['nodes'][-1]['action'] == {'type': 'openPromo', 'promoId': 'promo'} and invalid == 'true', str(data['nodes'][-1]['action']))
    page.get_by_role('tab', name='Properties').click()
    page.get_by_label('Action', exact=True).select_option('navigate')
    page.get_by_label('Screen', exact=True).select_option('Casino')

    # 11. Save -> app preview -> press -> action fired
    page.get_by_role('tab', name='JSON').click()
    page.get_by_role('button', name='Save').click()
    expect(page.get_by_text('Saved at')).to_be_visible()
    preview_btn = page.get_by_test_id('app-preview').locator('.sk-btn').first
    preview_btn.click(force=True)  # it pulses, so it's never 'stable'
    actions = json.loads(page.get_by_test_id('actions').inner_text())
    check('app preview fires whitelisted action', actions == [{'type': 'navigate', 'route': 'Casino'}], str(actions))

    # 11b. Size limits keep the aspect ratio and never overflow the slot
    ar = 16 / 9
    box = page.get_by_test_id('limit-max-height').locator('.sk-scene').bounding_box()
    check('maxHeight limits height and keeps ratio', abs(box['height'] - 120) < 1 and abs(box['width'] - 120 * ar) < 1, str(box))
    slot = page.get_by_test_id('limit-contain').bounding_box()
    box = page.get_by_test_id('limit-contain').locator('.sk-scene').bounding_box()
    centered = abs((box['y'] - slot['y']) - (slot['height'] - box['height']) / 2) < 1
    check('contain fits inside a fixed box, centered', abs(box['width'] - 300) < 1 and abs(box['height'] - 300 / ar) < 1 and centered, str(box))

    # 12. Editor buttons must not fire actions
    page.locator('.ske-canvas .sk-btn').click(force=True)
    actions2 = json.loads(page.get_by_test_id('actions').inner_text())
    check('editor preview is non-interactive', len(actions2) == 1)

    # 13. Import invalid / partially invalid JSON
    page.get_by_role('tab', name='JSON').click()
    page.get_by_placeholder('Paste scene JSON…').fill('{"version":3}')
    page.get_by_role('button', name='Load (undoable)').click()
    expect(page.get_by_text('Unsupported scene version 3')).to_be_visible()
    check('import rejects unknown version', True)
    good = scene_json(page)
    good['nodes'].append({'type': 'video', 'id': 'evil'})
    page.get_by_placeholder('Paste scene JSON…').fill(json.dumps(good))
    page.get_by_role('button', name='Load (undoable)').click()
    expect(page.locator('.ske-warnings')).to_contain_text('dropped invalid node')
    check('import drops invalid node with warning', True)

    # 14. Delete key + layer order
    page.get_by_role('tab', name='Properties').click()
    page.locator('.ske-layer-name', has_text='Button').click()
    page.get_by_role('button', name='Send backward').first.click()
    order = [n['type'] for n in scene_json(page)['nodes']]
    check('send backward reorders', order == ['image', 'button', 'image'], str(order))
    page.get_by_role('tab', name='Properties').click()
    page.locator('.ske-layer-name', has_text='Button').click()
    page.keyboard.press('Delete')
    check('delete removes layer', [n['type'] for n in scene_json(page)['nodes']] == ['image', 'image'])
    page.get_by_role('tab', name='Properties').click()
    page.keyboard.press('Control+z')
    check('undo delete', len(scene_json(page)['nodes']) == 3)

    page.get_by_role('tab', name='Properties').click()
    page.locator('.ske-layer-name', has_text='Button').click()
    page.wait_for_timeout(700)
    page.screenshot(path=f'{SCRATCH}/editor.png')
    browser.close()

real_errors = [e for e in errors if 'favicon' not in e]
check('no console errors', not real_errors, '\n'.join(real_errors[:5]))
failed = [r for r in results if not r[1]]
print(f'\n{len(results) - len(failed)}/{len(results)} passed')
sys.exit(1 if failed else 0)
