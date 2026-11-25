import { resolveAsset } from '@chiko111/scene-kit-core';
import { useState } from 'react';
import { EASINGS, sampleTimeline, type Easing, type Keyframe, type SceneNode } from '@chiko111/scene-kit-core';
import { NumberField, SelectField, type EditSession } from './fields';
import {
  addKeyframe,
  duplicateKeyframe,
  removeKeyframe,
  timelineDuration,
  timelineProblem,
  updateKeyframe,
  type Timeline,
} from './timelineOps';

const EASING_LABELS: Record<Easing, string> = {
  linear: 'Linear',
  easeIn: 'Ease in',
  easeOut: 'Ease out',
  easeInOut: 'Ease in-out',
  back: 'Back (overshoot)',
  bounce: 'Bounce',
  elastic: 'Elastic',
};
const EASING_OPTIONS = EASINGS.map((value) => ({ value, label: EASING_LABELS[value] }));
const REPEAT_OPTIONS = [
  { value: 'none', label: 'Play once' },
  { value: 'loop', label: 'Loop' },
  { value: 'pingpong', label: 'Back and forth' },
] as const;

const STRIP_W = 260;
const STRIP_H = 28;

/** Mini stage: the layer's state at the scrubbed time (x/y in "u" ≈ % of the stage width). */
function MiniPreview({ node, state }: { node: SceneNode; state: ReturnType<typeof sampleTimeline> }) {
  const style = {
    opacity: state.opacity,
    transform: `translate(${state.x}%, ${state.y * 1.78}%) scale(${state.scale}) rotate(${state.rotate}deg)`,
  };
  return (
    <div className="ske-tl-stage" aria-label="Timeline preview">
      <div className="ske-tl-ghost" style={style}>
        {node.type === 'image' ? <img src={resolveAsset(node.uri)} alt="" draggable={false} /> : <span>{node.type === 'text' ? 'Aa' : node.name.slice(0, 6)}</span>}
      </div>
    </div>
  );
}

