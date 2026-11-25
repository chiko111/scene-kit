import { MAX_TRIGGERS, type SceneNode, type Trigger } from '@chiko111/scene-kit-core';
import { CheckboxField, Section, SelectField } from './fields';

const DO_OPTIONS = [
  { value: 'play', label: 'Play animation of' },
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
  { value: 'toggle', label: 'Toggle' },
] as const;

/** "On tap" list + "Start hidden" for one layer. Targets are the other layers of the same scene. */
export function TriggersEditor({
  node,
  layers,
  onChange,
}: {
  node: SceneNode;
  layers: readonly SceneNode[];
  onChange: (node: SceneNode) => void;
}) {
  const others = layers.filter((l) => l.id !== node.id);
  const triggers = node.triggers ?? [];
  const label = (l: SceneNode) => `${l.name || l.id}${l.startHidden ? ' (hidden at start)' : ''}`;

  const setTriggers = (next: Trigger[]) => {
    const { triggers: _drop, ...rest } = node;
    onChange(next.length > 0 ? ({ ...rest, triggers: next } as SceneNode) : (rest as SceneNode));
  };

  return (
    <Section title="Interactions">
      <CheckboxField
        label="Start hidden (a Show / Toggle trigger reveals it)"
        checked={node.startHidden === true}
        onChange={(on) => {
          const { startHidden: _drop, ...rest } = node;
          onChange(on ? ({ ...rest, startHidden: true } as SceneNode) : (rest as SceneNode));
        }}
      />
      <div className="ske-field-wide">
        <strong className="ske-sub">On tap</strong>
        {triggers.length === 0 && <p className="ske-muted">Nothing happens on tap.</p>}
        {triggers.map((t, i) => (
          <div key={i} className="ske-trigger">
            <SelectField
              label={`${i + 1}.`}
              value={t.do}
              options={DO_OPTIONS}
              onChange={(d) => setTriggers(triggers.map((x, j) => (j === i ? { ...x, do: d } : x)))}
            />
            <SelectField
              label="layer"
              value={t.target}
              options={(others.some((l) => l.id === t.target) ? others : [...others, { id: t.target, name: `${t.target} (missing)` } as SceneNode]).map((l) => ({
                value: l.id,
                label: label(l),
              }))}
              onChange={(target) => setTriggers(triggers.map((x, j) => (j === i ? { ...x, target } : x)))}
            />
            <button type="button" className="ske-icon-btn" aria-label={`Remove trigger ${i + 1}`} onClick={() => setTriggers(triggers.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        {others.length === 0 ? (
          <p className="ske-muted">Add another layer to target it.</p>
        ) : (
          triggers.length < MAX_TRIGGERS && (
            <button
              type="button"
              className="ske-btn ske-btn-small"
              onClick={() => {
                const hidden = others.find((l) => l.startHidden) ?? others[0];
                if (hidden) setTriggers([...triggers, { do: hidden.startHidden ? 'show' : 'play', target: hidden.id }]);
              }}
            >
              + On tap
            </button>
          )
        )}
        {triggers.length > 0 && node.type === 'button' && <small className="ske-hint">Triggers run first, then the button's action.</small>}
      </div>
    </Section>
  );
}
