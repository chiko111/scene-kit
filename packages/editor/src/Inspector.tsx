import {
  EFFECT_TYPES,
  ENTER_PRESETS,
  type EnterPreset,
  FontKeySchema,
  LottieUriSchema,
  MAX_EFFECT_COLORS,
  DateKeySchema,
  IdSchema,
  TimeZoneSchema,
  ParamKeySchema,
  RouteSchema,
  WebPathSchema,
  type Effect,
  type EffectType,
  type FontMap,
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
  ColorListField,
  NumberField,
  OptionalNumberField,
  Section,
  SelectField,
  TextField,
  type EditSession,
} from './fields';
import { TimelineEditor } from './TimelineEditor';
import { TriggersEditor } from './TriggersEditor';
import { HoverEditor } from './HoverEditor';

const WEIGHTS: readonly { value: FontWeight; label: string }[] = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra bold' },
];

export const EFFECT_LABELS: Record<EffectType, string> = {
  pulse: 'Pulse',
  outlinePulse: 'Pulsing outline',
  glow: 'Glow',
  blur: 'Blur',
  edgeBlink: 'Blinking edge',
  borderRun: 'Running border light',
  float: 'Float',
  wiggle: 'Wiggle',
  spin: 'Spin',
  fadeIn: 'Fade in',
  enter: 'Entrance',
  timeline: 'Keyframe motion',
  kenBurns: 'Slow zoom (Ken Burns)',
  parallax: 'Parallax on scroll',
  splitText: 'Letter by letter',
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
  advanced: advancedProp,
}: {
  scene: Scene;
  palette: Palette;
  onChange: (scene: Scene) => void;
  session: EditSession;
  /** Show technical fields (scene id, exact aspect ratio). */
  advanced?: boolean;
}) {
  const advanced = advancedProp ?? true;
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
        {advanced && <TextField
          label="Scene id"
          value={scene.id}
          maxLength={64}
          validate={isId}
          hint="A–Z, 0–9, _ and -"
          session={session}
          onChange={(id) => onChange({ ...scene, id })}
        />}
        {aspectValue ? (
          <SelectField
            label="Format"
            value={aspectValue}
            options={ASPECTS}
            onChange={(value) => onChange({ ...scene, aspectRatio: Number(value) })}
          />
        ) : !advanced ? (
          <p className="ske-hint">Format: custom ({scene.aspectRatio.toFixed(2)} : 1). Switch on Advanced to change it.</p>
        ) : null}
        {advanced && <NumberField
          label="Aspect (w/h)"
          value={scene.aspectRatio}
          min={0.2}
          max={5}
          step={0.01}
          session={session}
          onChange={(aspectRatio) => onChange({ ...scene, aspectRatio })}
        />}
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
      <p className="ske-muted ske-right-empty">Click a layer on the canvas or in the timeline to edit its style, animation and interactions.</p>
    </>
  );
}

/* ───────────── Node ───────────── */

type NodeProps = {
  node: SceneNode;
  palette: Palette;
  routes: readonly string[];
  fonts: FontMap | undefined;
  onChange: (node: SceneNode) => void;
  session: EditSession;
};

/** Set by the timeline panel: scroll to this effect (and open this keyframe). `nonce` changes on every click. */
export type EffectFocus = { effect: EffectType; keyframe?: number; nonce: number };

/** Style tab: what the layer looks like and where it is. */
export function NodeInspector({ node, palette, routes, fonts, onChange, session }: NodeProps) {
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

      <TypeFields node={node} palette={palette} routes={routes} fonts={fonts} onChange={onChange} session={session} />

      <ShadowEditor
        shadow={node.shadow}
        palette={palette}
        session={session}
        label={node.type === 'text' ? 'Text shadow' : 'Shadow'}
        onChange={(shadow) => onChange({ ...node, shadow })}
      />

      <details className="ske-section ske-more">
        <summary>Exact position (% of scene)</summary>
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
      </details>
    </>
  );
}