export function TimelineEditor({
  effect,
  node,
  onChange,
  session,
  focusKeyframe,
}: {
  effect: Timeline;
  node: SceneNode;
  onChange: (effect: Timeline) => void;
  session: EditSession;
  /** Keyframe picked in the timeline panel (nonce changes on every pick). */
  focusKeyframe?: { index: number; nonce: number };
}) {
  const [scrub, setScrub] = useState(0);
  const [open, setOpen] = useState(focusKeyframe?.index ?? 0);
  const [seenFocus, setSeenFocus] = useState(focusKeyframe?.nonce);
  // follow the timeline panel's selection (adjust state during render, no effect needed)
  if (focusKeyframe && focusKeyframe.nonce !== seenFocus) {
    setSeenFocus(focusKeyframe.nonce);
    setOpen(focusKeyframe.index);
  }
  const total = Math.max(1, timelineDuration(effect));
  const t = Math.min(scrub, total);
  const problem = timelineProblem(effect);
  const state = sampleTimeline(effect.keyframes, t);
  const k = effect.keyframes[Math.min(open, effect.keyframes.length - 1)] as Keyframe;
  const index = Math.min(open, effect.keyframes.length - 1);
  const setKf = (patch: Partial<Keyframe>) => {
    const next = updateKeyframe(effect, index, patch);
    onChange(next);
    if ('atMs' in patch) {
      // follow the edited keyframe after re-sorting
      const moved = next.keyframes.findIndex((x) => x.atMs === patch.atMs);
      if (moved >= 0) setOpen(moved);
    }
  };

  return (
    <div className="ske-field-wide ske-timeline">
      <div className="ske-grid">
        <NumberField
          label="Start delay ms"
          value={effect.delayMs}
          min={0}
          max={10000}
          step={50}
          session={session}
          onChange={(delayMs) => onChange({ ...effect, delayMs: Math.round(delayMs) })}
        />
        <SelectField label="Repeat" value={effect.repeat} options={REPEAT_OPTIONS} onChange={(repeat) => onChange({ ...effect, repeat })} />
      </div>

      <svg className="ske-tl-strip" width={STRIP_W} height={STRIP_H} viewBox={`0 0 ${STRIP_W} ${STRIP_H}`} role="img" aria-label="Keyframes">
        <line x1={6} x2={STRIP_W - 6} y1={STRIP_H / 2} y2={STRIP_H / 2} className="ske-tl-axis" />
        <line x1={6 + ((STRIP_W - 12) * t) / total} x2={6 + ((STRIP_W - 12) * t) / total} y1={2} y2={STRIP_H - 2} className="ske-tl-head" />
        {effect.keyframes.map((kf, i) => (
          <circle
            key={i}
            cx={6 + ((STRIP_W - 12) * kf.atMs) / total}
            cy={STRIP_H / 2}
            r={i === index ? 6 : 4.5}
            className={i === index ? 'ske-tl-dot is-open' : 'ske-tl-dot'}
            onClick={() => {
              setOpen(i);
              setScrub(kf.atMs);
            }}
          >
            <title>{`${kf.atMs} ms`}</title>
          </circle>
        ))}
      </svg>
      <label className="ske-tl-scrub">
        <span>Scrub {Math.round(t)} / {total} ms</span>
        <input type="range" min={0} max={total} step={10} value={t} onChange={(e) => setScrub(Number(e.target.value))} aria-label="Scrub timeline" />
      </label>
      <MiniPreview node={node} state={state} />

      <div className="ske-tl-tabs" role="tablist" aria-label="Keyframes">
        {effect.keyframes.map((kf, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            className="ske-btn ske-btn-small"
            onClick={() => {
              setOpen(i);
              setScrub(kf.atMs);
            }}
          >
            {kf.atMs} ms
          </button>
        ))}
      </div>

      <div className="ske-grid">
        <NumberField
          label="Time ms"
          value={k.atMs}
          min={0}
          max={20000}
          step={50}
          session={session}
          onChange={(atMs) => setKf({ atMs: index === 0 ? 0 : Math.round(atMs) })}
        />
        <SelectField label="Easing into it" value={k.easing} options={EASING_OPTIONS} onChange={(easing) => setKf({ easing })} />
        <NumberField label="Opacity" value={k.opacity} min={0} max={1} step={0.05} session={session} onChange={(opacity) => setKf({ opacity })} />
        <NumberField label="Scale" value={k.scale} min={0} max={5} step={0.05} session={session} onChange={(scale) => setKf({ scale })} />
        <NumberField label="X (u)" value={k.x} min={-200} max={200} step={0.5} session={session} onChange={(x) => setKf({ x })} />
        <NumberField label="Y (u)" value={k.y} min={-200} max={200} step={0.5} session={session} onChange={(y) => setKf({ y })} />
        <NumberField label="Rotate °" value={k.rotate} min={-1080} max={1080} step={1} session={session} onChange={(rotate) => setKf({ rotate })} />
      </div>
      <div className="ske-row">
        <button type="button" className="ske-btn ske-btn-small" disabled={effect.keyframes.length >= 12} onClick={() => {
          onChange(addKeyframe(effect, index));
          setOpen(index + 1);
        }}>
          + Keyframe after
        </button>
        <button type="button" className="ske-btn ske-btn-small" disabled={effect.keyframes.length >= 12} onClick={() => {
          onChange(duplicateKeyframe(effect, index));
          setOpen(index + 1);
        }}>
          Duplicate
        </button>
        <button
          type="button"
          className="ske-btn ske-btn-small"
          disabled={effect.keyframes.length <= 2}
          onClick={() => {
            onChange(removeKeyframe(effect, index));
            setOpen(Math.max(0, index - 1));
          }}
        >
          Remove
        </button>
      </div>
      {index === 0 && <small className="ske-hint">The first keyframe is always at 0 ms.</small>}
      {problem && (
        <p className="ske-error" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
