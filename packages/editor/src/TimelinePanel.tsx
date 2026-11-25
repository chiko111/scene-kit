import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { EffectType, Scene, SceneNode } from '@chiko111/scene-kit-core';
import type { SceneHistory } from './history';
import { updateNode } from './sceneOps';
import { removeKeyframe, type Timeline } from './timelineOps';
import {
  addKeyframeAt,
  barsForNode,
  effectLabel,
  formatTime,
  moveBar,
  moveKeyframe,
  resizeBar,
  rulerTicks,
  sceneLength,
  snap,
  timelessEffects,
  type Bar,
} from './timelinePanelOps';

const NAME_W = 210;
const STORAGE_KEY = 'scene-kit-editor:timeline-panel';
const MIN_H = 120;
const MAX_H = 640;
const HEAD_H = 38;

const TYPE_ICON: Record<SceneNode['type'], string> = { image: '▣', text: 'T', button: '◉', shape: '■', lottie: '✦', countdown: '◷' };

type Stored = { open: boolean; height: number };

/** A quarter of the window (150–240 px): laptops keep a big canvas, large screens see more rows. */
const defaultHeight = () => (typeof window === 'undefined' ? 220 : Math.round(Math.min(240, Math.max(150, window.innerHeight * 0.25))));

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Stored>;
      return {
        open: v.open !== false,
        height: typeof v.height === 'number' ? Math.min(MAX_H, Math.max(MIN_H, v.height)) : defaultHeight(),
      };
    }
  } catch {
    // storage blocked – defaults
  }
  return { open: true, height: defaultHeight() };
}

