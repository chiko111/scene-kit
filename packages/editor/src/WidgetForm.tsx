import { useId, useState } from 'react';
import {
  COLOR_TOKENS,
  DateKeySchema,
  FontKeySchema,
  IdSchema,
  ImageUriSchema,
  MAX_CAROUSEL_GAMES,
  MAX_TERMS_BLOCKS,
  MonthKeySchema,
  ParamKeySchema,
  TimeZoneSchema,
  VideoUrlPatternSchema,
  WidgetSchema,
  type ColorToken,
  type FontMap,
  type Palette,
  type SceneAction,
  type Widget,
  type WidgetOf,
} from '@chiko111/scene-kit-core';
import { CheckboxField, ColorField, NumberField, Section, SelectField, TextField, type EditSession } from './fields';
import { ActionEditor, OptionalActionEditor } from './Inspector';
import { termsToText, textToTerms } from './termsText';
import { WIDGET_LABELS } from './widgetDefaults';

/* ───────────── path helpers (immutable) ───────────── */

type Obj = Record<string, unknown>;

function getAt(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Obj)[k] : undefined), obj);
}

function setAt<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.') as [string, ...string[]];
  const current = obj as Obj;
  return { ...current, [head]: rest.length ? setAt(current[head], rest.join('.'), value) : value } as T;
}

/* ───────────── field descriptors ───────────── */

type Field =
  | { kind: 'text'; path: string; label: string; max: number; multiline?: boolean; hint?: string; validate?: (v: string) => boolean }
  | { kind: 'number'; path: string; label: string; min: number; max: number; step: number; int?: boolean }
  | { kind: 'color'; path: string; label: string }
  | { kind: 'colorNull'; path: string; label: string }
  | { kind: 'uri'; path: string; label: string }
  | { kind: 'time'; path: string; label: string }
  | { kind: 'timeOptional'; path: string; label: string }
  | { kind: 'action'; path: string; label: string }
  | { kind: 'actionNull'; path: string; label: string }
  | { kind: 'font'; path: string }
  | { kind: 'list7'; path: string; label: string }
  | { kind: 'specialDays'; path: string; label: string }
  | { kind: 'games'; path: string }
  | { kind: 'terms'; path: string };

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }) => (v: string) => schema.safeParse(v).success;

