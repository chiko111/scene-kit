import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { sceneForWidth, type FontMap, type PageSection, type Palette, type SceneAction } from '@chiko111/scene-kit-core/runtime';
import { SceneView } from './SceneView';
import { useInViewport } from './useInViewport';

type SliderSection = Extract<PageSection, { kind: 'slider' }>;

type Props = {
  section: SliderSection;
  width: number;
  breakpoint: number;
  palette: Palette;
  onAction?: (action: SceneAction) => void;
  interactive?: boolean;
  fontFamily?: string;
  fonts?: FontMap;
};

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const SWIPE_PX = 40;

/**
 * Hero slider. Transitions (all easeInOut = core EASING_FNS.easeInOut, over transitionMs):
 *  fade  – opacity crossfade
 *  slide – translateX by 100% of the slider width, direction follows the navigation
 *  zoom  – incoming scale 1.15 → 1 + opacity 0 → 1, outgoing opacity 1 → 0
 *  flip  – incoming rotateY 90° → 0 with perspective, outgoing opacity 1 → 0
 * Only the active slide's scene is running; each activation replays its entrances (replayKey).
 */
export function Slider({ section, width, breakpoint, palette, onAction, interactive, fontFamily, fonts }: Props) {
  const n = section.slides.length;
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [activations, setActivations] = useState<number[]>(() => section.slides.map(() => 0));
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<number | null>(null);
  const inView = useInViewport(rootRef);

  const go = (target: number, direction: 1 | -1) => {
    if (n <= 1) return;
    let t = target;
    if (t < 0 || t >= n) {
      if (!section.loop) return;
      t = (t + n) % n;
    }
    if (t === index) return;
    setPrev(index);
    setDir(direction);
    setIndex(t);
    setActivations((a) => a.map((v, i) => (i === t ? v + 1 : v)));
  };

  // the outgoing slide is removed after the transition
  useEffect(() => {
    if (prev === null) return;
    const id = setTimeout(() => setPrev(null), section.transitionMs);
    return () => clearTimeout(id);
  }, [prev, index, section.transitionMs]);

  // autoplay: only while visible, not paused, and (when not looping) until the last slide
  const canAdvance = section.loop || index < n - 1;
  useEffect(() => {
    if (section.autoplayMs <= 0 || paused || !inView || n <= 1 || !canAdvance) return;
    const id = setTimeout(() => go(index + 1, 1), section.autoplayMs);
    return () => clearTimeout(id);
    // re-armed when the slide, pause state or visibility changes (go() only depends on index)
  }, [index, paused, inView, n, canAdvance, section.autoplayMs]);

  const pause = (on: boolean) => {
    if (section.pauseOnInteraction) setPaused(on);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') go(index + 1, 1);
    else if (e.key === 'ArrowLeft') go(index - 1, -1);
    else return;
    e.preventDefault();
  };
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    swipeStart.current = e.clientX;
    if (e.pointerType !== 'mouse') pause(true);
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (e.pointerType !== 'mouse') pause(false);
    if (start === null) return;
    const dx = e.clientX - start;
    if (dx <= -SWIPE_PX) go(index + 1, 1);
    else if (dx >= SWIPE_PX) go(index - 1, -1);
  };

  const first = section.slides[0];
  const aspect = first ? sceneForWidth(first, width, breakpoint).aspectRatio : 16 / 9;
  const vars: CSSVars = {
    '--skp-t': `${section.transitionMs}ms`,
    '--skp-dot': palette[section.dotColor],
    '--skp-dot-on': palette[section.activeDotColor],
  };

  return (
    <section
      ref={rootRef}
      className="skp-section skp-slider"
      data-section-id={section.id}
      aria-roledescription="carousel"
      tabIndex={0}
      style={vars}
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => e.pointerType === 'mouse' && pause(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && pause(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
        pause(false);
      }}
    >
      <div className="skp-slider-stage" style={{ aspectRatio: aspect }}>
        {section.slides.map((slide, i) => {
          const scene = sceneForWidth(slide, width, breakpoint);
          const role = i === index ? (prev !== null ? 'in' : 'current') : i === prev ? 'out' : 'idle';
          return (
            <div
              key={slide.id}
              className="skp-slide"
              data-role={role}
              data-transition={section.transition}
              data-dir={dir === 1 ? 'next' : 'prev'}
              aria-hidden={i !== index}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${n}`}
            >
              <SceneView
                key={scene.id}
                scene={scene}
                palette={palette}
                onAction={onAction}
                interactive={interactive}
                fontFamily={fontFamily}
                fonts={fonts}
                active={i === index}
                replayKey={activations[i] ?? 0}
              />
            </div>
          );
        })}
      </div>
      {section.showArrows && n > 1 && (
        <>
          <button type="button" className="skp-arrow" data-dir="prev" aria-label="‹" disabled={!section.loop && index === 0} onClick={() => go(index - 1, -1)}>
            ‹
          </button>
          <button type="button" className="skp-arrow" data-dir="next" aria-label="›" disabled={!section.loop && index === n - 1} onClick={() => go(index + 1, 1)}>
            ›
          </button>
        </>
      )}
      {section.showDots && n > 1 && (
        <div className="skp-dots" role="tablist">
          {section.slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              className="skp-dot"
              aria-selected={i === index}
              aria-label={`${i + 1}`}
              onClick={() => go(i, i >= index ? 1 : -1)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
