import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { Palette, SceneNode } from '@scene-kit/core';
import { SceneView } from '@scene-kit/web';
import type { SceneHistory } from './history';
import { applyDrag, setFrame, type DragMode } from './sceneOps';

const HANDLES = ['nw', 'ne', 'sw', 'se'] as const;

type Props = {
  history: SceneHistory;
  palette: Palette;
  fontFamily: string | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  playing: boolean;
};

/**
 * Preview = the real web renderer (what you see is exactly what ships).
 * The overlay on top only handles selection, moving and resizing.
 */
export function Canvas({ history, palette, fontFamily, selectedId, onSelect, playing }: Props) {
  const { scene } = history;
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasStyle: CSSProperties & { '--ske-ar': number } = { '--ske-ar': scene.aspectRatio };

  const startDrag = (event: ReactPointerEvent<HTMLElement>, node: SceneNode, mode: DragMode) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect(node.id);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    // Ends any field editing session first, so the drag becomes its own undo step.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    const target = event.currentTarget;
    const origin = { x: event.clientX, y: event.clientY, frame: node.frame };
    let finished = false;

    target.setPointerCapture(event.pointerId);
    history.beginGesture();

    const onMove = (e: PointerEvent) => {
      const dx = ((e.clientX - origin.x) / rect.width) * 100;
      const dy = ((e.clientY - origin.y) / rect.height) * 100;
      const frame = applyDrag(origin.frame, mode, dx, dy, e.shiftKey);
      history.apply((s) => setFrame(s, node.id, frame));
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', finish);
      target.removeEventListener('pointercancel', finish);
      target.removeEventListener('lostpointercapture', finish);
      history.endGesture();
    };

    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', finish);
    target.addEventListener('pointercancel', finish);
    target.addEventListener('lostpointercapture', finish);
  };

  return (
    <div className="ske-stage">
      <div
        ref={canvasRef}
        className="ske-canvas"
        style={canvasStyle}
      >
        <SceneView scene={scene} palette={palette} fontFamily={fontFamily} interactive={false} active={playing} />
        <div
          className="ske-overlay"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onSelect(null);
          }}
        >
          {scene.nodes.map((node) => {
            if (node.hidden) return null;
            const selected = node.id === selectedId;
            const { x, y, w, h, rotation } = node.frame;
            return (
              <div
                key={node.id}
                className={selected ? 'ske-box is-selected' : 'ske-box'}
                title={node.name}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  rotate: rotation ? `${rotation}deg` : undefined,
                }}
                onPointerDown={(e) => startDrag(e, node, 'move')}
              >
                {selected &&
                  HANDLES.map((handle) => (
                    <span
                      key={handle}
                      className={`ske-handle ske-handle-${handle}`}
                      onPointerDown={(e) => startDrag(e, node, handle)}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
