import { useEffect, useRef, useState } from 'react';
import {
  MAX_EFFECTS_PER_NODE,
  createButtonNode,
  createEffect,
  createImageNode,
  createScene,
  createShapeNode,
  createTextNode,
  type Effect,
  type EffectType,
  type FontMap,
  type Palette,
  type Scene,
  type SceneNode,
} from '@chiko111/scene-kit-core';
import { SceneView } from '@chiko111/scene-kit-web';
import { NumberField, Section, type EditSession } from './fields';
import { EFFECT_LABELS, ENTER_LABELS, EffectFields, type EffectFocus } from './Inspector';
import { applyPreset, effectAllowed, presetEffectsFor, presetFromNode, type AnimationPreset } from './presets';
import { scaleTimeline } from './timelinePanelOps';
import type { Timeline } from './timelineOps';

/*
 * The "Animation" tab, written for operators:
 *  1. presets first – visual cards that preview the animation on hover, one click applies
 *  2. the layer's animations as cards with plain controls (speed, start time); every field behind "Fine-tune"
 *  3. "Add an effect", grouped by what it does, each with a one-line description
 */

type Group = 'entrance' | 'loop' | 'image' | 'scroll';

const GROUPS: readonly { id: Group; title: string; types: readonly EffectType[] }[] = [
  { id: 'entrance', title: 'Entrance · plays once when the layer appears', types: ['enter', 'fadeIn', 'splitText', 'timeline'] },
  { id: 'loop', title: 'Loop · keeps going', types: ['float', 'pulse', 'wiggle', 'spin', 'glow', 'outlinePulse', 'borderRun', 'edgeBlink'] },
  { id: 'image', title: 'Image', types: ['kenBurns', 'blur'] },
  { id: 'scroll', title: 'Scroll', types: ['parallax'] },
];

const GROUP_LABEL: Record<Group, string> = { entrance: 'Entrance', loop: 'Loop', image: 'Image', scroll: 'Scroll' };

const DESCRIPTIONS: Record<EffectType, string> = {
  enter: 'Fades, slides, zooms, bounces or flips in',
  fadeIn: 'Simple fade from invisible',
  splitText: 'Letters or words appear one by one',
  timeline: 'Your own motion with keyframes (advanced)',
  float: 'Gently bobs up and down',
  pulse: 'Grows and shrinks like a heartbeat',
  wiggle: 'A short shake that draws the eye',
  spin: 'Keeps rotating',
  glow: 'Soft colored light around it',
  outlinePulse: 'An outline that pulses outward',
  borderRun: 'Lights running around the edge',
  edgeBlink: 'The edge blinks between colors',
  kenBurns: 'Slow cinematic zoom and pan',
  blur: 'Comes into focus, or breathes blurred ↔ sharp',
  parallax: 'Moves at its own speed while the page scrolls',
};

const groupOf = (type: EffectType): Group => GROUPS.find((g) => g.types.includes(type))?.id ?? 'loop';

/* ───────────── speed & start time ───────────── */

const SPEEDS = [
  { id: 'slow', label: 'Slow', factor: 1.6 },
  { id: 'normal', label: 'Normal', factor: 1 },
  { id: 'fast', label: 'Fast', factor: 0.6 },
] as const;

const DELAYED: readonly EffectType[] = ['enter', 'fadeIn', 'splitText', 'timeline', 'float', 'pulse', 'wiggle'];
const TIMELINE_BASE_MS = 1000;

function timelineLength(tl: Timeline): number {
  return tl.keyframes[tl.keyframes.length - 1]?.atMs ?? 0;
}

/** The duration "Normal" refers to (the effect's default) and the current one. Null = no speed. */
function durations(effect: Effect): { base: number; current: number } | null {
  if (effect.type === 'parallax' || (effect.type === 'blur' && effect.mode === 'static')) return null;
  if (effect.type === 'timeline') return { base: TIMELINE_BASE_MS, current: timelineLength(effect) };
  if (!('durationMs' in effect)) return null;
  const def = createEffect(effect.type) as Effect;
  return { base: 'durationMs' in def ? def.durationMs : effect.durationMs, current: effect.durationMs };
}

function withSpeed(effect: Effect, factor: number): Effect {
  const d = durations(effect);
  if (!d) return effect;
  const target = Math.round(d.base * factor);
  if (effect.type === 'timeline') return scaleTimeline(effect, target);
  const [min, max] = effect.type === 'kenBurns' ? [1000, 60000] : effect.type === 'splitText' ? [100, 5000] : [100, 20000];
  return { ...effect, durationMs: Math.min(max, Math.max(min, target)) } as Effect;
}

