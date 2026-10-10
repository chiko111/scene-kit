import {
  EFFECT_TYPES,
  IdSchema,
  ParamKeySchema,
  RouteSchema,
  createEffect,
  type Effect,
  type EffectType,
  type FontWeight,
  type Palette,
  type Scene,
  type SceneAction,
  type SceneNode,
  type Shadow,
} from '@chiko111/scene-kit-core';
import {
  CheckboxField,
  ColorField,
  NumberField,
  Section,
  SelectField,
  TextField,
  type EditSession,
} from './fields';

const WEIGHTS: readonly { value: FontWeight; label: string }[] = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra bold' },
];

const EFFECT_LABELS: Record<EffectType, string> = {
  pulse: 'Pulse',
  outlinePulse: 'Pulsing outline',
  float: 'Float',
  fadeIn: 'Fade in',
};

const ASPECTS = [
  { value: '1.7778', label: '16:9 banner' },
  { value: '3', label: '3:1 strip' },
  { value: '1', label: '1:1 square' },
  { value: '0.8', label: '4:5 card' },
  { value: '0.5625', label: '9:16 story' },
] as const;

const isId = (v: string) => IdSchema.safeParse(v).success;
const isRoute = (v: string) => RouteSchema.safeParse(v).success;

/* ───────────── Scene (nothing selected) ───────────── */

export function SceneInspector({
  scene,
  palette,
  onChange,
  session,
}: {
  scene: Scene;
  palette: Palette;
  onChange: (scene: Scene) => void;
  session: EditSession;
}) {
  const aspectValue = ASPECTS.find((a) => Math.abs(Number(a.value) - scene.aspectRatio) < 0.001)?.value;

  return (
    <>
      <Section title="Scene">
        <TextField
          label="Name"
          value={scene.name}
          maxLength={120}
          session={session}
          onChange={(name) => onChange({ ...scene, name })}
        />
        <TextField
          label="Scene id"
          value={scene.id}
          maxLength={64}
          validate={isId}
          hint="A–Z, 0–9, _ and -"
          session={session}
          onChange={(id) => onChange({ ...scene, id })}
        />
        {aspectValue ? (
          <SelectField
            label="Format"
            value={aspectValue}
            options={ASPECTS}
            onChange={(value) => onChange({ ...scene, aspectRatio: Number(value) })}
          />
        ) : null}
        <NumberField
          label="Aspect (w/h)"
          value={scene.aspectRatio}
          min={0.2}
          max={5}
          step={0.01}
          session={session}
          onChange={(aspectRatio) => onChange({ ...scene, aspectRatio })}
        />
        <CheckboxField
          label="Background color"
          checked={scene.background !== null}
          onChange={(on) => onChange({ ...scene, background: on ? 'background' : null })}
        />
        {scene.background && (
          <ColorField
            label="Background"
            value={scene.background}
            palette={palette}
            onChange={(background) => onChange({ ...scene, background })}
          />
        )}
      </Section>
      <p className="ske-muted">Select a layer on the canvas or in the list to edit it.</p>
    </>
  );
}

/* ───────────── Node ───────────── */

type NodeProps = {
  node: SceneNode;
  palette: Palette;
  routes: readonly string[];
  onChange: (node: SceneNode) => void;
  session: EditSession;
};