const FIELDS: { [T in Widget['type']]: { title: string; fields: Field[] }[] } = {
  ticketCounter: [
    {
      title: 'Content',
      fields: [
        { kind: 'text', path: 'guestText', label: 'Guest text', max: 120 },
        { kind: 'text', path: 'userText', label: 'Signed-in text', max: 120 },
        { kind: 'text', path: 'field', label: 'User field', max: 32, validate: ok(ParamKeySchema), hint: 'Key the app passes in user.fields, e.g. tickets' },
        { kind: 'action', path: 'loginAction', label: 'Login action (guests)' },
      ],
    },
    {
      title: 'Look',
      fields: [
        { kind: 'number', path: 'aspectRatio', label: 'Aspect (w / h)', min: 0.5, max: 10, step: 0.1 },
        { kind: 'uri', path: 'backgroundUri', label: 'Background image' },
        { kind: 'colorNull', path: 'background', label: 'Background color' },
        { kind: 'uri', path: 'boxUri', label: 'Number frame image' },
        { kind: 'color', path: 'textColor', label: 'Text' },
        { kind: 'color', path: 'numberColor', label: 'Number' },
        { kind: 'font', path: 'font' },
      ],
    },
  ],
  calendar: [
    {
      title: 'Campaign',
      fields: [
        { kind: 'text', path: 'title', label: 'Title', max: 80 },
        { kind: 'text', path: 'month', label: 'Month (YYYY-MM)', max: 7, validate: ok(MonthKeySchema) },
        { kind: 'number', path: 'firstDay', label: 'First day', min: 1, max: 31, step: 1, int: true },
        { kind: 'number', path: 'lastDay', label: 'Last day', min: 1, max: 31, step: 1, int: true },
        { kind: 'text', path: 'timeZone', label: 'Time zone', max: 64, validate: ok(TimeZoneSchema), hint: 'e.g. Europe/Sofia' },
        { kind: 'specialDays', path: 'specialDays', label: 'Special days (day=label per line)' },
      ],
    },
    {
      title: 'Texts',
      fields: [
        { kind: 'text', path: 'prizeText', label: 'Prize on every day', max: 30, validate: (v) => v.length > 0 },
        { kind: 'text', path: 'wonText', label: 'Stamp on past days', max: 30 },
        { kind: 'text', path: 'watchText', label: 'Past day button', max: 20 },
        { kind: 'text', path: 'todayText', label: 'Under today', max: 40 },
        { kind: 'text', path: 'todayChip', label: 'Today chip', max: 20 },
        { kind: 'text', path: 'tomorrowText', label: 'Tomorrow', max: 20 },
        { kind: 'text', path: 'soonText', label: 'Later days', max: 20 },
        { kind: 'list7', path: 'weekdayLabels', label: 'Weekday headers (Mon…Sun, comma separated)' },
      ],
    },
    {
      title: 'Colors',
      fields: [
        { kind: 'colorNull', path: 'colors.background', label: 'Section background' },
        { kind: 'color', path: 'colors.board', label: 'Board' },
        { kind: 'color', path: 'colors.day', label: 'Day bubble' },
        { kind: 'color', path: 'colors.text', label: 'Text' },
        { kind: 'color', path: 'colors.muted', label: 'Muted' },
        { kind: 'color', path: 'colors.accent', label: 'Accent' },
        { kind: 'color', path: 'colors.today', label: 'Today bubble' },
        { kind: 'color', path: 'colors.onToday', label: 'Today text' },
        { kind: 'font', path: 'font' },
      ],
    },
  ],
  drawVideos: [
    {
      title: 'Draws',
      fields: [
        {
          kind: 'text',
          path: 'videoUrlPattern',
          label: 'Video URL pattern',
          max: 2048,
          validate: ok(VideoUrlPatternSchema),
          hint: 'https only, with {DD} {MM} {YYYY}, e.g. https://cdn…/{DD}{MM}draw.mp4',
        },
        { kind: 'uri', path: 'posterUri', label: 'Poster image' },
        { kind: 'text', path: 'startDate', label: 'First draw (YYYY-MM-DD)', max: 10, validate: ok(DateKeySchema) },
        { kind: 'text', path: 'endDate', label: 'Last draw (YYYY-MM-DD)', max: 10, validate: ok(DateKeySchema) },
        { kind: 'text', path: 'timeZone', label: 'Time zone', max: 64, validate: ok(TimeZoneSchema) },
        { kind: 'time', path: 'releaseTime', label: "Today's video from" },
        { kind: 'timeOptional', path: 'announceTime', label: 'Announced draw time ({time} in texts)' },
      ],
    },
    {
      title: 'Texts',
      fields: [
        { kind: 'text', path: 'labels.drawFor', label: 'Above the date', max: 40 },
        { kind: 'text', path: 'labels.today', label: 'Today chip', max: 20 },
        { kind: 'text', path: 'labels.pending', label: 'Before release ({time})', max: 120 },
        { kind: 'text', path: 'labels.future', label: 'Future day ({date} {time})', max: 120 },
        { kind: 'text', path: 'labels.backToToday', label: 'Back to today', max: 30 },
        { kind: 'list7', path: 'labels.weekdays', label: 'Weekday names (Mon…Sun, comma separated)' },
      ],
    },
    {
      title: 'Colors',
      fields: [
        { kind: 'colorNull', path: 'colors.background', label: 'Section background' },
        { kind: 'color', path: 'colors.card', label: 'Card' },
        { kind: 'color', path: 'colors.text', label: 'Text' },
        { kind: 'color', path: 'colors.muted', label: 'Muted' },
        { kind: 'color', path: 'colors.accent', label: 'Accent' },
        { kind: 'color', path: 'colors.onAccent', label: 'On accent' },
        { kind: 'font', path: 'font' },
      ],
    },
  ],
  gameCarousel: [
    {
      title: 'Content',
      fields: [
        { kind: 'text', path: 'title', label: 'Title', max: 80 },
        { kind: 'text', path: 'playLabel', label: 'Play button', max: 20 },
        { kind: 'text', path: 'ctaText', label: 'Footer text', max: 80 },
        { kind: 'text', path: 'ctaLabel', label: 'Footer button (empty = none)', max: 40 },
        { kind: 'actionNull', path: 'ctaAction', label: 'Footer button action' },
      ],
    },
    { title: 'Games', fields: [{ kind: 'games', path: 'games' }] },
    {
      title: 'Look',
      fields: [
        { kind: 'uri', path: 'backgroundUri', label: 'Background image' },
        { kind: 'colorNull', path: 'background', label: 'Background color' },
        { kind: 'color', path: 'colors.text', label: 'Text' },
        { kind: 'color', path: 'colors.accent', label: 'Accent' },
        { kind: 'color', path: 'colors.onAccent', label: 'On accent' },
        { kind: 'font', path: 'font' },
      ],
    },
  ],
  terms: [
    {
      title: 'Content',
      fields: [
        { kind: 'text', path: 'title', label: 'Title', max: 120 },
        { kind: 'text', path: 'expandLabel', label: 'Expand button', max: 60, validate: (v) => v.length > 0 },
        { kind: 'text', path: 'collapseLabel', label: 'Collapse button', max: 60, validate: (v) => v.length > 0 },
        { kind: 'number', path: 'previewBlocks', label: 'Blocks before expanding', min: 0, max: 20, step: 1, int: true },
        { kind: 'terms', path: 'blocks' },
      ],
    },
    {
      title: 'Colors',
      fields: [
        { kind: 'colorNull', path: 'colors.background', label: 'Section background' },
        { kind: 'color', path: 'colors.card', label: 'Card' },
        { kind: 'color', path: 'colors.text', label: 'Text' },
        { kind: 'color', path: 'colors.accent', label: 'Accent' },
        { kind: 'font', path: 'font' },
      ],
    },
  ],
};