function currentSpeed(effect: Effect): string | null {
  const d = durations(effect);
  if (!d) return null;
  return SPEEDS.find((s) => Math.abs(d.current - d.base * s.factor) / (d.base * s.factor) < 0.04)?.id ?? 'custom';
}

function delayOf(effect: Effect): number | null {
  if (!DELAYED.includes(effect.type)) return null;
  return 'delayMs' in effect && typeof effect.delayMs === 'number' ? effect.delayMs : 0;
}

function withDelay(effect: Effect, delayMs: number): Effect {
  if (effect.type === 'float' || effect.type === 'pulse' || effect.type === 'wiggle') {
    const { delayMs: _old, ...rest } = effect;
    return (delayMs === 0 ? rest : { ...rest, delayMs }) as Effect;
  }
  return { ...effect, delayMs } as Effect;
}

const sec = (ms: number) => `${(ms / 1000).toFixed(ms % 100 === 0 ? 1 : 2)} s`;

/** One line in plain words, e.g. "Fade up · starts at 0.2 s · lasts 0.8 s". */
export function effectSummary(effect: Effect, node: SceneNode): string {
  const starts = (ms: number) => (ms > 0 ? ` · starts at ${sec(ms)}` : '');
  switch (effect.type) {
    case 'enter':
      return `${ENTER_LABELS[effect.preset]}${starts(effect.delayMs)} · lasts ${sec(effect.durationMs)}`;
    case 'fadeIn':
      return `Lasts ${sec(effect.durationMs)}${starts(effect.delayMs)}`;
    case 'splitText':
      return `${effect.by === 'char' ? 'Letter' : 'Word'} by ${effect.by === 'char' ? 'letter' : 'word'} · ${ENTER_LABELS[effect.preset].toLowerCase()}${starts(effect.delayMs)}${node.type === 'text' ? '' : ' (text layers only)'}`;
    case 'timeline':
      return `${effect.keyframes.length} keyframes · ${sec(timelineLength(effect))}${starts(effect.delayMs)}${effect.repeat === 'none' ? '' : ` · repeats (${effect.repeat})`}`;
    case 'spin':
      return `One turn every ${sec(effect.durationMs)}, ${effect.direction === 'cw' ? 'clockwise' : 'counter-clockwise'}`;
    case 'glow':
      return `${effect.colors.length > 1 ? `Changes color every ${sec(effect.durationMs)}` : `Breathes every ${sec(effect.durationMs)}`}`;
    case 'edgeBlink':
      return `${effect.mode === 'blink' ? 'Blinks' : 'Fades'} every ${sec(effect.durationMs)}`;
    case 'borderRun':
      return `One lap every ${sec(effect.durationMs)}`;
    case 'kenBurns':
      return `Zoom ${effect.fromScale}× → ${effect.toScale}× over ${sec(effect.durationMs)} · ${effect.mode === 'pingpong' ? 'back and forth' : 'once'}`;
    case 'blur':
      return effect.mode === 'focusIn' ? `Focuses in over ${sec(effect.durationMs)}` : effect.mode === 'breathe' ? `Blurred ↔ sharp every ${sec(effect.durationMs)}` : 'Always blurred';
    case 'parallax':
      return effect.depth > 0 ? 'Farther away: moves slower than the page' : effect.depth < 0 ? 'Closer: moves faster than the page' : 'No movement';
    default: {
      const d = delayOf(effect) ?? 0;
      return `Every ${sec(effect.durationMs)}${starts(d)}`;
    }
  }
}

/* ───────────── preset preview ───────────── */