/** Pauses every CSS animation of the live preview and puts it at `ms` since the scene started. */
function seekPreview(root: Element | null, ms: number) {
  if (!root || typeof root.getAnimations !== 'function') return;
  for (const animation of root.getAnimations({ subtree: true })) {
    animation.pause();
    animation.currentTime = ms;
  }
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

type Props = {
  scene: Scene;
  history: SceneHistory;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The live preview's scene element (scrubbing seeks its animations). */
  getPreview: () => Element | null;
  /** Bumped when the preview restarts (Replay entrances): the panel hands control back to the live preview. */
  replayKey: number;
  /** Bar / keyframe clicked: select the layer and show that effect in the Inspector. */
  onFocusEffect: (nodeId: string, effect: EffectType, keyframe?: number) => void;
  /** Height the panel takes (so the canvas can make room). */
  onHeight?: (px: number) => void;
  /** Layer tools in each row (the timeline is also the layer list). */
  onToggleHidden?: (id: string) => void;
  onMove?: (id: string, delta: 1 | -1) => void;
  onDuplicate?: (id: string) => void;
  onRemove?: (id: string) => void;
  /** "+" on a row: open the Animation tab for that layer. */
  onAddAnimation?: (id: string) => void;
};

/** Rough label width (px) at 11px – decides whether a bar's label fits inside it. */
const labelWidth = (text: string) => text.length * 6.3 + 16;

type SelectedKeyframe = { nodeId: string; index: number };

/**
 * Slider Revolution–style timeline: one row per layer, its animations as bars on a shared time axis,
 * a playhead that scrubs the real preview, and drag / resize editing.
 */
export function TimelinePanel({
  scene,
  history,
  selectedId,
  onSelect,
  getPreview,
  replayKey,
  onFocusEffect,
  onHeight,
  onToggleHidden,
  onMove,
  onDuplicate,
  onRemove,
  onAddAnimation,
}: Props) {
  const [stored] = useState(readStored);
  const [open, setOpen] = useState(stored.open);
  const [height, setHeight] = useState(stored.height);
  const [zoom, setZoom] = useState<number | null>(null); // px per second, null = fit
  const [bodyWidth, setBodyWidth] = useState(800);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  // false = the preview plays by itself; true = the playhead drives it
  const [controlled, setControlled] = useState(false);
  const [selKf, setSelKf] = useState<SelectedKeyframe | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // scale is frozen while dragging, so 'Fit' doesn't rescale the axis under the cursor
  const [lockedPx, setLockedPx] = useState<number | null>(null);
  const [seenReplay, setSeenReplay] = useState(replayKey);
  const bodyRef = useRef<HTMLDivElement>(null);
  const live = useRef({ length: 3000, loop: false, t: 0 });

  // "Replay entrances" restarts the preview → let it play by itself again
  if (seenReplay !== replayKey) {
    setSeenReplay(replayKey);
    setControlled(false);
    setPlaying(false);
    setT(0);
  }

  const length = sceneLength(scene.nodes);
  const fitPx = Math.max(40, (bodyWidth - NAME_W - 24) / (length / 1000));
  const pxPerSec = lockedPx ?? zoom ?? fitPx;
  const px = (ms: number) => (ms / 1000) * pxPerSec;
  const toMs = (dx: number) => (dx / pxPerSec) * 1000;
  const trackW = px(length);
  const rows = [...scene.nodes].reverse(); // top of the list = drawn on top (like the Layers panel)

  useEffect(() => {
    live.current = { length, loop, t };
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ open, height }));
    } catch {
      // ignore
    }
    onHeight?.(open ? height : HEAD_H);
  }, [open, height, onHeight]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setBodyWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  // keep the preview at the playhead after every edit / remount
  useEffect(() => {
    if (!controlled || playing) return;
    const id = requestAnimationFrame(() => seekPreview(getPreview(), t));
    return () => cancelAnimationFrame(id);
  }, [controlled, playing, t, scene, getPreview]);

  // play: our own clock drives the (paused) animations every frame → always in sync, survives remounts
  useEffect(() => {
    if (!playing) return;
    let start = performance.now() - live.current.t;
    let raf = 0;
    const tick = () => {
      let now = performance.now() - start;
      const { length: total, loop: looping } = live.current;
      if (now >= total) {
        if (looping) {
          start = performance.now();
          now = 0;
        } else {
          seekPreview(getPreview(), total);
          setT(total);
          setPlaying(false);
          return;
        }
      }
      seekPreview(getPreview(), now);
      setT(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, getPreview]);

  const togglePlay = () => {
    setControlled(true);
    if (!playing && live.current.t >= live.current.length) setT(0);
    setPlaying((p) => !p);
  };
  const stop = () => {
    setPlaying(false);
    setControlled(true);
    setT(0);
  };
  const seekTo = (ms: number) => {
    const clamped = Math.min(length, Math.max(0, ms));
    setPlaying(false);
    setControlled(true);
    setT(clamped);
    seekPreview(getPreview(), clamped);
  };

  // keyboard: Space play/pause, Home = 0, Delete removes the selected keyframe (before the editor deletes the layer)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      if (event.key === ' ' && open) {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'Home' && open) {
        event.preventDefault();
        seekTo(0);
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selKf) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const { nodeId, index } = selKf;
        history.apply((s) =>
          updateNode(s, nodeId, (n) => ({
            ...n,
            effects: n.effects.map((e) => (e.type === 'timeline' ? removeKeyframe(e, index) : e)),
          })),
        );
        setSelKf(null);
      } else if (event.key === 'Escape') {
        setSelKf(null);
        setMenuFor(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  /** Shared drag plumbing: one undo step per gesture, a plain click if the pointer barely moved. */
  const drag = (
    event: ReactPointerEvent<HTMLElement>,
    onMove: (dxPx: number, fine: boolean) => void,
    onClick?: () => void,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const target = event.currentTarget;
    const x0 = event.clientX;
    let moved = false;
    let finished = false;
    target.setPointerCapture(event.pointerId);
    history.beginGesture();
    setLockedPx(pxPerSec);
    const move = (e: PointerEvent) => {
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) < 3) return;
      moved = true;
      onMove(dx, e.altKey);
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', finish);
      target.removeEventListener('pointercancel', finish);
      target.removeEventListener('lostpointercapture', finish);
      history.endGesture();
      setLockedPx(null);
      if (!moved) onClick?.();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', finish);
    target.addEventListener('pointercancel', finish);
    target.addEventListener('lostpointercapture', finish);
  };

  const editEffect = (nodeId: string, type: EffectType, edit: (node: SceneNode) => SceneNode['effects'][number]) =>
    history.apply((s) =>
      updateNode(s, nodeId, (n) => {
        const current = n.effects.find((e) => e.type === type);
        if (!current) return n;
        const next = edit(n);
        return next === current ? n : { ...n, effects: n.effects.map((e) => (e.type === type ? next : e)) };
      }),
    );

  const startBarMove = (event: ReactPointerEvent<HTMLElement>, node: SceneNode, bar: Bar) => {
    onSelect(node.id);
    drag(
      event,
      (dx, fine) => {
        if (!bar.movable) return;
        const start = Math.max(0, snap(bar.start + toMs(dx), fine ? 10 : 50));
        editEffect(node.id, bar.effect, (n) => moveBar(n.effects.find((e) => e.type === bar.effect) as SceneNode['effects'][number], start));
      },
      () => {
        setSelKf(null);
        onFocusEffect(node.id, bar.effect);
      },
    );
  };

  const startBarResize = (event: ReactPointerEvent<HTMLElement>, node: SceneNode, bar: Bar) => {
    onSelect(node.id);
    drag(event, (dx, fine) => {
      const end = Math.max(bar.start + 10, snap(bar.end + toMs(dx), fine ? 10 : 50));
      editEffect(node.id, bar.effect, (n) => resizeBar(n.effects.find((e) => e.type === bar.effect) as SceneNode['effects'][number], end, n));
    });
  };

  const startDiamond = (event: ReactPointerEvent<HTMLElement>, node: SceneNode, bar: Bar, index: number) => {
    onSelect(node.id);
    const abs = bar.keyframes?.[index] ?? 0;
    drag(
      event,
      (dx, fine) => {
        if (index === 0) return;
        const at = snap(abs + toMs(dx), fine ? 10 : 50) - bar.start;
        editEffect(node.id, 'timeline', (n) => moveKeyframe(n.effects.find((e) => e.type === 'timeline') as Timeline, index, at));
        setSelKf({ nodeId: node.id, index });
      },
      () => {
        setSelKf({ nodeId: node.id, index });
        onFocusEffect(node.id, 'timeline', index);
      },
    );
  };

  const addKeyframeOnBar = (event: ReactMouseEvent<HTMLElement>, node: SceneNode, bar: Bar) => {
    if (bar.kind !== 'timeline') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const at = snap(toMs(event.clientX - rect.left), event.altKey ? 10 : 50);
    const tl = node.effects.find((e) => e.type === 'timeline') as Timeline | undefined;
    if (!tl) return;
    const { timeline, index } = addKeyframeAt(tl, at);
    if (index < 0) return;
    history.apply((s) => updateNode(s, node.id, (n) => ({ ...n, effects: n.effects.map((e) => (e.type === 'timeline' ? timeline : e)) })));
    setSelKf({ nodeId: node.id, index });
    onFocusEffect(node.id, 'timeline', index);
  };

  const startRuler = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const target = event.currentTarget;
    const at = (clientX: number) => snap(toMs(clientX - rect.left), 10);
    seekTo(at(event.clientX));
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => seekTo(at(e.clientX));
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('lostpointercapture', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('lostpointercapture', up);
  };

  const startResizePanel = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    const y0 = event.clientY;
    const h0 = height;
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => setHeight(Math.min(MAX_H, Math.max(MIN_H, h0 - (e.clientY - y0))));
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('lostpointercapture', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('lostpointercapture', up);
  };

  // the row menu closes on any click outside it
  useEffect(() => {
    if (!menuFor) return;
    const onDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.ske-tlp-menu, .ske-tlp-tools')) setMenuFor(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuFor]);

  const zoomBy = (factor: number) => setZoom(Math.min(2000, Math.max(20, pxPerSec * factor)));

  return (
    <section className="ske-tlp" data-open={open} style={{ height: open ? height : HEAD_H }} aria-label="Timeline">
      {open && <div className="ske-tlp-grip" onPointerDown={startResizePanel} title="Drag to resize" />}
      <div className="ske-tlp-head">
        <button type="button" className="ske-icon-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={open ? 'Collapse timeline' : 'Expand timeline'}>
          {open ? '▾' : '▸'} <strong>Layers &amp; timeline</strong>
        </button>
        <button type="button" className="ske-btn ske-btn-small" onClick={togglePlay} aria-label={playing ? 'Pause timeline' : 'Play timeline'} title="Space">
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="ske-btn ske-btn-small" onClick={stop} aria-label="Stop timeline" title="Home">
          ■
        </button>
        <span className="ske-tlp-time" data-testid="tl-time">
          {formatTime(t)} <span className="ske-muted">/ {formatTime(length)}</span>
        </span>
        <button type="button" className="ske-btn ske-btn-small" aria-pressed={loop} onClick={() => setLoop((l) => !l)} title="Loop the preview">
          ↻ Loop
        </button>
        <span className="ske-tlp-spacer" />
        {controlled && <span className="ske-tlp-mode" title="The preview follows the playhead. “Replay” above the canvas returns to the live preview.">Scrubbing</span>}
        <button type="button" className="ske-btn ske-btn-small" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="ske-btn ske-btn-small" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="ske-btn ske-btn-small" aria-pressed={zoom === null} onClick={() => setZoom(null)}>
          Fit
        </button>
      </div>

      {open && (
        <div className="ske-tlp-body" ref={bodyRef}>
          <div className="ske-tlp-grid" style={{ width: NAME_W + trackW + 16 }}>
            <div className="ske-tlp-row ske-tlp-ruler-row">
              <div className="ske-tlp-name ske-tlp-corner">
                <span className="ske-muted">Layers (top = in front)</span>
              </div>
              <div className="ske-tlp-ruler" style={{ width: trackW }} onPointerDown={startRuler} data-testid="tl-ruler">
                {rulerTicks(length).map((tick) => (
                  <span key={tick.ms} className={tick.major ? 'ske-tlp-tick is-major' : 'ske-tlp-tick'} style={{ left: px(tick.ms) }}>
                    {tick.major && <em>{tick.ms / 1000}s</em>}
                  </span>
                ))}
              </div>
            </div>

            {rows.length === 0 && <p className="ske-muted ske-tlp-empty">No layers yet. Add one with the buttons above the canvas.</p>}
            {rows.map((node) => {
              const bars = barsForNode(node);
              const timeless = timelessEffects(node);
              const isSel = node.id === selectedId;
              const index = scene.nodes.indexOf(node);
              return (
                <div key={node.id} className={isSel ? 'ske-tlp-row is-selected' : 'ske-tlp-row'} data-hidden={node.hidden} data-testid={`tl-row-${node.id}`}>
                  <div className="ske-tlp-name">
                    <button type="button" className="ske-tlp-layer" onClick={() => onSelect(node.id)} title={node.name}>
                      <span className="ske-tlp-icon">{TYPE_ICON[node.type]}</span>
                      <span className="ske-tlp-label">{node.name}</span>
                      {node.hidden && <span className="ske-badge">off</span>}
                      {node.startHidden && <span className="ske-badge">hidden</span>}
                    </button>
                    <span className="ske-tlp-tools">
                      {onToggleHidden && (
                        <button type="button" className="ske-icon-btn" aria-label={node.hidden ? `Show ${node.name}` : `Hide ${node.name}`} title={node.hidden ? 'Show' : 'Hide'} onClick={() => onToggleHidden(node.id)}>
                          {node.hidden ? '◌' : '●'}
                        </button>
                      )}
                      {onAddAnimation && (
                        <button type="button" className="ske-icon-btn ske-tlp-add" aria-label={`Animate ${node.name}`} title="Add animation" onClick={() => onAddAnimation(node.id)}>
                          +
                        </button>
                      )}
                      {(onMove || onDuplicate || onRemove) && (
                        <button
                          type="button"
                          className="ske-icon-btn"
                          aria-label={`More for ${node.name}`}
                          aria-expanded={menuFor === node.id}
                          title="Order, duplicate, delete"
                          onClick={() => setMenuFor((m) => (m === node.id ? null : node.id))}
                        >
                          ⋯
                        </button>
                      )}
                    </span>
                    {menuFor === node.id && (
                      <div className="ske-tlp-menu" role="menu">
                        {onMove && (
                          <>
                            <button type="button" role="menuitem" disabled={index === scene.nodes.length - 1} onClick={() => { onMove(node.id, 1); setMenuFor(null); }}>
                              Bring forward
                            </button>
                            <button type="button" role="menuitem" disabled={index === 0} onClick={() => { onMove(node.id, -1); setMenuFor(null); }}>
                              Send backward
                            </button>
                          </>
                        )}
                        {onDuplicate && (
                          <button type="button" role="menuitem" onClick={() => { onDuplicate(node.id); setMenuFor(null); }}>
                            Duplicate
                          </button>
                        )}
                        {onRemove && (
                          <>
                            <hr />
                            <button type="button" role="menuitem" className="is-danger" onClick={() => { onRemove(node.id); setMenuFor(null); }}>
                              Delete layer
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ske-tlp-track" style={{ width: trackW }}>
                    {bars.map((bar) => {
                      const left = px(bar.start);
                      const full = Math.max(6, px(bar.end - bar.start));
                      // longer than the axis (e.g. a 14 s slow zoom): drawn to the end; zoom out to reach its edge
                      const clipped = left + full > trackW + 1;
                      const width = clipped ? Math.max(6, trackW - left) : full;
                      const outside = !clipped && width < labelWidth(bar.label);
                      return (
                        <div key={bar.effect} className="ske-tlp-lane">
                          {bar.repeats && !clipped && (
                            <span className="ske-tlp-repeat" data-kind={bar.kind} style={{ left: left + width, width: Math.max(0, trackW - left - width) }} />
                          )}
                          <div
                            className="ske-tlp-bar"
                            data-kind={bar.kind}
                            data-movable={bar.movable}
                            data-clipped={clipped || undefined}
                            data-testid={`tl-bar-${node.id}-${bar.effect}`}
                            style={{ left, width }}
                            title={`${bar.label}: ${formatTime(bar.start)} → ${formatTime(bar.end)}${bar.movable ? ' · drag to move' : ''} · drag the right edge to change the length${bar.kind === 'timeline' ? ' · double-click to add a keyframe' : ''}`}
                            onPointerDown={(e) => startBarMove(e, node, bar)}
                            onDoubleClick={(e) => addKeyframeOnBar(e, node, bar)}
                          >
                            <span className={outside ? 'ske-tlp-bar-label is-outside' : 'ske-tlp-bar-label'}>{bar.label}{clipped ? ' →' : ''}</span>
                            {bar.keyframes?.map((abs, i) => (
                              <span
                                key={i}
                                className={selKf && selKf.nodeId === node.id && selKf.index === i ? 'ske-tlp-kf is-selected' : 'ske-tlp-kf'}
                                data-testid={`tl-kf-${node.id}-${i}`}
                                style={{ left: px(abs - bar.start) }}
                                title={`Keyframe ${i + 1} · ${formatTime(abs - bar.start)}${i === 0 ? ' (start)' : ' · drag to move · Delete removes'}`}
                                onPointerDown={(e) => startDiamond(e, node, bar, i)}
                                onDoubleClick={(e) => e.stopPropagation()}
                              />
                            ))}
                            {bar.resizable && !clipped && (
                              <span
                                className="ske-tlp-edge"
                                data-testid={`tl-edge-${node.id}-${bar.effect}`}
                                onPointerDown={(e) => startBarResize(e, node, bar)}
                                title="Drag to change the length"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {timeless.length > 0 && (
                      <span className="ske-tlp-timeless" title={timeless.map(effectLabel).join(', ')}>
                        {timeless.map((type) => (type === 'parallax' ? '⇅' : '◌')).join(' ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="ske-tlp-playhead" style={{ left: NAME_W + px(t) }} data-testid="tl-playhead" />
          </div>
        </div>
      )}
    </section>
  );
}