/* ───────────── small field components ───────────── */

const NONE = '__none__';
const NULLABLE_COLORS = [{ value: NONE, label: 'None' }, ...COLOR_TOKENS.map((t) => ({ value: t as string, label: t }))];

function NullableColorField({ label, value, palette, onChange }: { label: string; value: ColorToken | null; palette: Palette; onChange: (v: ColorToken | null) => void }) {
  return (
    <div className="ske-color">
      <span className="ske-swatch" style={{ background: value ? palette[value] : 'transparent' }} aria-hidden />
      <SelectField
        label={label}
        value={value ?? NONE}
        options={NULLABLE_COLORS}
        onChange={(v) => onChange(v === NONE ? null : (v as ColorToken))}
      />
    </div>
  );
}

/** Multi-line editor that keeps its own draft and only commits parseable text. */
function DraftArea({
  label,
  value,
  parse,
  rows,
  hint,
  onChange,
  session,
}: {
  label: string;
  value: string;
  parse: (text: string) => unknown | null;
  rows: number;
  hint?: string;
  onChange: (parsed: unknown) => void;
  session: EditSession;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const valid = parse(text) !== null;
  return (
    <div className="ske-field ske-field-wide">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        className="ske-code"
        rows={rows}
        value={text}
        aria-invalid={!valid}
        onFocus={() => {
          setDraft(value);
          session.begin();
        }}
        onBlur={() => {
          setDraft(null);
          session.end();
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          const parsed = parse(e.target.value);
          if (parsed !== null) onChange(parsed);
        }}
      />
      {hint && <small className={valid ? 'ske-hint' : 'ske-hint is-error'}>{hint}</small>}
    </div>
  );
}

function parseList7(text: string): string[] | null {
  const items = text.split(',').map((s) => s.trim());
  return items.length === 7 && items.every((s) => s.length <= 20) ? items : null;
}

function parseSpecialDays(text: string): { day: number; label: string }[] | null {
  const out: { day: number; label: string }[] = [];
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = /^(\d{1,2})\s*=\s*(.+)$/.exec(line);
    if (!m) return null;
    const day = Number(m[1]);
    const label = (m[2] ?? '').trim();
    if (day < 1 || day > 31 || label.length === 0 || label.length > 30) return null;
    out.push({ day, label });
  }
  return out.length <= 31 ? out : null;
}

type Game = WidgetOf<'gameCarousel'>['games'][number];

