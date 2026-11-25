"""Builds sports-week.page.json (scene-kit Page v1) from the generated artwork (manifest.json sizes).
Run: python3 -I build_page.py
Layout mirrors the converted inbet path page (build.py → inbet_scene): a tall path of cards with chevrons
between them, header on top, podium at the bottom; desktop 1920 wide + mobile 750 wide.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'sports-week.page.json')
CDN = 'https://ibbgcdn.kubdev.com/common-content/landing-pages/container/sports-week/'
SIZES = {a['name']: (a['width'], a['height']) for a in json.load(open(os.path.join(HERE, 'manifest.json'), encoding='utf-8'))}


def r2(v):
    return round(v, 2)


def hover(px_per_u):
    # same as the inbet cards: scale 1.07, lift 8px, brightness 1.15, cyan glow 20px
    return {'scale': 1.07, 'lift': r2(8 / px_per_u), 'brightness': 1.15,
            'glow': {'color': 'accent', 'blur': r2(20 / px_per_u), 'opacity': 0.8}, 'durationMs': 500}


def img(id_, name, file, x, y, w, aspect, effects=(), alt='', action=None, hov=None, fit='contain'):
    iw, ih = SIZES[file]
    h = w * aspect / (iw / ih)  # frame height in % of scene height keeping the picture's ratio
    n = {'id': id_, 'name': name, 'type': 'image', 'uri': CDN + file + '.webp', 'fit': fit, 'alt': alt, 'radius': 0,
         'frame': {'x': r2(x), 'y': r2(y), 'w': r2(w), 'h': r2(h), 'rotation': 0},
         'opacity': 1, 'hidden': False, 'shadow': None, 'effects': list(effects)}
    if action:
        n['action'] = action
    if hov:
        n['hover'] = hov
    return n, h


def nav(route, path, params=None):
    a = {'type': 'navigate', 'route': route, 'webPath': path}
    if params:
        a['params'] = params
    return a


CARDS = [
    ('card1-boosted-odds', 'left', 'Повишени коефициенти на топ мачовете', nav('Sport', '/sport/boosted-odds'), 'slideRight'),
    ('card2-free-bet', 'right', 'Безплатен залог 10 € за нов клиент', nav('Promo', '/promotions/free-bet', {'slug': 'free-bet'}), 'slideLeft'),
    ('card3-accumulator', 'left', 'Акумулатор бонус до +50% за комбинирани залози', nav('Sport', '/sport/accumulator'), 'zoomIn'),
    ('card4-cashback', 'right', 'Кешбек до 20% при губещ залог', nav('Promo', '/promotions/cashback', {'slug': 'cashback'}), 'slideLeft'),
    ('card5-champions-league', 'left', 'Шампионска лига – специални пазари', nav('Sport', '/sport/champions-league'), 'bounceIn'),
    ('card6-live-bonus', 'right', 'Лайв бонус всяка вечер', nav('Sport', '/sport/live'), 'slideLeft'),
]


def scene(mobile):
    aspect = 750 / 3400 if mobile else 1920 / 4400  # matches bg-mob / bg-desk
    px_per_u = 3.9 if mobile else 14.4              # same conversion as the inbet page
    nodes = []
    bg, _ = img('bg', 'Background', 'bg-mob' if mobile else 'bg-desk', 0, 0, 100, aspect, fit='cover')
    bg['frame']['h'] = 100
    nodes.append(bg)

    hw = 92 if mobile else 68
    header, hh = img('header', 'СПОРТНА СЕДМИЦА', 'header-mob' if mobile else 'header-desk', 50 - hw / 2,
                     2.2 if mobile else 3.0, hw, aspect,
                     effects=[{'type': 'enter', 'preset': 'fadeDown', 'delayMs': 0, 'durationMs': 900}],
                     alt='Спортна седмица – оферти всеки ден', hov=hover(px_per_u))
    nodes.append(header)

    y = (2.2 if mobile else 3.0) + hh + (2.0 if mobile else 2.2)

    def card_w(iw):
        return min(94, 66 + iw / 1430 * 28) if mobile else iw / 1920 * 100 * 0.7

    # podium first, so the chevron gaps can stretch the path down to it (no empty band)
    pw = 92 if mobile else 52
    p_iw, p_ih = SIZES['podium']
    ph = pw * aspect / (p_iw / p_ih)
    p_top = 100 - ph - 1.0
    cards_h = sum(card_w(SIZES[f][0]) * aspect / (SIZES[f][0] / SIZES[f][1]) for f, *_ in CARDS)
    gap = max(3.0, min(9.0, (p_top - 1.5 - y - cards_h) / (len(CARDS) - 1)))
    chev_w = 13 if mobile else 6
    for i, (file, side, alt, action, preset) in enumerate(CARDS):
        iw, _ = SIZES[file]
        # desktop: widths follow the artwork (1030–1430 px of a 1920 canvas); mobile: 86–96%
        w = card_w(iw)
        shift = (3 if mobile else 8) * (-1 if side == 'left' else 1)
        x = max(1, min(99 - w, 50 - w / 2 + shift))
        loop = ({'type': 'float', 'distance': r2((10 if i % 2 == 0 else 8) / px_per_u), 'durationMs': 2500 + 250 * (i % 3),
                 'delayMs': 300 + i * 350}
                if i not in (2, 4) else
                {'type': 'wiggle', 'angle': 1.2, 'durationMs': 1600, 'delayMs': 300 + i * 350})
        card, ch = img(f'card{i + 1}', f'Card {i + 1} – {file.split("-", 1)[1]}', file, x, y, w, aspect,
                       effects=[{'type': 'enter', 'preset': preset, 'delayMs': 120 + i * 140, 'durationMs': 900}, loop],
                       alt=alt, action=action, hov=hover(px_per_u))
        nodes.append(card)
        y += ch
        if i < len(CARDS) - 1:
            nxt = CARDS[i + 1][1]
            cfile = 'chevron-down-left' if (side == 'right' and nxt == 'left') else 'chevron-down-right' if (side == 'left' and nxt == 'right') else 'chevron-down'
            chev, chh = img(f'chev{i + 1}', f'Chevron {i + 1}', cfile, 50 - chev_w / 2, y + (gap - 0) / 2 - chev_w * aspect / 2 + 0.2,
                            chev_w, aspect,
                            effects=[{'type': 'enter', 'preset': 'fade', 'delayMs': 300 + i * 140, 'durationMs': 700},
                                     {'type': 'float', 'distance': r2(6 / px_per_u), 'durationMs': 1400, 'delayMs': i * 200},
                                     {'type': 'parallax', 'depth': 0.2}])
            nodes.append(chev)
            y += gap

    py = max(y + 1.5, p_top)
    pod, _ = img('podium', 'Podium', 'podium', 50 - pw / 2, py, pw, aspect, alt='Футболна топка на подиум',
                 effects=[{'type': 'timeline', 'delayMs': 600, 'repeat': 'none', 'keyframes': [
                     {'atMs': 0, 'opacity': 0, 'x': 0, 'y': 3, 'scale': 0.8, 'rotate': 0, 'easing': 'linear'},
                     {'atMs': 650, 'opacity': 1, 'x': 0, 'y': -0.5, 'scale': 1.05, 'rotate': 0, 'easing': 'easeOut'},
                     {'atMs': 1000, 'opacity': 1, 'x': 0, 'y': 0, 'scale': 1, 'rotate': 0, 'easing': 'back'}]}])
    nodes.append(pod)
    end = py + ph
    if end > 99.5:
        raise SystemExit(f'{"mobile" if mobile else "desktop"} layout overflows: ends at {end:.1f}%')
    return {'version': 1, 'id': f'sports_week_{"m" if mobile else "d"}',
            'name': f'Спортна седмица – {"mobile" if mobile else "desktop"}', 'aspectRatio': round(aspect, 6),
            'background': 'background', 'nodes': nodes}, end


def b(text, bold=False):
    return {'text': text, 'bold': bold}


TERMS = [
    ('numbered', [b('Кампанията „'), b('СПОРТНА СЕДМИЦА', True), b('“ е активна от 01.12.2026 г. 00:00 ч. до 07.12.2026 г. 23:59 ч.')]),
    ('numbered', [b('В кампанията могат да участват само регистрирани и верифицирани потребители на inbet.com, навършили '), b('18 години', True), b('.')]),
    ('numbered', [b('Всяка оферта от кампанията може да бъде използвана веднъж на потребител, освен ако не е посочено друго.')]),
    ('numbered', [b('Повишените коефициенти важат само за избрани събития, обозначени в секция „Спорт“.')]),
    ('numbered', [b('Безплатният залог от '), b('10 €', True), b(' се начислява на нови клиенти след първи депозит от минимум 10 €.')]),
    ('numbered', [b('Акумулатор бонусът важи за комбинирани залози с минимум 3 селекции с коефициент от 1.30 или по-висок.')]),
    ('numbered', [b('Максималният акумулатор бонус е '), b('500 €', True), b(' на залог.')]),
    ('numbered', [b('Кешбекът се изчислява върху нетната загуба от сингъл залози за периода и се изплаща до 48 часа след края на кампанията.')]),
    ('numbered', [b('Бонус средствата подлежат на изискване за превъртане '), b('x5', True), b(' с минимален коефициент 1.50 в рамките на 7 дни.')]),
    ('numbered', [b('Лайв бонусът е валиден за залози на живо, направени между 18:00 ч. и 23:59 ч.')]),
    ('numbered', [b('Организаторът си запазва правото да променя или прекратява кампанията по всяко време.')]),
    ('paragraph', [b('18+ | Залагайте отговорно. Хазартът може да доведе до пристрастяване.', True)]),
]


def page():
    desk, dend = scene(False)
    mob, mend = scene(True)
    terms = {'type': 'terms', 'title': 'ПРАВИЛА И УСЛОВИЯ:', 'expandLabel': 'ПОКАЖИ ПЪЛНИ ПРАВИЛА И УСЛОВИЯ',
             'collapseLabel': 'СКРИЙ ПРАВИЛА И УСЛОВИЯ', 'previewBlocks': 3,
             'blocks': [{'kind': k, 'spans': s} for k, s in TERMS],
             'colors': {'background': 'background', 'card': 'surface', 'text': 'onSurface', 'accent': 'primary'},
             'font': 'heading'}
    print(f'desktop layout ends at {dend:.1f}%, mobile at {mend:.1f}%')
    return {'version': 1, 'id': 'sports-week', 'name': 'Спортна седмица – inbet', 'background': 'background',
            'mobileBreakpoint': 600, 'maxWidth': 1920,
            'sections': [
                {'kind': 'scene', 'id': 'path', 'scene': desk, 'mobileScene': mob},
                {'kind': 'widget', 'id': 'terms', 'widget': terms},
            ]}


if __name__ == '__main__':
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(page(), f, ensure_ascii=False, indent=2)
    print('wrote', os.path.relpath(OUT, HERE))