export function NodeInspector({ node, palette, routes, onChange, session }: NodeProps) {
  const { frame } = node;
  const setFrame = (patch: Partial<SceneNode['frame']>) => onChange({ ...node, frame: { ...frame, ...patch } });

  return (
    <>
      <Section title="Layer">
        <TextField
          label="Name"
          value={node.name}
          maxLength={80}
          session={session}
          onChange={(name) => onChange({ ...node, name })}
        />
        <NumberField
          label="Opacity"
          value={node.opacity}
          min={0}
          max={1}
          step={0.05}
          session={session}
          onChange={(opacity) => onChange({ ...node, opacity })}
        />
        <CheckboxField label="Hidden" checked={node.hidden} onChange={(hidden) => onChange({ ...node, hidden })} />
      </Section>

      <Section title="Position (% of scene)">
        <div className="ske-grid">
          <NumberField label="X" value={frame.x} min={-100} max={200} step={0.5} session={session} onChange={(x) => setFrame({ x })} />
          <NumberField label="Y" value={frame.y} min={-100} max={200} step={0.5} session={session} onChange={(y) => setFrame({ y })} />
          <NumberField label="W" value={frame.w} min={0.5} max={200} step={0.5} session={session} onChange={(w) => setFrame({ w })} />
          <NumberField label="H" value={frame.h} min={0.5} max={200} step={0.5} session={session} onChange={(h) => setFrame({ h })} />
          <NumberField
            label="Rotate°"
            value={frame.rotation}
            min={-360}
            max={360}
            step={1}
            session={session}
            onChange={(rotation) => setFrame({ rotation })}
          />
        </div>
      </Section>

      <TypeFields node={node} palette={palette} routes={routes} onChange={onChange} session={session} />

      <ShadowEditor
        shadow={node.shadow}
        palette={palette}
        session={session}
        label={node.type === 'text' ? 'Text shadow' : 'Shadow'}
        onChange={(shadow) => onChange({ ...node, shadow })}
      />

      <EffectsEditor
        effects={node.effects}
        palette={palette}
        session={session}
        onChange={(effects) => onChange({ ...node, effects })}
      />
    </>
  );
}

function TypeFields({ node, palette, routes, onChange, session }: NodeProps) {
  switch (node.type) {
    case 'image':
      return (
        <Section title="Image">
          <TextField
            label="URL"
            value={node.uri}
            maxLength={2048}
            validate={(v) => /^https:\/\/[^\s"'<>]+$/.test(v)}
            hint="https:// only"
            session={session}
            onChange={(uri) => onChange({ ...node, uri })}
          />
          <SelectField
            label="Fit"
            value={node.fit}
            options={[
              { value: 'contain', label: 'Contain' },
              { value: 'cover', label: 'Cover' },
            ]}
            onChange={(fit) => onChange({ ...node, fit })}
          />
          <NumberField label="Radius (u)" value={node.radius} min={0} max={50} step={0.25} session={session} onChange={(radius) => onChange({ ...node, radius })} />
          <TextField
            label="Alt text"
            value={node.alt}
            maxLength={200}
            placeholder="Empty = decorative"
            session={session}
            onChange={(alt) => onChange({ ...node, alt })}
          />
        </Section>
      );

    case 'text':
      return (
        <Section title="Text">
          <TextField
            label="Text"
            value={node.text}
            maxLength={500}
            multiline
            validate={(v) => v.length > 0}
            session={session}
            onChange={(text) => onChange({ ...node, text })}
          />
          <ColorField label="Color" value={node.color} palette={palette} onChange={(color) => onChange({ ...node, color })} />
          <NumberField label="Size (u)" value={node.fontSize} min={0.5} max={30} step={0.25} session={session} onChange={(fontSize) => onChange({ ...node, fontSize })} />
          <SelectField label="Weight" value={node.weight} options={WEIGHTS} onChange={(weight) => onChange({ ...node, weight })} />
          <SelectField
            label="Align"
            value={node.align}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(align) => onChange({ ...node, align })}
          />
        </Section>
      );

    case 'button':
      return (
        <>
          <Section title="Button">
            <TextField
              label="Label"
              value={node.label}
              maxLength={60}
              validate={(v) => v.length > 0}
              session={session}
              onChange={(label) => onChange({ ...node, label })}
            />
            <ColorField label="Background" value={node.bg} palette={palette} onChange={(bg) => onChange({ ...node, bg })} />
            <ColorField label="Text color" value={node.fg} palette={palette} onChange={(fg) => onChange({ ...node, fg })} />
            <NumberField label="Size (u)" value={node.fontSize} min={0.5} max={30} step={0.25} session={session} onChange={(fontSize) => onChange({ ...node, fontSize })} />
            <SelectField label="Weight" value={node.weight} options={WEIGHTS} onChange={(weight) => onChange({ ...node, weight })} />
            <NumberField label="Radius (u)" value={node.radius} min={0} max={50} step={0.25} session={session} onChange={(radius) => onChange({ ...node, radius })} />
          </Section>
          <ActionEditor
            action={node.action}
            routes={routes}
            session={session}
            onChange={(action) => onChange({ ...node, action })}
          />
        </>
      );

    case 'shape':
      return (
        <Section title="Shape">
          <SelectField
            label="Shape"
            value={node.shape}
            options={[
              { value: 'rect', label: 'Rectangle' },
              { value: 'ellipse', label: 'Ellipse' },
            ]}
            onChange={(shape) => onChange({ ...node, shape })}
          />
          <ColorField label="Fill" value={node.fill} palette={palette} onChange={(fill) => onChange({ ...node, fill })} />
          {node.shape === 'rect' && (
            <NumberField label="Radius (u)" value={node.radius} min={0} max={50} step={0.25} session={session} onChange={(radius) => onChange({ ...node, radius })} />
          )}
        </Section>
      );
  }
}

/* ───────────── Action ───────────── */

function paramsToText(params: Record<string, string> | undefined): string {
  return params ? Object.entries(params).map(([k, v]) => `${k}=${v}`).join('\n') : '';
}

function textToParams(text: string): Record<string, string> | undefined | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;
  if (lines.length > 10) return null;
  const params: Record<string, string> = {};
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq <= 0) return null;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!ParamKeySchema.safeParse(key).success || value.length > 256 || key in params) return null;
    params[key] = value;
  }
  return params;
}