function GamesEditor({
  games,
  routes,
  session,
  onChange,
}: {
  games: readonly Game[];
  routes: readonly string[];
  session: EditSession;
  onChange: (games: Game[]) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const set = (i: number, game: Game) => onChange(games.map((g, j) => (j === i ? game : g)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= games.length) return;
    const next = [...games];
    const [g] = next.splice(i, 1);
    if (g) next.splice(j, 0, g);
    onChange(next);
  };

  return (
    <div className="ske-field-wide ske-games">
      <ul className="ske-layers">
        {games.map((g, i) => (
          <li key={`${g.id}-${i}`} className={open === i ? 'ske-layer is-selected' : 'ske-layer'}>
            <button type="button" className="ske-layer-name" onClick={() => setOpen(open === i ? null : i)}>
              <img src={g.imageUri} alt="" className="ske-thumb" />
              <span>{g.name}</span>
            </button>
            <span className="ske-layer-tools">
              <button type="button" className="ske-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="ske-icon-btn" aria-label="Move down" disabled={i === games.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button
                type="button"
                className="ske-icon-btn is-danger"
                aria-label={`Remove ${g.name}`}
                disabled={games.length <= 1}
                onClick={() => {
                  onChange(games.filter((_, j) => j !== i));
                  setOpen(null);
                }}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
      {open !== null && games[open] && (
        <div className="ske-effect">
          {(() => {
            const g = games[open];
            return (
              <>
                <TextField label="Name" value={g.name} maxLength={60} validate={(v) => v.length > 0} session={session} onChange={(name) => set(open, { ...g, name })} />
                <TextField label="Id" value={g.id} maxLength={64} validate={ok(IdSchema)} hint="A–Z, 0–9, _ and -" session={session} onChange={(id) => set(open, { ...g, id })} />
                <TextField label="Image (https)" value={g.imageUri} maxLength={2048} validate={ok(ImageUriSchema)} session={session} onChange={(imageUri) => set(open, { ...g, imageUri })} />
                <TextField
                  label="Corner badge (https, empty = none)"
                  value={g.badgeUri ?? ''}
                  maxLength={2048}
                  validate={(v) => v === '' || ImageUriSchema.safeParse(v).success}
                  hint="e.g. jackpot logo – transparent PNG/WebP"
                  session={session}
                  onChange={(v) => {
                    const { badgeUri: _drop, ...rest } = g;
                    set(open, v === '' ? rest : { ...rest, badgeUri: v });
                  }}
                />
                <ActionEditor title="On tap" action={g.action} routes={routes} session={session} onChange={(action) => set(open, { ...g, action })} />
              </>
            );
          })()}
        </div>
      )}
      {games.length < MAX_CAROUSEL_GAMES && (
        <button
          type="button"
          className="ske-btn ske-btn-small"
          onClick={() => {
            const last = games[games.length - 1];
            const n = games.length + 1;
            onChange([
              ...games,
              { id: `game${n}`, name: `Game ${n}`, imageUri: last?.imageUri ?? 'https://placehold.co/300x400.png', action: { type: 'openGame', gameId: `game${n}` } },
            ]);
            setOpen(games.length);
          }}
        >
          + Game
        </button>
      )}
    </div>
  );
}

/* ───────────── form ───────────── */

export function WidgetForm({
  widget,
  palette,
  routes,
  fonts,
  session,
  onChange,
}: {
  widget: Widget;
  palette: Palette;
  routes: readonly string[];
  fonts: FontMap | undefined;
  session: EditSession;
  onChange: (widget: Widget) => void;
}) {
  const check = WidgetSchema.safeParse(widget);
  const set = (path: string, value: unknown) => onChange(setAt(widget, path, value));
  const fontKeys = Object.keys(fonts ?? {}).filter((k) => FontKeySchema.safeParse(k).success);

  const render = (f: Field) => {
    const value = getAt(widget, f.path);
    switch (f.kind) {
      case 'text':
        return (
          <TextField
            key={f.path}
            label={f.label}
            value={String(value ?? '')}
            maxLength={f.max}
            multiline={f.multiline}
            validate={f.validate}
            hint={f.hint}
            session={session}
            onChange={(v) => set(f.path, v)}
          />
        );
      case 'number':
        return (
          <NumberField
            key={f.path}
            label={f.label}
            value={Number(value)}
            min={f.min}
            max={f.max}
            step={f.step}
            session={session}
            onChange={(v) => set(f.path, f.int ? Math.round(v) : v)}
          />
        );
      case 'color':
        return <ColorField key={f.path} label={f.label} value={value as ColorToken} palette={palette} onChange={(v) => set(f.path, v)} />;
      case 'colorNull':
        return <NullableColorField key={f.path} label={f.label} value={(value as ColorToken | null) ?? null} palette={palette} onChange={(v) => set(f.path, v)} />;
      case 'uri':
        return (
          <TextField
            key={f.path}
            label={`${f.label} (https, empty = none)`}
            value={String(value ?? '')}
            maxLength={2048}
            validate={(v) => v === '' || ImageUriSchema.safeParse(v).success}
            session={session}
            onChange={(v) => set(f.path, v === '' ? null : v)}
          />
        );
      case 'time': {
        const t = value as { hour: number; minute: number };
        return (
          <div key={f.path} className="ske-grid ske-field-wide">
            <NumberField label={`${f.label} – hour`} value={t.hour} min={0} max={23} step={1} session={session} onChange={(hour) => set(f.path, { ...t, hour: Math.round(hour) })} />
            <NumberField label="minute" value={t.minute} min={0} max={59} step={1} session={session} onChange={(minute) => set(f.path, { ...t, minute: Math.round(minute) })} />
          </div>
        );
      }
      case 'timeOptional': {
        const t = value as { hour: number; minute: number } | undefined;
        const without = () => {
          const rest: Obj = { ...(widget as unknown as Obj) };
          delete rest[f.path];
          onChange(rest as unknown as Widget);
        };
        return (
          <div key={f.path} className="ske-field-wide">
            <CheckboxField
              label={`${f.label} – different from the video time`}
              checked={t !== undefined}
              onChange={(on) => (on ? set(f.path, { ...(getAt(widget, 'releaseTime') as object) }) : without())}
            />
            {t && (
              <div className="ske-grid">
                <NumberField label="hour" value={t.hour} min={0} max={23} step={1} session={session} onChange={(hour) => set(f.path, { ...t, hour: Math.round(hour) })} />
                <NumberField label="minute" value={t.minute} min={0} max={59} step={1} session={session} onChange={(minute) => set(f.path, { ...t, minute: Math.round(minute) })} />
              </div>
            )}
          </div>
        );
      }
      case 'action':
        return <ActionEditor key={f.path} title={f.label} action={value as SceneAction} routes={routes} session={session} onChange={(a) => set(f.path, a)} />;
      case 'actionNull':
        return (
          <OptionalActionEditor
            key={f.path}
            title={f.label}
            action={(value as SceneAction | null) ?? undefined}
            routes={routes}
            session={session}
            onChange={(a) => set(f.path, a ?? null)}
          />
        );
      case 'font':
        if (fontKeys.length === 0 && !value) return null;
        return (
          <SelectField
            key={f.path}
            label="Font"
            value={String(value ?? '')}
            options={[{ value: '', label: 'Default' }, ...fontKeys.map((k) => ({ value: k, label: k }))]}
            onChange={(v) => {
              if (v) set(f.path, v);
              else {
                const { font: _drop, ...rest } = widget as Widget & { font?: string };
                onChange(rest as Widget);
              }
            }}
          />
        );
      case 'list7':
        return (
          <DraftArea
            key={f.path}
            label={f.label}
            value={(value as string[]).join(', ')}
            parse={parseList7}
            rows={2}
            hint="Exactly 7 items"
            session={session}
            onChange={(v) => set(f.path, v)}
          />
        );
      case 'specialDays':
        return (
          <DraftArea
            key={f.path}
            label={f.label}
            value={(value as { day: number; label: string }[]).map((d) => `${d.day}=${d.label}`).join('\n')}
            parse={parseSpecialDays}
            rows={3}
            hint="e.g. 30=РОЖДЕН ДЕН"
            session={session}
            onChange={(v) => set(f.path, v)}
          />
        );
      case 'games':
        return <GamesEditor key={f.path} games={value as Game[]} routes={routes} session={session} onChange={(v) => set(f.path, v)} />;
      case 'terms':
        return (
          <DraftArea
            key={f.path}
            label="Terms (one block per line)"
            value={termsToText(value as WidgetOf<'terms'>['blocks'])}
            parse={(text) => {
              const blocks = textToTerms(text);
              return blocks.length > 0 && blocks.length <= MAX_TERMS_BLOCKS ? blocks : null;
            }}
            rows={14}
            hint="# heading · - bullet · 1. numbered · 2 spaces = nested · **bold** · *italic* · [link](Route /web/path)"
            session={session}
            onChange={(v) => set(f.path, v)}
          />
        );
    }
  };

  return (
    <div className="ske-widget-form">
      <Section title={WIDGET_LABELS[widget.type]}>
        {check.success ? (
          <p className="ske-ok">Valid</p>
        ) : (
          <ul className="ske-warnings ske-error" role="alert">
            {check.error.issues.slice(0, 5).map((i, n) => (
              <li key={n}>
                {i.path.join('.') || 'widget'}: {i.message}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {FIELDS[widget.type].map((group) => (
        <Section key={group.title} title={group.title}>
          <div className="ske-grid">{group.fields.map(render)}</div>
        </Section>
      ))}
    </div>
  );
}
