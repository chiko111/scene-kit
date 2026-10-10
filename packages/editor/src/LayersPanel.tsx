import type { Scene, SceneNode } from '@chiko111/scene-kit-core';

const TYPE_ICON: Record<SceneNode['type'], string> = {
  image: '▣',
  text: 'T',
  button: '◉',
  shape: '■',
};

type Props = {
  scene: Scene;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onMove: (id: string, delta: 1 | -1) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
};

/** Top of the list = drawn on top (last in scene.nodes). */
export function LayersPanel({ scene, selectedId, onSelect, onToggleHidden, onMove, onDuplicate, onRemove }: Props) {
  const ordered = [...scene.nodes].reverse();
  const last = scene.nodes.length - 1;

  if (ordered.length === 0) return <p className="ske-muted">No layers yet. Add one above.</p>;

  return (
    <ul className="ske-layers" aria-label="Layers">
      {ordered.map((node) => {
        const index = scene.nodes.indexOf(node);
        const selected = node.id === selectedId;
        return (
          <li key={node.id} className={selected ? 'ske-layer is-selected' : 'ske-layer'}>
            <button
              type="button"
              className="ske-layer-name"
              aria-pressed={selected}
              onClick={() => onSelect(node.id)}
            >
              <span className="ske-layer-icon" aria-hidden>
                {TYPE_ICON[node.type]}
              </span>
              <span className={node.hidden ? 'is-hidden' : undefined}>{node.name || node.id}</span>
            </button>
            <span className="ske-layer-tools">
              <button type="button" className="ske-icon-btn" aria-label="Bring forward" disabled={index === last} onClick={() => onMove(node.id, 1)}>
                ↑
              </button>
              <button type="button" className="ske-icon-btn" aria-label="Send backward" disabled={index === 0} onClick={() => onMove(node.id, -1)}>
                ↓
              </button>
              <button
                type="button"
                className="ske-icon-btn"
                aria-label={node.hidden ? 'Show' : 'Hide'}
                onClick={() => onToggleHidden(node.id)}
              >
                {node.hidden ? '◌' : '●'}
              </button>
              <button type="button" className="ske-icon-btn" aria-label="Duplicate" onClick={() => onDuplicate(node.id)}>
                ⧉
              </button>
              <button type="button" className="ske-icon-btn is-danger" aria-label="Delete" onClick={() => onRemove(node.id)}>
                ✕
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