const ACTION_TYPES: readonly { value: SceneAction['type']; label: string }[] = [
  { value: 'navigate', label: 'Navigate to screen' },
  { value: 'openPromo', label: 'Open promo' },
  { value: 'openGame', label: 'Open game' },
];

function ActionEditor({
  action,
  routes,
  onChange,
  session,
}: {
  action: SceneAction;
  routes: readonly string[];
  onChange: (action: SceneAction) => void;
  session: EditSession;
}) {
  const changeType = (type: SceneAction['type']) => {
    if (type === action.type) return;
    switch (type) {
      case 'navigate':
        return onChange({ type, route: routes[0] ?? 'Home' });
      case 'openPromo':
        return onChange({ type, promoId: 'promo' });
      case 'openGame':
        return onChange({ type, gameId: 'game' });
    }
  };

  return (
    <Section title="On press">
      <SelectField label="Action" value={action.type} options={ACTION_TYPES} onChange={changeType} wide />
      {action.type === 'navigate' && (
        <>
          {routes.length > 0 && routes.every(isRoute) ? (
            <SelectField
              label="Screen"
              value={action.route}
              options={(routes.includes(action.route) ? routes : [action.route, ...routes]).map((r) => ({
                value: r,
                label: routes.includes(r) ? r : `${r} (not in route list)`,
              }))}
              onChange={(route) => onChange({ ...action, route })}
              wide
            />
          ) : (
            <TextField
              label="Route"
              value={action.route}
              maxLength={64}
              validate={isRoute}
              hint="Letter first, then A–Z, 0–9, _"
              session={session}
              onChange={(route) => onChange({ ...action, route })}
            />
          )}
          <TextField
            label="Params (key=value per line)"
            value={paramsToText(action.params)}
            maxLength={3000}
            multiline
            validate={(text) => textToParams(text) !== null}
            hint="Max 10, keys: letter first, A–Z 0–9 _"
            session={session}
            onChange={(text) => {
              const params = textToParams(text);
              if (params === null) return;
              const { params: _old, ...rest } = action;
              onChange(params ? { ...rest, params } : rest);
            }}
          />
        </>
      )}
      {action.type === 'openPromo' && (
        <TextField
          label="Promo id"
          value={action.promoId}
          maxLength={64}
          validate={isId}
          hint="A–Z, 0–9, _ and -"
          session={session}
          onChange={(promoId) => onChange({ ...action, promoId })}
        />
      )}
      {action.type === 'openGame' && (
        <TextField
          label="Game id"
          value={action.gameId}
          maxLength={64}
          validate={isId}
          hint="A–Z, 0–9, _ and -"
          session={session}
          onChange={(gameId) => onChange({ ...action, gameId })}
        />
      )}
    </Section>
  );
}

/* ───────────── Shadow ───────────── */

const DEFAULT_SHADOW: Shadow = { color: 'black', opacity: 0.35, x: 0, y: 0.6, blur: 1.5 };

