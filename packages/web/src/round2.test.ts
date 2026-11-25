import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createCountdownNode,
  createEffect,
  createScene,
  parsePage,
  type Keyframe,
  type Page,
  type Palette,
  type Scene,
  type SceneNode,
} from '@chiko111/scene-kit-core';
import { PageView } from './PageView';
import { stepsForSegment, timelineAnimation, timelineKeyframesCss, timelineName } from './timeline';

const palette = Object.fromEntries(
  ['primary', 'onPrimary', 'secondary', 'onSecondary', 'accent', 'gold', 'success', 'danger', 'surface', 'onSurface', 'background', 'white', 'black'].map(
    (k, i) => [k, `#${String(i).padStart(2, '0')}0000`],
  ),
) as Palette;

const base = { opacity: 1, hidden: false, shadow: null, effects: [] as SceneNode['effects'], frame: { x: 0, y: 0, w: 40, h: 40, rotation: 0 } };
const image = (id: string, extra: Partial<SceneNode> = {}): SceneNode =>
  ({ ...base, id, name: id, type: 'image', uri: `https://cdn.example.com/${id}.png`, fit: 'contain', alt: id, radius: 0, ...extra }) as SceneNode;

function sceneOf(id: string, nodes: SceneNode[]): Scene {
  return { ...createScene(id, 2), id, nodes };
}

function render(sections: unknown[], extra: Record<string, unknown> = {}) {
  const result = parsePage({ version: 1, id: 'p', name: 'P', background: null, mobileBreakpoint: 600, maxWidth: 1400, sections });
  if (!result.ok) throw new Error(result.error);
  expect(result.warnings).toEqual([]);
  return renderToString(
    createElement(PageView, { page: result.page as Page, palette, now: () => Date.UTC(2026, 10, 24, 10, 0), ...extra }),
  );
}

describe('timeline keyframes', () => {
  const kf = (atMs: number, extra: Partial<Keyframe> = {}): Keyframe => ({ atMs, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, easing: 'linear', ...extra });
  const timeline = { type: 'timeline' as const, delayMs: 200, repeat: 'pingpong' as const, keyframes: [kf(0, { opacity: 0, y: 10 }), kf(400, { easing: 'bounce' })] };

  it('samples each segment into linear steps (bounce becomes a real curve)', () => {
    const css = timelineKeyframesCss('t', timeline, 5, 0.5);
    const stops = css.match(/%\{/g) ?? [];
    expect(stops.length).toBe(1 + stepsForSegment(400));
    expect(css).toContain('0%{opacity:0;translate:0cqw 10cqw;scale:1;rotate:5deg}');
    expect(css).toContain('100%{opacity:0.5;translate:0cqw 0cqw;scale:1;rotate:5deg}');
  });

  it('builds the animation shorthand (delay once, repeat modes)', () => {
    expect(timelineAnimation('t', timeline)).toBe('t 400ms linear 200ms infinite alternate both');
    expect(timelineAnimation('t', { ...timeline, repeat: 'none' })).toBe('t 400ms linear 200ms 1 both');
    expect(timelineName(timeline, 0, 1)).toMatch(/^sk-tl-[a-z0-9]+$/);
  });

  it('a timeline wins over enter and keeps loops on the inner wrapper', () => {
    const node = image('a', { effects: [createEffect('enter'), createEffect('timeline'), createEffect('float')] });
    const html = render([{ kind: 'scene', id: 's', scene: sceneOf('s', [node]), mobileScene: null }]);
    expect(html).toContain('data-enter="wait"');
    expect(html).toMatch(/class="sk-loop"[^>]*sk-float/);
    expect(html).not.toMatch(/style="[^"]*--sk-enter-x/);
  });
});

describe('slider', () => {
  const slider = (n: number, extra: Record<string, unknown> = {}) => ({
    kind: 'slider', id: 'hero', transition: 'slide', transitionMs: 600, autoplayMs: 4000, loop: true,
    showDots: true, showArrows: true, pauseOnInteraction: true, dotColor: 'white', activeDotColor: 'gold',
    slides: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, scene: sceneOf(`scene${i}`, [image(`img${i}`)]), mobileScene: null })),
    ...extra,
  });

  it('renders every slide, the first one current, dots + arrows', () => {
    const html = render([slider(3)]);
    expect((html.match(/class="skp-slide"/g) ?? []).length).toBe(3);
    expect(html).toMatch(/data-role="current"/);
    expect((html.match(/data-role="idle"/g) ?? []).length).toBe(2);
    expect((html.match(/class="skp-dot"/g) ?? []).length).toBe(3);
    expect(html).toContain('aria-selected="true"');
    expect((html.match(/class="skp-arrow"/g) ?? []).length).toBe(2);
    expect(html).toContain('--skp-t:600ms');
  });

  it('only the first slide runs; no dots/arrows for one slide', () => {
    const html = render([slider(2)]);
    expect((html.match(/data-running="true"/g) ?? []).length).toBe(1);
    expect(render([slider(1)])).not.toContain('class="skp-dot"');
  });
});