/** Interaction tab: what happens on tap / press / hover. */
export function InteractionInspector({
  node,
  palette,
  routes,
  onChange,
  session,
  layers,
}: Omit<NodeProps, 'fonts'> & { layers: readonly SceneNode[] }) {
  return (
    <>
      {node.type === 'button' && (
        <ActionEditor title="On press" action={node.action} routes={routes} session={session} onChange={(action) => onChange({ ...node, action })} />
      )}
      {node.type === 'image' && (
        <Section title="On tap">
          <OptionalActionEditor
            title="Tap action"
            action={node.action}
            routes={routes}
            session={session}
            onChange={(action) => {
              const { action: _old, ...rest } = node;
              onChange(action ? { ...rest, action } : rest);
            }}
          />
        </Section>
      )}
      <HoverEditor node={node} palette={palette} session={session} onChange={onChange} />
      <TriggersEditor node={node} layers={layers} onChange={onChange} />
    </>
  );
}

function TypeFields({ node, palette, fonts, onChange, session }: Omit<NodeProps, 'routes'> & { routes?: readonly string[] }) {
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
          <FontField fonts={fonts} value={node.font} onChange={(font) => onChange({ ...node, font })} />
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
            <FontField fonts={fonts} value={node.font} onChange={(font) => onChange({ ...node, font })} />
            <NumberField label="Size (u)" value={node.fontSize} min={0.5} max={30} step={0.25} session={session} onChange={(fontSize) => onChange({ ...node, fontSize })} />
            <SelectField label="Weight" value={node.weight} options={WEIGHTS} onChange={(weight) => onChange({ ...node, weight })} />
            <NumberField label="Radius (u)" value={node.radius} min={0} max={50} step={0.25} session={session} onChange={(radius) => onChange({ ...node, radius })} />
          </Section>
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

    case 'lottie':
      return (
        <Section title="Lottie animation">
          <TextField
            label="Lottie file URL"
            value={node.uri}
            maxLength={2048}
            validate={(v) => LottieUriSchema.safeParse(v).success}
            hint="https:// .json or .lottie (After Effects / LottieFiles export)"
            session={session}
            onChange={(uri) => onChange({ ...node, uri })}
          />
          <CheckboxField label="Loop" checked={node.loop} onChange={(loop) => onChange({ ...node, loop })} />
          <NumberField label="Speed" value={node.speed} min={0.1} max={3} step={0.1} session={session} onChange={(speed) => onChange({ ...node, speed })} />
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

    case 'countdown':
      return (
        <>
          <Section title="Countdown">
            <TextField
              label="Ends on (YYYY-MM-DD)"
              value={node.endDate}
              maxLength={10}
              validate={(v) => DateKeySchema.safeParse(v).success}
              session={session}
              onChange={(endDate) => onChange({ ...node, endDate })}
            />
            <div className="ske-grid">
              <NumberField label="at hour" value={node.endTime.hour} min={0} max={23} step={1} session={session} onChange={(hour) => onChange({ ...node, endTime: { ...node.endTime, hour: Math.round(hour) } })} />
              <NumberField label="minute" value={node.endTime.minute} min={0} max={59} step={1} session={session} onChange={(minute) => onChange({ ...node, endTime: { ...node.endTime, minute: Math.round(minute) } })} />
            </div>
            <TextField
              label="Time zone"
              value={node.timeZone}
              maxLength={64}
              validate={(v) => TimeZoneSchema.safeParse(v).success}
              hint="e.g. Europe/Sofia – the end time is in this zone for every player"
              session={session}
              onChange={(timeZone) => onChange({ ...node, timeZone })}
            />
            <SelectField
              label="Format"
              value={node.format}
              options={[
                { value: 'auto', label: 'Days only while > 0' },
                { value: 'dhms', label: 'Always days' },
                { value: 'hms', label: 'Hours (no days)' },
              ]}
              onChange={(format) => onChange({ ...node, format })}
            />
            <div className="ske-grid">
              {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
                <TextField
                  key={unit}
                  label={`${unit} label`}
                  value={node.labels[unit]}
                  maxLength={10}
                  session={session}
                  onChange={(v) => onChange({ ...node, labels: { ...node.labels, [unit]: v } })}
                />
              ))}
            </div>
            <small className="ske-hint">All labels empty = digits only, e.g. 02:03:14:09</small>
            <TextField label="After the end" value={node.endedText} maxLength={80} session={session} onChange={(endedText) => onChange({ ...node, endedText })} />
          </Section>
          <Section title="Text style">
            <ColorField label="Color" value={node.color} palette={palette} onChange={(color) => onChange({ ...node, color })} />
            <FontField fonts={fonts} value={node.font} onChange={(font) => onChange({ ...node, font })} />
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
        </>
      );
  }
}

/* ───────────── Font ───────────── */