function ShadowEditor({
  shadow,
  palette,
  label,
  onChange,
  session,
}: {
  shadow: Shadow | null;
  palette: Palette;
  label: string;
  onChange: (shadow: Shadow | null) => void;
  session: EditSession;
}) {
  return (
    <Section
      title={label}
      actions={
        <input
          type="checkbox"
          aria-label={`Enable ${label.toLowerCase()}`}
          checked={shadow !== null}
          onChange={(e) => onChange(e.target.checked ? DEFAULT_SHADOW : null)}
        />
      }
    >
      {shadow && (
        <div className="ske-grid">
          <ColorField label="Color" value={shadow.color} palette={palette} onChange={(color) => onChange({ ...shadow, color })} />
          <NumberField label="Opacity" value={shadow.opacity} min={0} max={1} step={0.05} session={session} onChange={(opacity) => onChange({ ...shadow, opacity })} />
          <NumberField label="X (u)" value={shadow.x} min={-10} max={10} step={0.1} session={session} onChange={(x) => onChange({ ...shadow, x })} />
          <NumberField label="Y (u)" value={shadow.y} min={-10} max={10} step={0.1} session={session} onChange={(y) => onChange({ ...shadow, y })} />
          <NumberField label="Blur (u)" value={shadow.blur} min={0} max={10} step={0.1} session={session} onChange={(blur) => onChange({ ...shadow, blur })} />
        </div>
      )}
    </Section>
  );
}

/* ───────────── Effects ───────────── */

const DURATION = { min: 100, max: 20000, step: 50 } as const;

function EffectFields({
  effect,
  palette,
  onChange,
  session,
}: {
  effect: Effect;
  palette: Palette;
  onChange: (effect: Effect) => void;
  session: EditSession;
}) {
  const duration = (
    <NumberField
      label="Duration ms"
      value={effect.durationMs}
      {...DURATION}
      session={session}
      onChange={(durationMs) => onChange({ ...effect, durationMs: Math.round(durationMs) })}
    />
  );

  switch (effect.type) {
    case 'pulse':
      return (
        <>
          <NumberField label="Scale" value={effect.scale} min={1.01} max={1.5} step={0.01} session={session} onChange={(scale) => onChange({ ...effect, scale })} />
          {duration}
        </>
      );
    case 'outlinePulse':
      return (
        <>
          <ColorField label="Color" value={effect.color} palette={palette} onChange={(color) => onChange({ ...effect, color })} />
          <NumberField label="Width (u)" value={effect.width} min={0.1} max={3} step={0.1} session={session} onChange={(width) => onChange({ ...effect, width })} />
          <NumberField label="Spread" value={effect.spread} min={1} max={1.5} step={0.01} session={session} onChange={(spread) => onChange({ ...effect, spread })} />
          {duration}
        </>
      );
    case 'float':
      return (
        <>
          <NumberField label="Distance (u)" value={effect.distance} min={0.1} max={10} step={0.1} session={session} onChange={(distance) => onChange({ ...effect, distance })} />
          {duration}
        </>
      );
    case 'fadeIn':
      return (
        <>
          <NumberField
            label="Delay ms"
            value={effect.delayMs}
            min={0}
            max={10000}
            step={50}
            session={session}
            onChange={(delayMs) => onChange({ ...effect, delayMs: Math.round(delayMs) })}
          />
          {duration}
        </>
      );
  }
}

function EffectsEditor({
  effects,
  palette,
  onChange,
  session,
}: {
  effects: readonly Effect[];
  palette: Palette;
  onChange: (effects: Effect[]) => void;
  session: EditSession;
}) {
  const available = EFFECT_TYPES.filter((type) => !effects.some((e) => e.type === type));

  return (
    <Section title="Effects">
      {effects.length === 0 && <p className="ske-muted">No effects.</p>}
      {effects.map((effect) => (
        <div key={effect.type} className="ske-effect">
          <div className="ske-effect-head">
            <strong>{EFFECT_LABELS[effect.type]}</strong>
            <button
              type="button"
              className="ske-icon-btn"
              aria-label={`Remove ${EFFECT_LABELS[effect.type]}`}
              onClick={() => onChange(effects.filter((e) => e.type !== effect.type))}
            >
              ✕
            </button>
          </div>
          <div className="ske-grid">
            <EffectFields
              effect={effect}
              palette={palette}
              session={session}
              onChange={(next) => onChange(effects.map((e) => (e.type === next.type ? next : e)))}
            />
          </div>
        </div>
      ))}
      {available.length > 0 && (
        <div className="ske-row">
          {available.map((type) => (
            <button key={type} type="button" className="ske-btn ske-btn-small" onClick={() => onChange([...effects, createEffect(type)])}>
              + {EFFECT_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}
