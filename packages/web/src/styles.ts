/**
 * Renderer CSS. Injected once via React 19 <style href precedence> (deduplicated + hoisted).
 * Lengths use container query units: 1cqw = 1% of the scene width = 1 "u" in the schema.
 * Only transform-class properties (scale/translate/rotate) and opacity are animated → compositor only.
 */
import { MAX_EFFECT_COLORS } from '@chiko111/scene-kit-core';
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
.sk-ring{position:absolute;inset:0;box-sizing:border-box;pointer-events:none;opacity:0;border-radius:var(--sk-radius,0);border:calc(var(--sk-ring-width)*1cqw) solid var(--sk-ring-color);animation:sk-ring var(--sk-ring-duration) ease-out infinite}
.sk-fx-box{position:absolute;inset:0;box-sizing:border-box;border-radius:var(--sk-radius,0);pointer-events:none}
.sk-layer{opacity:0}
.sk-layer[data-first="true"]{opacity:1}
.sk-runner{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none}
@keyframes sk-breathe{0%{opacity:.3}50%{opacity:1}100%{opacity:.3}}
@keyframes sk-breathe-soft{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
@keyframes sk-blink-1{0%{opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes sk-run{0%{translate:0 0}25%{translate:var(--sk-rw) 0}50%{translate:var(--sk-rw) var(--sk-rh)}75%{translate:0 var(--sk-rh)}100%{translate:0 0}}
@keyframes sk-pulse{from{scale:1}to{scale:var(--sk-pulse-scale)}}
@keyframes sk-float{from{translate:0 0}to{translate:0 calc(var(--sk-float-distance)*-1cqw)}}
@keyframes sk-fade{from{opacity:0}to{opacity:var(--sk-opacity,1)}}
@keyframes sk-ring{0%{scale:1;opacity:.9}100%{scale:var(--sk-ring-spread);opacity:0}}
.sk-scene[data-running="false"] *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.sk-node,.sk-ring,.sk-fx{animation:none!important}.sk-runner{display:none}}
${cycleKeyframes(MAX_EFFECT_COLORS)}
`;
