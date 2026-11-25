import { use, useEffect, useRef, useState, type RefObject } from 'react';
import { findEffect, type FontMap, type Palette, type Scene, type SceneAction, type SceneFit, type SceneNode } from '@chiko111/scene-kit-core/runtime';
import { NodeView } from './NodeView';
import { SceneEnvContext } from './sceneEnv';
import { SCENE_CSS } from './styles';
import { useEntered, useInViewport } from './useInViewport';

export type SceneViewProps = {
  scene: Scene;
  palette: Palette;
  onAction?: (action: SceneAction) => void;
  /** Extra pause switch (e.g. hidden tab in your layout). Off-screen pausing is automatic. */
  active?: boolean;
  /** false in the editor preview: buttons don't fire and can't be focused. */
  interactive?: boolean;
  /** Font of the app (same value in editor and app keeps the preview identical). */
  fontFamily?: string;
  /** Font keys used in scenes → font families loaded on the page (e.g. { heading: '"Montserrat", sans-serif' }). */
  fonts?: FontMap;
  /** Upper limits in px. The scene keeps its aspect ratio and is centered. */
  maxWidth?: number;
  maxHeight?: number;
  /**
   * 'width' (default): fill the slot's width, height follows the aspect ratio.
   * 'contain': fit entirely inside the slot — the slot must have a height (e.g. a fixed-height box).
   */
  fit?: SceneFit;
  className?: string;
  /**
   * Change it to replay the scene's entrances (enter / timeline / splitText) – e.g. every time a slide
   * becomes active. Layers remount, so their animations start over.
   */
  replayKey?: number;
};

const initialVisibility = (nodes: readonly SceneNode[]): Record<string, boolean> =>
  Object.fromEntries(nodes.filter((n) => n.startHidden).map((n) => [n.id, false]));

/**
 * Parallax (PageView only): writes the scene's offset from the viewport centre into --sk-par-off (px),
 * rAF-throttled on scroll (any scroll container) and resize. Layers move by -depth · 0.3 · offset.
 */
function useParallaxOffset(ref: RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof window === 'undefined') return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.setProperty('--sk-par-off', `${Math.round(offset * 10) / 10}px`);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', queue, { passive: true, capture: true });
    window.addEventListener('resize', queue, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', queue, { capture: true });
      window.removeEventListener('resize', queue);
    };
  }, [ref, enabled]);
}

const positive = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** CSS width that never exceeds the limits and never distorts (height comes from aspect-ratio). */
function sceneWidth(aspectRatio: number, maxWidth?: number, maxHeight?: number, fit?: SceneFit): string {
  const limits = ['100%'];
  if (positive(maxWidth)) limits.push(`${maxWidth}px`);
  if (positive(maxHeight)) limits.push(`${maxHeight * aspectRatio}px`);
  if (fit === 'contain') limits.push(`${aspectRatio * 100}cqh`);
  return limits.length === 1 ? '100%' : `min(${limits.join(', ')})`;
}

export function SceneView({
  scene,
  palette,
  onAction,
  active,
  interactive,
  fontFamily,
  fonts,
  maxWidth,
  maxHeight,
  fit,
  className,
  replayKey,
}: SceneViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewport(ref);
  const entered = useEntered(ref);
  const running = (active ?? true) && inView;
  const isInteractive = interactive ?? true;
  const env = use(SceneEnvContext);
  useParallaxOffset(ref, env.parallax && scene.nodes.some((n) => findEffect(n.effects, 'parallax')));

  // triggers: visibility overrides (startHidden / show / hide / toggle) + per-layer replay counters (play)
  const [visibility, setVisibility] = useState(() => initialVisibility(scene.nodes));
  const [plays, setPlays] = useState<Record<string, number>>({});
  const runTriggers = (node: SceneNode) => {
    for (const t of node.triggers ?? []) {
      if (t.do === 'play') setPlays((p) => ({ ...p, [t.target]: (p[t.target] ?? 0) + 1 }));
      else
        setVisibility((v) => {
          const current = v[t.target] ?? true;
          return { ...v, [t.target]: t.do === 'show' ? true : t.do === 'hide' ? false : !current };
        });
    }
  };

  return (
    <div className="sk-frame" data-fit={fit ?? 'width'}>
      <style href="scene-kit-renderer" precedence="medium">
        {SCENE_CSS}
      </style>
      <div
        ref={ref}
        className={className ? `sk-scene ${className}` : 'sk-scene'}
        data-running={running}
        role="group"
        aria-label={scene.name || undefined}
        style={{
          width: sceneWidth(scene.aspectRatio, maxWidth, maxHeight, fit),
          aspectRatio: scene.aspectRatio,
          background: scene.background ? palette[scene.background] : undefined,
          fontFamily,
        }}
      >
        {scene.nodes.map((node) =>
          node.hidden ? null : (
            <NodeView
              key={`${node.id}:${replayKey ?? 0}:${plays[node.id] ?? 0}`}
              node={node}
              palette={palette}
              aspectRatio={scene.aspectRatio}
              fonts={fonts}
              interactive={isInteractive}
              onAction={onAction}
              entered={entered}
              running={running}
              visible={visibility[node.id] ?? true}
              onTrigger={node.triggers && node.triggers.length > 0 ? () => runTriggers(node) : undefined}
            />
          ),
        )}
      </div>
    </div>
  );
}
