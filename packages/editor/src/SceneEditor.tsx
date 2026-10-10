import { useEffect, useEffectEvent, useState } from 'react';
import {
  MAX_NODES,
  createButtonNode,
  createImageNode,
  createScene,
  createShapeNode,
  createTextNode,
  duplicateNode,
  heightForImage,
  type Palette,
  type Scene,
  type SceneNode,
} from '@chiko111/scene-kit-core';
import { AddPanel } from './AddPanel';
import { Canvas } from './Canvas';
import { Section } from './fields';
import { useSceneHistory } from './history';
import { NodeInspector, SceneInspector } from './Inspector';
import { JsonPanel } from './JsonPanel';
import { LayersPanel } from './LayersPanel';
import { addNode, clampFrame, insertAfter, moveNode, nodeIds, removeNode, replaceNode, updateNode } from './sceneOps';
import { EDITOR_CSS } from './styles';

export type SceneEditorProps = {
  /** Must already be validated with parseScene(). */
  initialScene?: Scene;
  /** Same token → color map the apps use, so the preview matches. */
  palette: Palette;
  /** Whitelisted screens for the "navigate" action. Empty = free text (validated). */
  routes?: readonly string[];
  /** Persist the scene. Receives a re-validated scene. Throw to show an error. */
  onSave?: (scene: Scene) => Promise<void>;
  /** Upload to your CDN, resolve with the https URL. Without it only URLs can be pasted. */
  onUpload?: (file: File) => Promise<string>;
  maxUploadBytes?: number;
  /** Font the apps use for scene text — keeps the preview identical. */
  fontFamily?: string;
};

const DEFAULT_MAX_UPLOAD = 2 * 1024 * 1024;
const NO_ROUTES: readonly string[] = [];
const IMAGE_WIDTH_PCT = 40;

type Tab = 'properties' | 'json';

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

const NUDGE: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function SceneEditor({
  initialScene,
  palette,
  routes: routesProp,
  onSave,
  onUpload,
  maxUploadBytes,
  fontFamily,
}: SceneEditorProps) {
  const routes = routesProp ?? NO_ROUTES;
  const uploadLimit = maxUploadBytes ?? DEFAULT_MAX_UPLOAD;
  const history = useSceneHistory(initialScene ?? createScene());
  const { scene } = history;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState<Tab>('properties');

  // Derived, never synced: if undo removes the node, the selection simply disappears.
  const selected = scene.nodes.find((n) => n.id === selectedId) ?? null;
  const canAdd = scene.nodes.length < MAX_NODES;
  const session = { begin: history.beginGesture, end: history.endGesture };

  const add = (node: SceneNode) => {
    history.apply((s) => addNode(s, node));
    setSelectedId(node.id);
    setTab('properties');
  };

  const duplicate = (id: string) => {
    const source = scene.nodes.find((n) => n.id === id);
    if (!source || !canAdd) return;
    const copy = duplicateNode(source, nodeIds(scene));
    history.apply((s) => insertAfter(s, id, copy));
    setSelectedId(copy.id);
  };

  const remove = (id: string) => {
    history.apply((s) => removeNode(s, id));
    if (id === selectedId) setSelectedId(null);
  };

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    if (mod && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
      return;
    }
    if (mod && key === 'y') {
      event.preventDefault();
      history.redo();
      return;
    }
    if (!selected) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove(selected.id);
      return;
    }
    if (mod && key === 'd') {
      event.preventDefault();
      duplicate(selected.id);
      return;
    }
    if (event.key === 'Escape') {
      setSelectedId(null);
      return;
    }

    const direction = NUDGE[event.key];
    if (direction) {
      event.preventDefault();
      const step = event.shiftKey ? 1 : 0.25;
      const [dx, dy] = direction;
      history.apply((s) =>
        updateNode(s, selected.id, (n) => ({
          ...n,
          frame: clampFrame({ ...n.frame, x: n.frame.x + dx * step, y: n.frame.y + dy * step }),
        })),
      );
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="ske-root">
      <style href="scene-kit-editor" precedence="medium">
        {EDITOR_CSS}
      </style>

      <aside className="ske-panel ske-left">
        <Section title="Add">
          <AddPanel
            canAdd={canAdd}
            onUpload={onUpload}
            maxUploadBytes={uploadLimit}
            onAddText={() => add(createTextNode(nodeIds(scene)))}
            onAddButton={() => add(createButtonNode(nodeIds(scene), routes[0] ?? 'Home'))}
            onAddShape={() => add(createShapeNode(nodeIds(scene)))}
            onAddImage={(uri, aspect) => {
              const node = createImageNode(uri, { x: 0, y: 0, w: IMAGE_WIDTH_PCT, h: 10, rotation: 0 }, nodeIds(scene));
              // Height depends on the scene aspect at apply time → computed inside the (pure) recipe.
              history.apply((s) => {
                const h = heightForImage(IMAGE_WIDTH_PCT, s.aspectRatio, aspect);
                const frame = clampFrame({ x: 50 - IMAGE_WIDTH_PCT / 2, y: 50 - h / 2, w: IMAGE_WIDTH_PCT, h, rotation: 0 });
                return addNode(s, { ...node, frame });
              });
              setSelectedId(node.id);
              setTab('properties');
            }}
          />
          {!canAdd && <p className="ske-error">Limit of {MAX_NODES} layers reached.</p>}
        </Section>
        <Section title={`Layers (${scene.nodes.length})`}>
          <LayersPanel
            scene={scene}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={(id, delta) => history.apply((s) => moveNode(s, id, delta))}
            onToggleHidden={(id) => history.apply((s) => updateNode(s, id, (n) => ({ ...n, hidden: !n.hidden })))}
            onDuplicate={duplicate}
            onRemove={remove}
          />
        </Section>
      </aside>

      <main className="ske-main">
        <div className="ske-toolbar">
          <button type="button" className="ske-btn" disabled={!history.canUndo} onClick={history.undo} title="Ctrl/Cmd+Z">
            Undo
          </button>
          <button type="button" className="ske-btn" disabled={!history.canRedo} onClick={history.redo} title="Ctrl/Cmd+Shift+Z">
            Redo
          </button>
          <button type="button" className="ske-btn" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause animations' : 'Play animations'}
          </button>
          <span className="ske-muted ske-shortcuts">Drag to move · corners to resize (Shift keeps ratio) · arrows nudge</span>
        </div>
        <Canvas
          history={history}
          palette={palette}
          fontFamily={fontFamily}
          selectedId={selectedId}
          onSelect={setSelectedId}
          playing={playing}
        />
      </main>

      <aside className="ske-panel ske-right">
        <div className="ske-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'properties'} onClick={() => setTab('properties')}>
            Properties
          </button>
          <button type="button" role="tab" aria-selected={tab === 'json'} onClick={() => setTab('json')}>
            JSON
          </button>
        </div>
        {tab === 'properties' ? (
          selected ? (
            <NodeInspector
              key={selected.id}
              node={selected}
              palette={palette}
              routes={routes}
              session={session}
              onChange={(node) => history.apply((s) => replaceNode(s, node))}
            />
          ) : (
            <SceneInspector
              scene={scene}
              palette={palette}
              session={session}
              onChange={(next) => history.apply(() => next)}
            />
          )
        ) : (
          <JsonPanel
            scene={scene}
            onSave={onSave}
            onImport={(next) => {
              history.apply(() => next);
              setSelectedId(null);
            }}
          />
        )}
      </aside>
    </div>
  );
}