describe('countdown layer', () => {
  it('shows time left in the campaign zone and the ended text after', () => {
    // now = 2026-11-24 12:00 Sofia; end 2026-11-26 15:30 → 2d 3h 30m
    const cd = { ...createCountdownNode('2026-11-26', 'Europe/Sofia', new Set()), id: 'cd', endTime: { hour: 15, minute: 30 } };
    const html = render([{ kind: 'scene', id: 's', scene: sceneOf('s', [cd]), mobileScene: null }]);
    expect(html).toContain('2д 03ч 30м 00с');
    const ended = { ...cd, endDate: '2026-11-01' };
    expect(render([{ kind: 'scene', id: 's', scene: sceneOf('s', [ended]), mobileScene: null }])).toContain('ПРОМОЦИЯТА ПРИКЛЮЧИ');
  });
});

describe('triggers', () => {
  it('startHidden layers start faded out; trigger layers are buttons', () => {
    const gift = image('gift', { triggers: [{ do: 'show', target: 'prize' }] });
    const prize = image('prize', { startHidden: true });
    const html = render([{ kind: 'scene', id: 's', scene: sceneOf('s', [gift, prize]), mobileScene: null }]);
    expect(html).toMatch(/class="sk-node sk-trigger"[^>]*data-node-id="gift"[^>]*role="button"/);
    expect(html).toMatch(/data-node-id="prize" data-vis="off"/);
  });
});

describe('split text + ken burns + parallax', () => {
  it('splits characters per word and waits for the scene to enter', () => {
    const text = {
      ...base, id: 't', name: 't', type: 'text', text: 'Нов ден', color: 'white', fontSize: 5, weight: '800', align: 'center',
      effects: [createEffect('splitText')],
    } as SceneNode;
    const html = render([{ kind: 'scene', id: 's', scene: sceneOf('s', [text]), mobileScene: null }]);
    expect(html).toContain('data-split="wait"');
    expect((html.match(/class="sk-piece"/g) ?? []).length).toBe(6);
    expect((html.match(/class="sk-word"/g) ?? []).length).toBe(2);
  });

  it('ken burns wraps the picture; parallax wraps the node inside a page', () => {
    const node = image('bg', { effects: [createEffect('kenBurns'), createEffect('parallax')] });
    const html = render([{ kind: 'scene', id: 's', scene: sceneOf('s', [node]), mobileScene: null }]);
    expect(html).toMatch(/class="sk-kb"[^>]*sk-kb 12000ms/);
    expect(html).toMatch(/class="sk-par" style="translate:0 calc\(var\(--sk-par-off, 0px\) \* -0\.09\)"/);
  });
});

describe('widgets round 2', () => {
  const terms = (title: string) => ({
    type: 'terms', title, expandLabel: 'Още', collapseLabel: 'По-малко', previewBlocks: 5,
    blocks: [{ kind: 'paragraph', level: 1, spans: [{ text: 'Виж ', bold: false }, { text: 'тук', bold: true, italic: true, action: { type: 'navigate', route: 'Promo', webPath: '/promo' } }] }],
    colors: { background: null, card: 'surface', text: 'white', accent: 'gold' },
  });

  it('terms: italic, links as buttons, level indent', () => {
    const html = render([{ kind: 'widget', id: 'w', widget: terms('Desktop') }]);
    expect(html).toMatch(/<button type="button" class="skw-link" aria-disabled="false"><strong><em>тук<\/em><\/strong><\/button>/);
    expect(html).toContain('margin-inline-start:1.4em');
    expect(render([{ kind: 'widget', id: 'w', widget: terms('D') }], { interactive: false })).toContain('aria-disabled="true"');
  });

  it('uses the desktop widget until the width is known (mobile variant picked from the measured width)', () => {
    const html = render([{ kind: 'widget', id: 'w', widget: terms('Desktop'), mobileWidget: terms('Mobile') }]);
    expect(html).toContain('Desktop');
    expect(html).toContain('data-variant="default"');
  });
});
