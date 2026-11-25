/**
 * Renderer CSS. Injected once via React 19 <style href precedence> (deduplicated + hoisted).
 * Lengths use container query units: 1cqw = 1% of the scene width = 1 "u" in the schema.
 * Only transform-class properties (scale/translate/rotate) and opacity are animated → compositor only.
 */
import { MAX_EFFECT_COLORS } from '@chiko111/scene-kit-core/runtime';
import { cycleKeyframes } from './effects';

export const SCENE_CSS = `
.sk-frame{display:flex;justify-content:center;align-items:center;width:100%}
.sk-frame[data-fit="contain"]{height:100%;container-type:size}
.sk-scene{position:relative;flex:none;overflow:hidden;container-type:inline-size;isolation:isolate}
.sk-node{position:absolute;box-sizing:border-box;opacity:var(--sk-opacity,1)}
.sk-content{position:absolute;inset:0;box-sizing:border-box;border-radius:var(--sk-radius,0)}
.sk-img{display:block;width:100%;height:100%;user-select:none;-webkit-user-drag:none;pointer-events:none}
.sk-text{display:flex;align-items:center;margin:0;line-height:1.15;white-space:pre-wrap;overflow-wrap:anywhere}
.sk-text>span{flex:1}
.sk-btn{appearance:none;border:0;margin:0;padding:0 .6em;font:inherit;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.1;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:filter .12s}
.sk-btn:active{filter:brightness(.9)}
.sk-btn:focus-visible{outline:.4cqw solid currentColor;outline-offset:.4cqw}
.sk-btn[aria-disabled="true"]{cursor:default}
.sk-loop{position:absolute;inset:0;border-radius:var(--sk-radius,0)}
.sk-node[data-enter="wait"]{opacity:0}
.sk-node{transition:filter .4s cubic-bezier(.65,0,.35,1)}
.sk-node[data-vis="off"]{filter:opacity(0);pointer-events:none}
.sk-trigger{cursor:pointer;-webkit-tap-highlight-color:transparent}
.sk-trigger:focus-visible{outline:.4cqw solid #fff;outline-offset:.2cqw}
.sk-par{position:absolute;inset:0;pointer-events:none}
.sk-par>.sk-node{pointer-events:auto}
.sk-kb{position:absolute;inset:0}
.sk-node[data-hover] .sk-content:not(.sk-fx){transition:scale var(--sk-h-ms) ease,translate var(--sk-h-ms) ease,filter var(--sk-h-ms) ease}
.sk-node[data-hover]:is(:hover,:focus-within,:active) .sk-content:not(.sk-fx){scale:var(--sk-h-scale);translate:0 calc(var(--sk-h-lift)*-1cqw);filter:brightness(var(--sk-h-bright)) drop-shadow(0 0 calc(var(--sk-h-blur)*1cqw) var(--sk-h-glow))}
@media (hover:none){.sk-node[data-hover]:hover:not(:active) .sk-content:not(.sk-fx){scale:1;translate:0 0;filter:none}}
.sk-lottie{pointer-events:none}
.sk-lottie svg{display:block}
.sk-countdown{font-variant-numeric:tabular-nums;white-space:nowrap}
.sk-word{display:inline-block;white-space:nowrap}
.sk-piece{display:inline-block;white-space:pre}
.sk-split[data-split="wait"] .sk-piece{opacity:0}
.sk-tap{cursor:pointer;-webkit-tap-highlight-color:transparent}
.sk-tap:focus-visible{outline:.4cqw solid #fff;outline-offset:.2cqw}
.sk-ring{position:absolute;inset:0;box-sizing:border-box;pointer-events:none;opacity:0;border-radius:var(--sk-radius,0);border:calc(var(--sk-ring-width)*1cqw) solid var(--sk-ring-color);animation:sk-ring var(--sk-ring-duration) ease-out infinite}
.sk-fx-box{position:absolute;inset:0;box-sizing:border-box;border-radius:var(--sk-radius,0);pointer-events:none}
.sk-layer{opacity:0}
.sk-layer[data-first="true"]{opacity:1}
.sk-runner{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none}
@keyframes sk-focus-in{from{opacity:0}to{opacity:1}}
@keyframes sk-sharp-breathe{0%{opacity:1}50%{opacity:0}100%{opacity:1}}
@keyframes sk-breathe{0%{opacity:.3}50%{opacity:1}100%{opacity:.3}}
@keyframes sk-breathe-soft{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
@keyframes sk-blink-1{0%{opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes sk-run{0%{translate:0 0}25%{translate:var(--sk-rw) 0}50%{translate:var(--sk-rw) var(--sk-rh)}75%{translate:0 var(--sk-rh)}100%{translate:0 0}}
@keyframes sk-pulse{from{scale:1}to{scale:var(--sk-pulse-scale)}}
@keyframes sk-float{from{translate:0 0}to{translate:0 calc(var(--sk-float-distance)*-1cqw)}}
@keyframes sk-wiggle{0%{rotate:0deg}25%{rotate:calc(var(--sk-wiggle)*1deg)}75%{rotate:calc(var(--sk-wiggle)*-1deg)}100%{rotate:0deg}}
@keyframes sk-spin{from{rotate:0deg}to{rotate:360deg}}
@keyframes sk-enter{from{opacity:0;translate:var(--sk-enter-x) var(--sk-enter-y);scale:var(--sk-enter-scale);transform:perspective(60cqw) rotateX(var(--sk-enter-rx))}to{opacity:var(--sk-opacity,1);translate:0 0;scale:1;transform:perspective(60cqw) rotateX(0deg)}}
@keyframes sk-piece{from{opacity:0;translate:var(--sk-enter-x) var(--sk-enter-y);scale:var(--sk-enter-scale);transform:perspective(60cqw) rotateX(var(--sk-enter-rx))}to{opacity:1;translate:0 0;scale:1;transform:perspective(60cqw) rotateX(0deg)}}
@keyframes sk-kb{from{scale:var(--sk-kb-fs);translate:var(--sk-kb-fx) var(--sk-kb-fy)}to{scale:var(--sk-kb-ts);translate:var(--sk-kb-tx) var(--sk-kb-ty)}}
@keyframes sk-fade{from{opacity:0}to{opacity:var(--sk-opacity,1)}}
@keyframes sk-ring{0%{scale:1;opacity:.9}100%{scale:var(--sk-ring-spread);opacity:0}}
.sk-scene[data-running="false"] *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.sk-node,.sk-loop,.sk-ring,.sk-fx,.sk-piece,.sk-kb{animation:none!important}.sk-node[data-enter="wait"]{opacity:var(--sk-opacity,1)}.sk-split[data-split="wait"] .sk-piece{opacity:1}.sk-par{translate:none!important}.sk-runner{display:none}}
${cycleKeyframes(MAX_EFFECT_COLORS)}
`;