function previewScene(node: SceneNode, effects: Effect[]): Scene {
  const scene = createScene('preview', 2.2);
  const none = new Set<string>();
  let layer: SceneNode;
  if (node.type === 'image') {
    layer = { ...createImageNode(node.uri, { x: 10, y: 10, w: 80, h: 80, rotation: 0 }, none), fit: 'contain' };
  } else if (node.type === 'text') {
    const word = (node.text.split(/\s+/).find(Boolean) ?? 'Aa').slice(0, 9);
    layer = { ...createTextNode(none), text: word, fontSize: Math.min(16, 90 / Math.max(2, word.length)), frame: { x: 6, y: 18, w: 88, h: 64, rotation: 0 } };
  } else if (node.type === 'button') {
    layer = { ...createButtonNode(none, 'Home'), label: node.label.slice(0, 14) || 'Play', fontSize: 5, frame: { x: 22, y: 25, w: 56, h: 50, rotation: 0 } };
  } else {
    layer = { ...createShapeNode(none), fill: 'gold', radius: 2, frame: { x: 36, y: 15, w: 28, h: 70, rotation: 0 } };
  }
  return { ...scene, id: 'preview', nodes: [{ ...layer, id: 'preview_layer', effects } as SceneNode] };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function PresetCard({
  preset,
  node,
  palette,
  fonts,
  fontFamily,
  onApply,
}: {
  preset: AnimationPreset;
  node: SceneNode;
  palette: Palette;
  fonts: FontMap | undefined;
  fontFamily: string | undefined;
  onApply: () => void;
}) {
  const [play, setPlay] = useState(0);
  const effects = presetEffectsFor(preset, node.type);
  // rebuilt on render, but with fixed ids, so the preview never remounts (= never restarts) by itself
  const scene = previewScene(node, effects);
  const applied = effects.every((pe) => node.effects.some((e) => same(e, pe)));
  return (
    // a div, not a <button>: the preview of a button layer renders a <button> itself
    <div
      role="button"
      tabIndex={0}
      className={applied ? 'ske-preset is-applied' : 'ske-preset'}
      onMouseEnter={() => setPlay((p) => p + 1)}
      onFocus={() => setPlay((p) => p + 1)}
      onClick={() => {
        onApply();
        setPlay((p) => p + 1);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onApply();
        setPlay((p) => p + 1);
      }}
      title={`${preset.name}: ${effects.map((e) => EFFECT_LABELS[e.type]).join(' + ')}${preset.builtIn ? '' : ' (your preset)'}`}
    >
      <span className="ske-preset-stage" aria-hidden>
        <SceneView scene={scene} palette={palette} fonts={fonts} fontFamily={fontFamily} interactive={false} replayKey={play} />
      </span>
      <span className="ske-preset-name">
        {preset.name}
        {applied ? <em>✓ on</em> : preset.builtIn ? null : <em className="ske-muted">mine</em>}
      </span>
    </div>
  );
}

/* ───────────── the tab ───────────── */

export function AnimationTab({
  node,
  palette,
  fonts,
  fontFamily,
  session,
  presets,
  onSavePreset,
  focus,
  onChange,
}: {
  node: SceneNode;
  palette: Palette;
  fonts: FontMap | undefined;
  fontFamily: string | undefined;
  session: EditSession;
  presets: readonly AnimationPreset[];
  onSavePreset?: (preset: AnimationPreset) => void;
  focus: EffectFocus | null;
  onChange: (node: SceneNode) => void;
}) {
  const effects = node.effects;
  const setEffects = (next: Effect[]) => onChange({ ...node, effects: next } as SceneNode);
  // only presets that fully work on this layer type (a "Slow zoom background" on a button would just fade)
  const usable = presets.filter((p) => p.effects.length > 0 && presetEffectsFor(p, node.type).length === p.effects.length);
  const [open, setOpen] = useState<ReadonlySet<EffectType>>(new Set());
  const [presetName, setPresetName] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // timeline panel click → open that effect's fine-tune fields and bring it into view
  const focusNonce = focus?.nonce;
  const focusType = focus?.effect;
  useEffect(() => {
    if (focusNonce === undefined || !focusType) return;
    setOpen((s) => new Set(s).add(focusType));
    const id = requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-effect="${focusType}"]`);
      if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [focusNonce, focusType]);

  const full = effects.length >= MAX_EFFECTS_PER_NODE;

  return (
    <>
      <Section title="Presets">
        {usable.length > 0 ? (
          <div className="ske-presets">
            {usable.map((p) => (
              <PresetCard key={p.id} preset={p} node={node} palette={palette} fonts={fonts} fontFamily={fontFamily} onApply={() => onChange(applyPreset(node, p))} />
            ))}
          </div>
        ) : (
          <p className="ske-muted">No presets fit this layer type.</p>
        )}
        <small className="ske-hint">Hover a card to preview, click to apply. It replaces animations of the same kind on this layer.</small>
      </Section>

      <Section title={`On this layer (${effects.length}/${MAX_EFFECTS_PER_NODE})`}>
        {effects.length === 0 && <p className="ske-muted">No animation yet. Pick a preset above or add an effect below.</p>}
        <div className="ske-fx-list" ref={listRef}>
          {effects.map((effect) => {
            const group = groupOf(effect.type);
            const speed = currentSpeed(effect);
            const delay = delayOf(effect);
            const replace = (next: Effect) => setEffects(effects.map((e) => (e.type === next.type ? next : e)));
            return (
              <div key={effect.type} className={focus?.effect === effect.type ? 'ske-effect is-focused' : 'ske-effect'} data-effect={effect.type}>
                <div className="ske-effect-head">
                  <strong>
                    {EFFECT_LABELS[effect.type]} <span className="ske-chip" data-group={group}>{GROUP_LABEL[group]}</span>
                  </strong>
                  <button type="button" className="ske-icon-btn is-danger" aria-label={`Remove ${EFFECT_LABELS[effect.type]}`} onClick={() => setEffects(effects.filter((e) => e.type !== effect.type))}>
                    ✕
                  </button>
                </div>
                <p className="ske-fx-sum">{effectSummary(effect, node)}</p>
                {(speed || delay !== null) && (
                  <div className="ske-quick">
                    {speed && (
                      <div className="ske-quick-row">
                        <span>Speed</span>
                        <span className="ske-seg" role="group" aria-label={`${EFFECT_LABELS[effect.type]} speed`}>
                          {SPEEDS.map((s) => (
                            <button key={s.id} type="button" aria-pressed={speed === s.id} onClick={() => replace(withSpeed(effect, s.factor))}>
                              {s.label}
                            </button>
                          ))}
                        </span>
                      </div>
                    )}
                    {delay !== null && (
                      <div className="ske-quick-row ske-sec-input">
                        <NumberField
                          label="Starts at (seconds)"
                          value={delay / 1000}
                          min={0}
                          max={10}
                          step={0.1}
                          session={session}
                          onChange={(s) => replace(withDelay(effect, Math.round(s * 1000)))}
                        />
                      </div>
                    )}
                  </div>
                )}
                <details
                  className="ske-more"
                  open={open.has(effect.type)}
                  onToggle={(e) => {
                    const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                    setOpen((s) => {
                      if (s.has(effect.type) === isOpen) return s;
                      const n = new Set(s);
                      if (isOpen) n.add(effect.type);
                      else n.delete(effect.type);
                      return n;
                    });
                  }}
                >
                  <summary>Fine-tune</summary>
                  <div className="ske-grid">
                    <EffectFields
                      effect={effect}
                      node={node}
                      palette={palette}
                      session={session}
                      focusKeyframe={focus && focus.effect === effect.type && focus.keyframe !== undefined ? { index: focus.keyframe, nonce: focus.nonce } : undefined}
                      onChange={replace}
                    />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
        {effects.some((e) => e.type === 'timeline') && effects.some((e) => e.type === 'enter' || e.type === 'fadeIn') && (
          <p className="ske-hint">The keyframe timeline controls the entrance; Entrance / Fade in are ignored while it is set.</p>
        )}
      </Section>

      <Section title="Add an effect">
        {full ? (
          <p className="ske-muted">This layer has the maximum of {MAX_EFFECTS_PER_NODE} effects. Remove one to add another.</p>
        ) : (
          GROUPS.map((g) => {
            const types = g.types.filter((t) => effectAllowed(t, node.type));
            if (types.length === 0) return null;
            return (
              <div key={g.id} className="ske-fx-group">
                <h4>{g.title}</h4>
                {types.map((type) => {
                  const has = effects.some((e) => e.type === type);
                  return (
                    <button
                      key={type}
                      type="button"
                      className="ske-fx-opt"
                      disabled={has}
                      onClick={() => {
                        setEffects([...effects, createEffect(type)]);
                        setOpen((s) => new Set(s).add(type));
                      }}
                    >
                      <b>+ {EFFECT_LABELS[type]}</b>
                      <small>{has ? 'Already on this layer' : DESCRIPTIONS[type]}</small>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </Section>

      {onSavePreset && (
        <Section title="Save as preset">
          <form
            className="ske-row ske-preset-row"
            onSubmit={(e) => {
              e.preventDefault();
              const preset = presetFromNode(node, presetName);
              if (!preset) return;
              onSavePreset(preset);
              setSaved(preset.name);
              setPresetName('');
            }}
          >
            <input type="text" aria-label="Preset name" placeholder="Name, e.g. Prize bounce" value={presetName} maxLength={60} onChange={(e) => setPresetName(e.target.value)} />
            <button type="submit" className="ske-btn ske-btn-small" disabled={effects.length === 0}>
              Save
            </button>
          </form>
          <small className="ske-hint">Saves this layer's animations so you can apply them to other layers.</small>
          {saved && <small className="ske-ok">Saved “{saved}”</small>}
        </Section>
      )}
    </>
  );
}