function FontField({
  fonts,
  value,
  onChange,
}: {
  fonts: FontMap | undefined;
  value: string | undefined;
  onChange: (font: string | undefined) => void;
}) {
  const keys = Object.keys(fonts ?? {}).filter((k) => FontKeySchema.safeParse(k).success);
  if (keys.length === 0 && !value) return null;
  const options = [
    { value: '', label: 'Default' },
    ...keys.map((k) => ({ value: k, label: k })),
    ...(value && !keys.includes(value) ? [{ value, label: `${value} (not configured)` }] : []),
  ];
  return <SelectField label="Font" value={value ?? ''} options={options} onChange={(v) => onChange(v || undefined)} />;
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
  { value: 'navigate', label: 'Navigate (app screen / web path)' },
  { value: 'openPromo', label: 'Open promo' },
  { value: 'openGame', label: 'Open game' },
];

const NONE = 'none' as const;

/** Action that may be absent (e.g. image tap). "None" removes it. */
export function OptionalActionEditor({
  title,
  action,
  routes,
  onChange,
  session,
}: {
  title: string;
  action: SceneAction | undefined;
  routes: readonly string[];
  onChange: (action: SceneAction | undefined) => void;
  session: EditSession;
}) {
  if (action) {
    return (
      <div className="ske-field-wide">
        <ActionEditor title={title} action={action} routes={routes} session={session} onChange={onChange} />
        <button type="button" className="ske-btn ske-btn-small" onClick={() => onChange(undefined)}>
          Remove {title.toLowerCase()}
        </button>
      </div>
    );
  }
  return (
    <SelectField
      label={title}
      value={NONE as string}
      wide
      options={[{ value: NONE, label: 'None' }, ...ACTION_TYPES]}
      onChange={(type) => {
        if (type === NONE) return;
        onChange(defaultAction(type as SceneAction['type'], routes));
      }}
    />
  );
}

function defaultAction(type: SceneAction['type'], routes: readonly string[]): SceneAction {
  switch (type) {
    case 'navigate':
      return { type, route: routes[0] ?? 'Home' };
    case 'openPromo':
      return { type, promoId: 'promo' };
    case 'openGame':
      return { type, gameId: 'game' };
  }
}

