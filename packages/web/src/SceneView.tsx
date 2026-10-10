import { useRef } from 'react';
import type { Palette, Scene, SceneAction } from '@chiko111/scene-kit-core';
import { NodeView } from './NodeView';
import { SCENE_CSS } from './styles';
import { useInViewport } from './useInViewport';

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
  className?: string;
};

export function SceneView({
  scene,
  palette,
  onAction,
  active,
  interactive,
  fontFamily,
  className,
}: SceneViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewport(ref);
  const running = (active ?? true) && inView;
  const isInteractive = interactive ?? true;

  return (
    <div
      ref={ref}
      className={className ? `sk-scene ${className}` : 'sk-scene'}
      data-running={running}
      role="group"
      aria-label={scene.name || undefined}
      style={{
        aspectRatio: scene.aspectRatio,
        background: scene.background ? palette[scene.background] : undefined,
        fontFamily,
      }}
    >
      <style href="scene-kit-renderer" precedence="medium">
        {SCENE_CSS}
      </style>
      {scene.nodes.map((node) =>
        node.hidden ? null : (
          <NodeView
            key={node.id}
            node={node}
            palette={palette}
            interactive={isInteractive}
            onAction={onAction}
          />
        ),
      )}
    </div>
  );
}
