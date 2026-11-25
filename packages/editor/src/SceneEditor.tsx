import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  MAX_NODES,
  createButtonNode,
  createCountdownNode,
  createImageNode,
  createLottieNode,
  createScene,
  createShapeNode,
  createTextNode,
  duplicateNode,
  heightForImage,
  type FontMap,
  type Palette,
  type EffectType,
  type Scene,
  type SceneNode,
} from '@chiko111/scene-kit-core';
import { AddPanel } from './AddPanel';
import { Canvas } from './Canvas';
import { AnimationTab } from './AnimationTab';
import { useSceneHistory, type SceneHistory } from './history';
import { InteractionInspector, NodeInspector, SceneInspector } from './Inspector';
import { JsonPanel } from './JsonPanel';
import { BUILT_IN_PRESETS, loadStoredPresets, storePresets, type AnimationPreset } from './presets';
import { addNode, clampFrame, insertAfter, moveNode, nodeIds, removeNode, replaceNode, updateNode } from './sceneOps';
import { EDITOR_CSS } from './styles';
import { TimelinePanel } from './TimelinePanel';

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
  /** Selectable fonts: key stored in the scene → CSS font-family loaded in the back office. Same keys as the apps. */
  fonts?: FontMap;
  /**
   * Controlled mode: edit a scene that lives in a bigger document (e.g. a page section).
   * The editor then uses this history (shared undo stack) instead of its own; `initialScene` is ignored.
   * Create one with `focusSceneHistory()`. Key the editor by the scene's identity when switching scenes.
   */
  history?: SceneHistory;
  /**
   * Saved animation presets (besides the built-in ones). With `onSavePreset` the host persists them;
   * without it they are kept in this browser's localStorage.
   */
  presets?: readonly AnimationPreset[];
  onSavePreset?: (preset: AnimationPreset) => void;
  /** Show technical tools (JSON tab, scene id, exact aspect ratio). Default true. */
  advanced?: boolean;
};

const DEFAULT_MAX_UPLOAD = 2 * 1024 * 1024;
const NO_ROUTES: readonly string[] = [];
const IMAGE_WIDTH_PCT = 40;

