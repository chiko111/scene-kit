import { useId, useState, type ReactNode } from 'react';
import type { ColorToken, Palette } from '@chiko111/scene-kit-core';
import { COLOR_TOKENS } from '@chiko111/scene-kit-core';

/** Fired on focus / blur so a typing session becomes a single undo step. */
export type EditSession = { begin: () => void; end: () => void };

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="ske-section">
      <header className="ske-section-head">
        <h3>{title}</h3>
        {actions}
      </header>
      <div className="ske-section-body">{children}</div>
    </section>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  session?: EditSession;
};

/**
 * Keeps a local draft only while focused, so the user can type "-", "" or "1." freely.
 * Values outside [min, max] are never committed; blur clamps.
 */
export function NumberField({ label, value, min, max, step, onChange, session }: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft === null ? value : Number(draft);
  const valid = draft === null || (draft.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max);

  return (
    <div className="ske-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        aria-invalid={!valid}
        value={draft ?? String(value)}
        onFocus={() => {
          setDraft(String(value));
          session?.begin();
        }}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const n = Number(text);
          if (text.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={() => {
          if (draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft))) {
            const clamped = Math.min(max, Math.max(min, Number(draft)));
            if (clamped !== value) onChange(clamped);
          }
          setDraft(null);
          session?.end();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  /** Only valid values are committed; invalid drafts stay local and are flagged. */
  validate?: (value: string) => boolean;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  session?: EditSession;
};

export function TextField({
  label,
  value,
  onChange,
  maxLength,
  validate,
  multiline,
  placeholder,
  hint,
  session,
}: TextFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const current = draft ?? value;
  const valid = validate ? validate(current) : true;

  const common = {
    id,
    value: current,
    maxLength,
    placeholder,
    'aria-invalid': !valid,
    onFocus: () => {
      setDraft(value);
      session?.begin();
    },
    onBlur: () => {
      setDraft(null);
      session?.end();
    },
  };

  const handle = (text: string) => {
    setDraft(text);
    if (!validate || validate(text)) onChange(text);
  };

  return (
    <div className="ske-field ske-field-wide">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea {...common} rows={3} onChange={(e) => handle(e.target.value)} />
      ) : (
        <input {...common} type="text" onChange={(e) => handle(e.target.value)} />
      )}
      {hint && <small className={valid ? 'ske-hint' : 'ske-hint is-error'}>{hint}</small>}
    </div>
  );
}

type Option<T extends string> = { value: T; label: string };

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  wide,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  wide?: boolean;
}) {
  const id = useId();
  return (
    <div className={wide ? 'ske-field ske-field-wide' : 'ske-field'}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const found = options.find((o) => o.value === e.target.value);
          if (found) onChange(found.value);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const COLOR_OPTIONS = COLOR_TOKENS.map((token) => ({ value: token, label: token }));

export function ColorField({
  label,
  value,
  palette,
  onChange,
}: {
  label: string;
  value: ColorToken;
  palette: Palette;
  onChange: (value: ColorToken) => void;
}) {
  return (
    <div className="ske-color">
      <span className="ske-swatch" style={{ background: palette[value] }} aria-hidden />
      <SelectField label={label} value={value} options={COLOR_OPTIONS} onChange={onChange} />
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="ske-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** 1–max theme colors in order; the effect cycles through them. */
export function ColorListField({
  label,
  colors,
  palette,
  max,
  onChange,
}: {
  label: string;
  colors: readonly ColorToken[];
  palette: Palette;
  max: number;
  onChange: (colors: ColorToken[]) => void;
}) {
  return (
    <div className="ske-field ske-field-wide ske-colors">
      <span className="ske-colors-label">{label}</span>
      {colors.map((token, i) => (
        <div key={i} className="ske-colors-row">
          <ColorField
            label={`${i + 1}`}
            value={token}
            palette={palette}
            onChange={(next) => onChange(colors.map((c, j) => (j === i ? next : c)))}
          />
          <button
            type="button"
            className="ske-icon-btn"
            aria-label={`Remove color ${i + 1}`}
            disabled={colors.length <= 1}
            onClick={() => onChange(colors.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      {colors.length < max && (
        <button
          type="button"
          className="ske-btn ske-btn-small"
          onClick={() => onChange([...colors, colors[colors.length - 1] ?? 'gold'])}
        >
          + Color
        </button>
      )}
    </div>
  );
}
