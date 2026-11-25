import { use, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { BorderRunners, EdgeLayers, GlowLayers, ImageContourGlow, TextGlowLayers } from './effects';
import {
  ENTER_FROM,
  findEffect,
  formatCountdownText,
  nodeRadius,
  resolveFont,
  secondsUntil,
  toBoxShadow,
  withAlpha,
  zonedNow,
  type EffectOf,
  type EnterPreset,
  type FontMap,
  type NodeOf,
  type Palette,
  type SceneAction,
  type SceneNode,
  resolveAsset,
} from '@chiko111/scene-kit-core/runtime';
import { loadLottie } from './lottieLoader';
import { SceneEnvContext } from './sceneEnv';
import { timelineAnimation, timelineKeyframesCss, timelineName } from './timeline';

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

type Props = {
  node: SceneNode;
  palette: Palette;
  /** scene.aspectRatio — needed to know the node's height in "u" */
  aspectRatio: number;
  fonts: FontMap | undefined;
  interactive: boolean;
  onAction: ((action: SceneAction) => void) | undefined;
  /** The scene has been on screen at least once → entrance animations may play. */
  entered: boolean;
  /** Scene is visible and active (lottie plays, countdown ticks). Defaults to true. */
  running?: boolean;
  /** Trigger visibility override: false = faded out (startHidden / hide trigger). Defaults to visible. */
  visible?: boolean;
  /** Runs this node's triggers (only passed when it has some). */
  onTrigger?: () => void;
};

const cqw = (u: number) => `${u}cqw`;
const delay = (ms: number | undefined) => (ms ? ` ${ms}ms` : ' 0ms');
/** Same curves as core EASING_FNS: 'out' = easeOutCubic-ish, 'back' = overshoot 1.70158. */
const ENTER_EASING = { out: 'cubic-bezier(.2,.75,.25,1)', back: 'cubic-bezier(.34,1.56,.64,1)' } as const;

function enterVars(preset: EnterPreset): CSSVars {
  const from = ENTER_FROM[preset];
  return {
    '--sk-enter-x': cqw(from.x),
    '--sk-enter-y': cqw(from.y),
    '--sk-enter-scale': from.scale,
    '--sk-enter-rx': `${from.rotateX}deg`,
  };
}

/** Loop animations (pulse / float / wiggle / spin) + their CSS variables. */
function loopStyle(node: SceneNode): { vars: CSSVars; animations: string[] } {
  const { effects } = node;
  const vars: CSSVars = {};
  const animations: string[] = [];

  const pulse = findEffect(effects, 'pulse');
  if (pulse) {
    vars['--sk-pulse-scale'] = pulse.scale;
    animations.push(`sk-pulse ${pulse.durationMs}ms ease-in-out${delay(pulse.delayMs)} infinite alternate`);
  }
  const float = findEffect(effects, 'float');
  if (float) {
    vars['--sk-float-distance'] = float.distance;
    animations.push(`sk-float ${float.durationMs}ms ease-in-out${delay(float.delayMs)} infinite alternate`);
  }
  const wiggle = findEffect(effects, 'wiggle');
  if (wiggle) {
    vars['--sk-wiggle'] = wiggle.angle;
    animations.push(`sk-wiggle ${wiggle.durationMs}ms ease-in-out${delay(wiggle.delayMs)} infinite`);
  }
  const spin = findEffect(effects, 'spin');
  if (spin) {
    animations.push(`sk-spin ${spin.durationMs}ms linear infinite${spin.direction === 'ccw' ? ' reverse' : ''}`);
  }
  return { vars, animations };
}

type Entrance =
  | { kind: 'timeline'; effect: EffectOf<'timeline'>; name: string; css: string }
  | { kind: 'enter'; effect: EffectOf<'enter'> }
  | null;

/** A timeline wins over `enter` when a layer has both (the timeline describes the entrance itself). */
function entranceOf(node: SceneNode): Entrance {
  const timeline = findEffect(node.effects, 'timeline');
  if (timeline) {
    const name = timelineName(timeline, node.frame.rotation, node.opacity);
    return { kind: 'timeline', effect: timeline, name, css: timelineKeyframesCss(name, timeline, node.frame.rotation, node.opacity) };
  }
  const enter = findEffect(node.effects, 'enter');
  return enter ? { kind: 'enter', effect: enter } : null;
}

/**
 * Outer node: frame, rotation, opacity, fadeIn + entrance (enter or timeline).
 * Composition: when a node has an entrance, its loops run on an inner `.sk-loop` wrapper, so the entrance
 * (on the outer box) and the loops (on the inner box) never animate the same property of one element.
 * Without an entrance everything stays on the outer node, exactly as before.
 */
function nodeStyle(node: SceneNode, entered: boolean, entrance: Entrance, palette: Palette): CSSVars {
  const { frame, effects } = node;
  const radius = nodeRadius(node);
  const animations: string[] = [];
  const style: CSSVars = {
    left: `${frame.x}%`,
    top: `${frame.y}%`,
    width: `${frame.w}%`,
    height: `${frame.h}%`,
    rotate: frame.rotation ? `${frame.rotation}deg` : undefined,
    '--sk-opacity': node.opacity,
    '--sk-radius': radius === 'ellipse' ? '50%' : cqw(radius),
  };
  // hover / press highlight (see .sk-node[data-hover] in styles.ts)
  if (node.hover) {
    const h = node.hover;
    style['--sk-h-scale'] = h.scale;
    style['--sk-h-lift'] = h.lift;
    style['--sk-h-bright'] = h.brightness;
    style['--sk-h-ms'] = `${h.durationMs}ms`;
    style['--sk-h-glow'] = h.glow ? withAlpha(palette[h.glow.color], h.glow.opacity) : 'transparent';
    style['--sk-h-blur'] = h.glow ? h.glow.blur : 0;
  }

  if (!entrance) {
    const loops = loopStyle(node);
    Object.assign(style, loops.vars);
    animations.push(...loops.animations);
  }

  const fadeIn = findEffect(effects, 'fadeIn');
  if (fadeIn) animations.push(`sk-fade ${fadeIn.durationMs}ms ease-out ${fadeIn.delayMs}ms both`);

  if (entrance?.kind === 'enter') {
    Object.assign(style, enterVars(entrance.effect.preset));
    if (entered) {
      const easing = ENTER_EASING[ENTER_FROM[entrance.effect.preset].easing];
      animations.push(`sk-enter ${entrance.effect.durationMs}ms ${easing} ${entrance.effect.delayMs}ms both`);
    }
  } else if (entrance?.kind === 'timeline' && entered) {
    animations.push(timelineAnimation(entrance.name, entrance.effect));
  }

  if (animations.length > 0) style.animation = animations.join(', ');
  return style;
}

function ringStyle(node: SceneNode, palette: Palette): CSSVars | null {
  const ring = findEffect(node.effects, 'outlinePulse');
  if (!ring) return null;
  return {
    '--sk-ring-width': ring.width,
    '--sk-ring-color': palette[ring.color],
    '--sk-ring-spread': ring.spread,
    '--sk-ring-duration': `${ring.durationMs}ms`,
  };
}

/* ───────────── split text ───────────── */

type SplitToken =
  | { kind: 'space'; text: string }
  | { kind: 'word'; pieces: { text: string; index: number }[] };

/**
 * Pieces = characters (grouped per word so words never break) or words. Whitespace stays plain text,
 * so wrapping looks like the unsplit text. Piece i (whitespace NOT counted, characters counted with
 * Array.from) starts at delayMs + i · staggerMs.
 */
export function splitTokens(text: string, by: 'char' | 'word'): SplitToken[] {
  const tokens: SplitToken[] = [];
  let index = 0;
  for (const part of text.split(/(\s+)/)) {
    if (part === '') continue;
    if (/^\s+$/.test(part)) {
      tokens.push({ kind: 'space', text: part });
      continue;
    }
    const chars = by === 'word' ? [part] : Array.from(part);
    tokens.push({ kind: 'word', pieces: chars.map((c, k) => ({ text: c, index: index + k })) });
    index += chars.length;
  }
  return tokens;
}

function SplitText({ text, effect, entered }: { text: string; effect: EffectOf<'splitText'>; entered: boolean }) {
  const easing = ENTER_EASING[ENTER_FROM[effect.preset].easing];
  const vars = enterVars(effect.preset);
  const pieceStyle = (i: number): CSSVars =>
    entered ? { ...vars, animation: `sk-piece ${effect.durationMs}ms ${easing} ${effect.delayMs + i * effect.staggerMs}ms both` } : vars;
  return (
    <span className="sk-split" data-split={entered ? 'play' : 'wait'} aria-label={text}>
      {splitTokens(text, effect.by).map((token, t) =>
        token.kind === 'space' ? (
          token.text
        ) : (
          <span key={t} className="sk-word" aria-hidden>
            {token.pieces.map((p) => (
              <span key={p.index} className="sk-piece" style={pieceStyle(p.index)}>
                {p.text}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}

/* ───────────── lottie ───────────── */

type LottieItem = { play(): void; pause(): void; destroy(): void; setSpeed(s: number): void; goToAndStop(v: number, f?: boolean): void; addEventListener(n: string, cb: () => void): void };

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** lottie-web (light SVG player) is loaded only when a scene contains a lottie layer. */
function LottieLayer({ node, running }: { node: NodeOf<'lottie'>; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const item = useRef<LottieItem | null>(null);
  const runningRef = useRef(running);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    runningRef.current = running;
    const anim = item.current;
    if (!anim) return;
    if (running && !reducedMotion()) anim.play();
    else anim.pause();
  }, [running]);

  useEffect(() => {
    let cancelled = false;
    let anim: LottieItem | null = null;
    setFailed(false);
    loadLottie()
      .then((lottie) => {
        const container = ref.current;
        if (cancelled || !container) return;
        anim = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: node.loop,
          autoplay: false,
          path: resolveAsset(node.uri),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        }) as unknown as LottieItem;
        anim.setSpeed(node.speed);
        anim.addEventListener('data_failed', () => setFailed(true));
        anim.addEventListener('DOMLoaded', () => {
          if (!anim) return;
          if (reducedMotion()) anim.goToAndStop(0, true);
          else if (runningRef.current) anim.play();
        });
        item.current = anim;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      anim?.destroy();
      item.current = null;
    };
  }, [node.uri, node.loop, node.speed]);

  return <div ref={ref} className="sk-content sk-lottie" role="img" aria-label={node.alt || undefined} data-failed={failed} />;
}

/* ───────────── countdown ───────────── */

function CountdownText({ node, running, palette, fonts }: { node: NodeOf<'countdown'>; running: boolean; palette: Palette; fonts: FontMap | undefined }) {
  const env = use(SceneEnvContext);
  const [time, setTime] = useState(() => env.now());
  useEffect(() => {
    if (!running) return;
    setTime(env.now());
    const id = setInterval(() => setTime(env.now()), 1000);
    return () => clearInterval(id);
  }, [running, env]);

  const seconds = secondsUntil(node.endDate, node.endTime, zonedNow(time, node.timeZone));
  const text = seconds > 0 ? formatCountdownText(seconds, node.format, node.labels) : node.endedText || formatCountdownText(0, node.format, node.labels);
  return (
    <p
      className="sk-content sk-text sk-countdown"
      role="timer"
      style={{
        color: palette[node.color],
        fontFamily: resolveFont(fonts, node.font),
        fontSize: cqw(node.fontSize),
        fontWeight: Number(node.weight),
        textAlign: node.align,
        textShadow: node.shadow
          ? `${cqw(node.shadow.x)} ${cqw(node.shadow.y)} ${cqw(node.shadow.blur)} ${withAlpha(palette[node.shadow.color], node.shadow.opacity)}`
          : undefined,
      }}
    >
      <span>{text}</span>
    </p>
  );
}

/* ───────────── content ───────────── */

type ContentProps = Omit<Props, 'aspectRatio' | 'visible' | 'onTrigger'> & { running: boolean; hasTriggers: boolean };

function Content({ node, palette, fonts, interactive, onAction, entered, running, hasTriggers }: ContentProps): ReactNode {
  const shadow = toBoxShadow(node.shadow, palette, cqw);

  switch (node.type) {
    case 'image': {
      const blur = findEffect(node.effects, 'blur');
      const kenBurns = findEffect(node.effects, 'kenBurns');
      const sharpAnimation =
        blur?.mode === 'focusIn'
          ? `sk-focus-in ${blur.durationMs}ms ease-out both`
          : blur?.mode === 'breathe'
            ? `sk-sharp-breathe ${blur.durationMs * 2}ms ease-in-out infinite`
            : undefined;
      const tap = node.action && interactive && onAction ? node.action : null;
      const fire = tap && onAction ? () => onAction(tap) : undefined;
      // with triggers the whole node is the button; the image only fires its action on click
      const linkProps = node.action
        ? hasTriggers
          ? { onClick: fire }
          : {
              role: 'button' as const,
              'aria-label': node.alt || undefined,
              'aria-disabled': !fire,
              tabIndex: interactive ? 0 : -1,
              onClick: fire,
              onKeyDown: fire
                ? (e: KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fire();
                    }
                  }
                : undefined,
            }
        : {};
      const imgs = (
        <>
          {blur && (
            <img
              className="sk-img sk-fx-box"
              src={resolveAsset(node.uri)}
              alt=""
              aria-hidden
              draggable={false}
              decoding="async"
              loading="lazy"
              style={{ objectFit: node.fit, filter: `blur(${cqw(blur.amount)})` }}
            />
          )}
          {blur?.mode !== 'static' && (
            <img
              className={blur ? 'sk-img sk-fx-box sk-fx' : 'sk-img'}
              src={resolveAsset(node.uri)}
              alt={node.alt}
              draggable={false}
              decoding="async"
              loading="lazy"
              style={{ objectFit: node.fit, animation: sharpAnimation }}
            />
          )}
        </>
      );
      return (
        <div
          className={node.action ? 'sk-content sk-tap' : 'sk-content'}
          style={{ boxShadow: shadow, overflow: 'hidden' }}
          {...linkProps}
        >
          {kenBurns ? (
            <div
              className="sk-kb"
              style={
                {
                  '--sk-kb-fs': kenBurns.fromScale,
                  '--sk-kb-ts': kenBurns.toScale,
                  '--sk-kb-fx': `${kenBurns.fromX}%`,
                  '--sk-kb-fy': `${kenBurns.fromY}%`,
                  '--sk-kb-tx': `${kenBurns.toX}%`,
                  '--sk-kb-ty': `${kenBurns.toY}%`,
                  animation: `sk-kb ${kenBurns.durationMs}ms cubic-bezier(.65,0,.35,1) ${kenBurns.mode === 'once' ? '1' : 'infinite alternate'} both`,
                } as CSSVars
              }
            >
              {imgs}
            </div>
          ) : (
            imgs
          )}
        </div>
      );
    }

    case 'text': {
      const split = findEffect(node.effects, 'splitText');
      const textShadow = node.shadow
        ? `${cqw(node.shadow.x)} ${cqw(node.shadow.y)} ${cqw(node.shadow.blur)} ${withAlpha(
            palette[node.shadow.color],
            node.shadow.opacity,
          )}`
        : undefined;
      return (
        <p
          className="sk-content sk-text"
          style={{
            color: palette[node.color],
            fontFamily: resolveFont(fonts, node.font),
            fontSize: cqw(node.fontSize),
            fontWeight: Number(node.weight),
            textAlign: node.align,
            textShadow,
          }}
        >
          {split ? <SplitText text={node.text} effect={split} entered={entered} /> : <span>{node.text}</span>}
        </p>
      );
    }

    case 'button': {
      const enabled = interactive && onAction !== undefined;
      return (
        <button
          type="button"
          className="sk-content sk-btn"
          aria-disabled={!enabled}
          tabIndex={interactive && !hasTriggers ? 0 : -1}
          onClick={enabled ? () => onAction(node.action) : undefined}
          style={{
            background: palette[node.bg],
            color: palette[node.fg],
            fontFamily: resolveFont(fonts, node.font),
            fontSize: cqw(node.fontSize),
            fontWeight: Number(node.weight),
            boxShadow: shadow,
          }}
        >
          {node.label}
        </button>
      );
    }

    case 'shape':
      return <div className="sk-content" style={{ background: palette[node.fill], boxShadow: shadow }} />;

    case 'lottie':
      return <LottieLayer node={node} running={running} />;

    case 'countdown':
      return <CountdownText node={node} running={running} palette={palette} fonts={fonts} />;
  }
}

/* ───────────── node ───────────── */

export function NodeView(props: Props) {
  const { node, palette, aspectRatio, fonts, entered, onTrigger } = props;
  const running = props.running ?? true;
  const env = use(SceneEnvContext);
  const ring = ringStyle(node, palette);
  const entrance = entranceOf(node);
  const hasTriggers = onTrigger !== undefined;

  const layers = (
    <>
      {node.type === 'text' ? (
        <TextGlowLayers node={node} palette={palette} fontFamily={resolveFont(fonts, node.font)} />
      ) : node.type === 'image' && findEffect(node.effects, 'glow')?.contour ? (
        <ImageContourGlow node={node} palette={palette} />
      ) : (
        <GlowLayers effects={node.effects} palette={palette} />
      )}
      <Content {...props} running={running} hasTriggers={hasTriggers} />
      <EdgeLayers effects={node.effects} palette={palette} />
      <BorderRunners
        effects={node.effects}
        palette={palette}
        width={node.frame.w}
        height={node.frame.h / aspectRatio}
      />
      {ring && <div className="sk-ring" style={ring} aria-hidden />}
    </>
  );

  // triggers: the whole node is the button; triggers run first (capture), then the content's own action
  const triggerProps = onTrigger
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': ('alt' in node && node.alt) || node.name || undefined,
        onClickCapture: () => onTrigger(),
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          onTrigger();
          const action = node.type === 'image' || node.type === 'button' ? node.action : undefined;
          if (action && props.interactive && props.onAction) props.onAction(action);
        },
      }
    : {};
  const common = {
    className: onTrigger ? 'sk-node sk-trigger' : 'sk-node',
    'data-node-id': node.id,
    'data-vis': props.visible === false ? 'off' : undefined,
    'data-hover': node.hover ? '' : undefined,
    ...triggerProps,
  };

  let element: ReactNode;
  if (!entrance) {
    element = (
      <div {...common} style={nodeStyle(node, entered, null, props.palette)}>
        {layers}
      </div>
    );
  } else {
    const loops = loopStyle(node);
    const loopBox: CSSVars = { ...loops.vars };
    if (loops.animations.length > 0) loopBox.animation = loops.animations.join(', ');
    element = (
      <div {...common} data-enter={entered ? 'play' : 'wait'} style={nodeStyle(node, entered, entrance, props.palette)}>
        {entrance.kind === 'timeline' && (
          <style href={entrance.name} precedence="medium">
            {entrance.css}
          </style>
        )}
        <div className="sk-loop" style={loopBox}>
          {layers}
        </div>
      </div>
    );
  }

  // parallax: a full-scene wrapper moved by the scene's offset from the viewport centre (PageView only)
  const parallax = env.parallax ? findEffect(node.effects, 'parallax') : undefined;
  if (parallax) {
    return (
      <div className="sk-par" style={{ translate: `0 calc(var(--sk-par-off, 0px) * ${-parallax.depth * 0.3})` }}>
        {element}
      </div>
    );
  }
  return element;
}
