import { createHover, type Hover, type Palette, type SceneNode } from '@chiko111/scene-kit-core';
import { CheckboxField, ColorField, NumberField, Section, type EditSession } from './fields';

/** "Hover" section: the highlight shown on mouse hover (web) and while pressed (apps). */
export function HoverEditor({
  node,
  palette,
  session,
  onChange,
}: {
  node: SceneNode;
  palette: Palette;
  session: EditSession;
  onChange: (node: SceneNode) => void;
}) {
  const hover = node.hover;
  const set = (next: Hover | undefined) => {
    if (next) onChange({ ...node, hover: next });
    else {
      const { hover: _removed, ...rest } = node;
      onChange(rest as SceneNode);
    }
  };

  return (
    <Section title="Hover / press">
      <CheckboxField label="Highlight on hover (web) and press (apps)" checked={hover !== undefined} onChange={(on) => set(on ? createHover() : undefined)} />
      {hover && (
        <>
          <NumberField label="Scale" value={hover.scale} min={1} max={1.5} step={0.01} session={session} onChange={(scale) => set({ ...hover, scale })} />
          <NumberField label="Lift (u)" value={hover.lift} min={0} max={10} step={0.1} session={session} onChange={(lift) => set({ ...hover, lift })} />
          <NumberField label="Brightness (web)" value={hover.brightness} min={0.5} max={2} step={0.05} session={session} onChange={(brightness) => set({ ...hover, brightness })} />
          <NumberField label="Duration ms" value={hover.durationMs} min={50} max={2000} step={50} session={session} onChange={(ms) => set({ ...hover, durationMs: Math.round(ms) })} />
          <CheckboxField
            label="Glow around the shape"
            checked={hover.glow !== null}
            onChange={(on) => set({ ...hover, glow: on ? { color: 'accent', blur: 1.4, opacity: 0.8 } : null })}
          />
          {hover.glow && (
            <>
              <ColorField label="Glow color" value={hover.glow.color} palette={palette} onChange={(color) => set({ ...hover, glow: { ...(hover.glow as NonNullable<Hover['glow']>), color } })} />
              <NumberField label="Glow size (u)" value={hover.glow.blur} min={0} max={10} step={0.1} session={session} onChange={(blur) => set({ ...hover, glow: { ...(hover.glow as NonNullable<Hover['glow']>), blur } })} />
              <NumberField label="Glow strength" value={hover.glow.opacity} min={0} max={1} step={0.05} session={session} onChange={(opacity) => set({ ...hover, glow: { ...(hover.glow as NonNullable<Hover['glow']>), opacity } })} />
            </>
          )}
        </>
      )}
    </Section>
  );
}