type Tab = 'style' | 'animation' | 'interaction' | 'json';

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
  fonts,
  history: controlled,
  presets: hostPresets,
  onSavePreset,
  advanced: advancedProp,
}: SceneEditorProps) {
  const advanced = advancedProp ?? true;
  const routes = routesProp ?? NO_ROUTES;
  const uploadLimit = maxUploadBytes ?? DEFAULT_MAX_UPLOAD;
  const own = useSceneHistory(initialScene ?? createScene());
  const history = controlled ?? own;
  const { scene } = history;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  // Bumped to remount the preview so entrance animations play again.
  const [replayKey, setReplayKey] = useState(0);
  const [tab, setTab] = useState<Tab>('style');
  // timeline panel: a click on a bar / keyframe focuses that effect in the Inspector
  const [focus, setFocus] = useState<{ nodeId: string; effect: EffectType; keyframe?: number; nonce: number } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
  const getPreview = useCallback(() => rootRef.current?.querySelector('.ske-canvas .sk-scene') ?? null, []);
  const focusEffect = (nodeId: string, effect: EffectType, keyframe?: number) => {
    setSelectedId(nodeId);
    setTab('animation');
    setFocus((f) => ({ nodeId, effect, keyframe, nonce: (f?.nonce ?? 0) + 1 }));
  };
  // user presets: from the host, else this browser's storage (read once)
  const [storedPresets, setStoredPresets] = useState<AnimationPreset[]>(() => (hostPresets ? [] : loadStoredPresets()));
  const allPresets: AnimationPreset[] = [...BUILT_IN_PRESETS, ...(hostPresets ?? storedPresets)];
  const savePreset = (preset: AnimationPreset) => {
    if (onSavePreset) {
      onSavePreset(preset);
      return;
    }
    const next = [...storedPresets, preset];
    setStoredPresets(next);
    storePresets(next);
  };

  // Derived, never synced: if undo removes the node, the selection simply disappears.
  const selected = scene.nodes.find((n) => n.id === selectedId) ?? null;
  const canAdd = scene.nodes.length < MAX_NODES;
  const session = { begin: history.beginGesture, end: history.endGesture };

  const add = (node: SceneNode) => {
    history.apply((s) => addNode(s, node));
    setSelectedId(node.id);
    setTab('style');
  };

  const duplicate = (id: string) => {
    const source = scene.nodes.find((n) => n.id === id);
    if (!source || !canAdd) return;
    const copy = duplicateNode(source, nodeIds(scene));
    history.apply((s) => insertAfter(s, id, copy));
    setSelectedId(copy.id);
  };

  const toggleHidden = (id: string) => history.apply((s) => updateNode(s, id, (n) => ({ ...n, hidden: !n.hidden })));
  const animate = (id: string) => {
    setSelectedId(id);
    setTab('animation');
  };
  const activeTab: Tab = tab === 'json' && !advanced ? 'style' : tab;

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

  const tabs: { id: Tab; label: string }[] = [
    ...(selected
      ? [
          { id: 'style' as const, label: 'Style' },
          { id: 'animation' as const, label: 'Animation' },
          { id: 'interaction' as const, label: 'Interaction' },
        ]
      : [{ id: 'style' as const, label: 'Scene' }]),
    ...(advanced ? [{ id: 'json' as const, label: 'JSON' }] : []),
  ];
  const shownTab: Tab = !selected && (activeTab === 'animation' || activeTab === 'interaction') ? 'style' : activeTab;

  return (
    <div className="ske-root" ref={rootRef}>
      <style href="scene-kit-editor" precedence="medium">
        {EDITOR_CSS}
      </style>

      <main className="ske-main">
        <div className="ske-toolbar">
          <AddPanel
            canAdd={canAdd}
            onUpload={onUpload}
            maxUploadBytes={uploadLimit}
            onAddText={() => add(createTextNode(nodeIds(scene)))}
            onAddButton={() => add(createButtonNode(nodeIds(scene), routes[0] ?? 'Home'))}
            onAddShape={() => add(createShapeNode(nodeIds(scene)))}
            onAddCountdown={() => {
              const end = new Date(Date.now() + 7 * 86400000);
              const p2 = (n: number) => String(n).padStart(2, '0');
              add(createCountdownNode(`${end.getFullYear()}-${p2(end.getMonth() + 1)}-${p2(end.getDate())}`, 'Europe/Sofia', nodeIds(scene)));
            }}
            onAddLottie={(uri) => add(createLottieNode(uri, nodeIds(scene)))}
            onAddImage={(uri, aspect) => {
              const node = createImageNode(uri, { x: 0, y: 0, w: IMAGE_WIDTH_PCT, h: 10, rotation: 0 }, nodeIds(scene));
              // Height depends on the scene aspect at apply time → computed inside the (pure) recipe.
              history.apply((s) => {
                const h = heightForImage(IMAGE_WIDTH_PCT, s.aspectRatio, aspect);
                const frame = clampFrame({ x: 50 - IMAGE_WIDTH_PCT / 2, y: 50 - h / 2, w: IMAGE_WIDTH_PCT, h, rotation: 0 });
                return addNode(s, { ...node, frame });
              });
              setSelectedId(node.id);
              setTab('style');
            }}
          />
          {!canAdd && <span className="ske-error">Limit of {MAX_NODES} layers reached.</span>}
          <span className="ske-spacer" />
          <button type="button" className="ske-btn" onClick={() => setReplayKey((k) => k + 1)} title="Play the entrance animations again">
            ↻ Replay
          </button>
          <button
            type="button"
            className="ske-btn"
            aria-pressed={!playing}
            onClick={() => {
              if (!playing) setReplayKey((k) => k + 1);
              setPlaying((p) => !p);
            }}
          >
            {playing ? 'Pause animations' : 'Play animations'}
          </button>
          {!controlled && (
            <>
              <span className="ske-sep" />
              <button type="button" className="ske-btn" disabled={!history.canUndo} onClick={history.undo} title="Ctrl/Cmd+Z">
                Undo
              </button>
              <button type="button" className="ske-btn" disabled={!history.canRedo} onClick={history.redo} title="Ctrl/Cmd+Shift+Z">
                Redo
              </button>
            </>
          )}
          <span
            className="ske-help"
            title={'Drag a layer to move it, drag a corner to resize (Shift keeps the ratio).\nArrows nudge, Shift+arrows nudge more.\nDelete removes, Ctrl/Cmd+D duplicates, Ctrl/Cmd+Z undoes.\nTimeline: Space plays, drag bars to change timing.'}
            aria-label="Keyboard and mouse shortcuts"
          >
            ?
          </span>
        </div>
        <Canvas
          history={history}
          palette={palette}
          fontFamily={fontFamily}
          fonts={fonts}
          selectedId={selectedId}
          onSelect={setSelectedId}
          playing={playing}
          replayKey={replayKey}
        />
        <TimelinePanel
          scene={scene}
          history={history}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getPreview={getPreview}
          replayKey={replayKey}
          onFocusEffect={focusEffect}
          onToggleHidden={toggleHidden}
          onMove={(id, delta) => history.apply((s) => moveNode(s, id, delta))}
          onDuplicate={duplicate}
          onRemove={remove}
          onAddAnimation={animate}
        />
      </main>

      <aside className="ske-panel ske-right">
        <div className="ske-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={shownTab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {shownTab === 'json' ? (
          <JsonPanel
            scene={scene}
            onSave={onSave}
            onImport={(next) => {
              history.apply(() => next);
              setSelectedId(null);
            }}
          />
        ) : !selected ? (
          <SceneInspector scene={scene} palette={palette} session={session} advanced={advanced} onChange={(next) => history.apply(() => next)} />
        ) : shownTab === 'animation' ? (
          <AnimationTab
            key={selected.id}
            node={selected}
            palette={palette}
            fonts={fonts}
            fontFamily={fontFamily}
            session={session}
            presets={allPresets}
            onSavePreset={savePreset}
            focus={focus && focus.nodeId === selected.id ? focus : null}
            onChange={(node) => history.apply((s) => replaceNode(s, node))}
          />
        ) : shownTab === 'interaction' ? (
          <InteractionInspector
            key={selected.id}
            node={selected}
            palette={palette}
            routes={routes}
            session={session}
            layers={scene.nodes}
            onChange={(node) => history.apply((s) => replaceNode(s, node))}
          />
        ) : (
          <NodeInspector
            key={selected.id}
            node={selected}
            palette={palette}
            routes={routes}
            fonts={fonts}
            session={session}
            onChange={(node) => history.apply((s) => replaceNode(s, node))}
          />
        )}
      </aside>
    </div>
  );
}