export function ActionEditor({
  action,
  routes,
  onChange,
  session,
  title,
}: {
  action: SceneAction;
  routes: readonly string[];
  onChange: (action: SceneAction) => void;
  session: EditSession;
  title?: string;
}) {
  const changeType = (type: SceneAction['type']) => {
    if (type !== action.type) onChange(defaultAction(type, routes));
  };

  return (
    <Section title={title ?? 'On press'}>
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
            label="Web path (optional)"
            value={action.webPath ?? ''}
            maxLength={512}
            placeholder="/casino/slots?tab=new"
            validate={(v) => v === '' || WebPathSchema.safeParse(v).success}
            hint="Only on your site: starts with /. Empty = web uses the screen above."
            session={session}
            onChange={(v) => onChange({ ...action, webPath: v === '' ? undefined : v })}
          />
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

export const ENTER_LABELS: Record<EnterPreset, string> = {
  fade: 'Fade',
  fadeUp: 'Fade up',
  fadeDown: 'Fade down',
  slideLeft: 'Slide in from right',
  slideRight: 'Slide in from left',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  bounceIn: 'Bounce in',
  flipIn: 'Flip in',
};
const ENTER_OPTIONS = ENTER_PRESETS.map((value) => ({ value, label: ENTER_LABELS[value] }));

/** Sets / removes the optional loop start delay (undefined = no key, keeps JSON minimal). */
function withDelay<E extends { delayMs?: number }>(effect: E, delayMs: number | undefined): E {
  const { delayMs: _old, ...rest } = effect;
  return (delayMs === undefined || delayMs === 0 ? rest : { ...rest, delayMs }) as E;
}

export function EffectFields({
  effect,
  node,
  palette,
  onChange,
  session,
  focusKeyframe,
}: {
  effect: Effect;
  node: SceneNode;
  palette: Palette;
  onChange: (effect: Effect) => void;
  session: EditSession;
  focusKeyframe?: { index: number; nonce: number };
}) {
  const nodeType = node.type;
  const duration =
    'durationMs' in effect ? (
      <NumberField
        label="Duration ms"
        value={effect.durationMs}
        {...DURATION}
        session={session}
        onChange={(durationMs) => onChange({ ...effect, durationMs: Math.round(durationMs) } as Effect)}
      />
    ) : null;

  const loopDelay = (value: number | undefined, set: (delayMs: number | undefined) => void) => (
    <OptionalNumberField
      label="Start delay ms"
      value={value}
      min={0}
      max={10000}
      step={50}
      session={session}
      onChange={(v) => set(v === undefined ? undefined : Math.round(v))}
    />
  );

  switch (effect.type) {
    case 'pulse':
      return (
        <>
          <NumberField label="Scale" value={effect.scale} min={1.01} max={1.5} step={0.01} session={session} onChange={(scale) => onChange({ ...effect, scale })} />
          {duration}
          {loopDelay(effect.delayMs, (delayMs) => onChange(withDelay(effect, delayMs)))}
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
          {loopDelay(effect.delayMs, (delayMs) => onChange(withDelay(effect, delayMs)))}
        </>
      );
    case 'wiggle':
      return (
        <>
          <NumberField label="Angle °" value={effect.angle} min={0.5} max={30} step={0.5} session={session} onChange={(angle) => onChange({ ...effect, angle })} />
          {duration}
          {loopDelay(effect.delayMs, (delayMs) => onChange(withDelay(effect, delayMs)))}
        </>
      );
    case 'spin':
      return (
        <>
          <SelectField
            label="Direction"
            value={effect.direction}
            options={[
              { value: 'cw', label: 'Clockwise' },
              { value: 'ccw', label: 'Counter-clockwise' },
            ]}
            onChange={(direction) => onChange({ ...effect, direction })}
          />
          <NumberField label="Ms per turn" value={effect.durationMs} {...DURATION} session={session} onChange={(durationMs) => onChange({ ...effect, durationMs: Math.round(durationMs) })} />
        </>
      );
    case 'enter':
      return (
        <>
          <SelectField label="Animation" value={effect.preset} options={ENTER_OPTIONS} onChange={(preset) => onChange({ ...effect, preset })} />
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
    case 'glow':
      return (
        <>
          {nodeType === 'image' && (
            <div className="ske-field-wide">
              <CheckboxField
                label="Follow image outline (transparent PNG/WebP)"
                checked={effect.contour === true}
                onChange={(contour) => onChange({ ...effect, contour: contour || undefined })}
              />
            </div>
          )}
          <ColorListField label="Colors (blends 1 → 2 → …)" colors={effect.colors} palette={palette} max={MAX_EFFECT_COLORS} onChange={(colors) => onChange({ ...effect, colors })} />
          <NumberField label="Blur (u)" value={effect.blur} min={0.5} max={10} step={0.25} session={session} onChange={(blur) => onChange({ ...effect, blur })} />
          <NumberField label="Spread (u)" value={effect.spread} min={0} max={5} step={0.25} session={session} onChange={(spread) => onChange({ ...effect, spread })} />
          <NumberField label="Ms per color" value={effect.durationMs} {...DURATION} session={session} onChange={(durationMs) => onChange({ ...effect, durationMs: Math.round(durationMs) })} />
        </>
      );
    case 'edgeBlink':
      return (
        <>
          <ColorListField label="Colors (in order)" colors={effect.colors} palette={palette} max={MAX_EFFECT_COLORS} onChange={(colors) => onChange({ ...effect, colors })} />
          <SelectField
            label="Mode"
            value={effect.mode}
            options={[
              { value: 'blink', label: 'Blink (hard switch)' },
              { value: 'fade', label: 'Fade (smooth)' },
            ]}
            onChange={(mode) => onChange({ ...effect, mode })}
          />
          <NumberField label="Width (u)" value={effect.width} min={0.1} max={3} step={0.1} session={session} onChange={(width) => onChange({ ...effect, width })} />
          <NumberField label="Glow (u)" value={effect.blur} min={0} max={5} step={0.25} session={session} onChange={(blur) => onChange({ ...effect, blur })} />
          <NumberField label="Ms per color" value={effect.durationMs} {...DURATION} session={session} onChange={(durationMs) => onChange({ ...effect, durationMs: Math.round(durationMs) })} />
        </>
      );
    case 'borderRun':
      return (
        <>
          <ColorListField label="Lights (one per color)" colors={effect.colors} palette={palette} max={MAX_EFFECT_COLORS} onChange={(colors) => onChange({ ...effect, colors })} />
          <NumberField label="Size (u)" value={effect.size} min={0.3} max={5} step={0.1} session={session} onChange={(size) => onChange({ ...effect, size })} />
          <NumberField label="Ms per lap" value={effect.durationMs} {...DURATION} session={session} onChange={(durationMs) => onChange({ ...effect, durationMs: Math.round(durationMs) })} />
        </>
      );
    case 'blur':
      return (
        <>
          <SelectField
            label="Mode"
            value={effect.mode}
            options={[
              { value: 'focusIn', label: 'Focus in (once)' },
              { value: 'breathe', label: 'Sharp ↔ blurred loop' },
              { value: 'static', label: 'Always blurred' },
            ]}
            onChange={(mode) => onChange({ ...effect, mode })}
          />
          <NumberField label="Amount (u)" value={effect.amount} min={0.2} max={10} step={0.1} session={session} onChange={(amount) => onChange({ ...effect, amount })} />
          {effect.mode !== 'static' && duration}
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
    case 'timeline':
      return <TimelineEditor effect={effect} node={node} session={session} onChange={onChange} focusKeyframe={focusKeyframe} />;
    case 'kenBurns':
      return (
        <>
          <NumberField label="From zoom" value={effect.fromScale} min={1} max={2} step={0.01} session={session} onChange={(fromScale) => onChange({ ...effect, fromScale })} />
          <NumberField label="To zoom" value={effect.toScale} min={1} max={2} step={0.01} session={session} onChange={(toScale) => onChange({ ...effect, toScale })} />
          <NumberField label="From X %" value={effect.fromX} min={-25} max={25} step={0.5} session={session} onChange={(fromX) => onChange({ ...effect, fromX })} />
          <NumberField label="From Y %" value={effect.fromY} min={-25} max={25} step={0.5} session={session} onChange={(fromY) => onChange({ ...effect, fromY })} />
          <NumberField label="To X %" value={effect.toX} min={-25} max={25} step={0.5} session={session} onChange={(toX) => onChange({ ...effect, toX })} />
          <NumberField label="To Y %" value={effect.toY} min={-25} max={25} step={0.5} session={session} onChange={(toY) => onChange({ ...effect, toY })} />
          <NumberField
            label="Duration ms"
            value={effect.durationMs}
            min={1000}
            max={60000}
            step={500}
            session={session}
            onChange={(durationMs) => onChange({ ...effect, durationMs: Math.round(durationMs) })}
          />
          <SelectField
            label="Mode"
            value={effect.mode}
            options={[
              { value: 'pingpong', label: 'Back and forth' },
              { value: 'once', label: 'Once (holds the end)' },
            ]}
            onChange={(mode) => onChange({ ...effect, mode })}
          />
        </>
      );
    case 'parallax':
      return (
        <div className="ske-field-wide ske-range">
          <label>
            <span>
              Depth {effect.depth.toFixed(2)} – {effect.depth > 0 ? 'farther (moves slower)' : effect.depth < 0 ? 'closer (moves faster)' : 'no movement'}
            </span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={effect.depth}
              aria-label="Parallax depth"
              onPointerDown={session.begin}
              onPointerUp={session.end}
              onChange={(e) => onChange({ ...effect, depth: Number(e.target.value) })}
            />
          </label>
          <small className="ske-hint">Only moves inside a page (a standalone banner doesn't scroll).</small>
        </div>
      );
    case 'splitText':
      return (
        <>
          <SelectField
            label="Split by"
            value={effect.by}
            options={[
              { value: 'char', label: 'Letters' },
              { value: 'word', label: 'Words' },
            ]}
            onChange={(by) => onChange({ ...effect, by })}
          />
          <SelectField label="Animation" value={effect.preset} options={ENTER_OPTIONS} onChange={(preset) => onChange({ ...effect, preset })} />
          <NumberField label="Stagger ms" value={effect.staggerMs} min={0} max={500} step={5} session={session} onChange={(staggerMs) => onChange({ ...effect, staggerMs: Math.round(staggerMs) })} />
          <NumberField label="Delay ms" value={effect.delayMs} min={0} max={10000} step={50} session={session} onChange={(delayMs) => onChange({ ...effect, delayMs: Math.round(delayMs) })} />
          <NumberField
            label="Each piece ms"
            value={effect.durationMs}
            min={100}
            max={5000}
            step={50}
            session={session}
            onChange={(durationMs) => onChange({ ...effect, durationMs: Math.round(durationMs) })}
          />
        </>
      );
  }
}
