/**
 * Page + widget CSS. Injected once via React 19 <style href precedence>.
 * Widgets are containers (container-type: inline-size): sizes use cqw (1% of the widget width) so they
 * scale like scenes, clamped to readable minimums on phones. Colors come in as CSS variables that
 * PageView/widgets fill from the palette – no colors are hard-coded except neutral shadows.
 */
export const PAGE_CSS = `
.skp-page{width:100%;display:flex;justify-content:center}
.skp-column{width:100%;display:flex;flex-direction:column}
.skp-section{position:relative;width:100%}

/* ── slider (transition easing = core easeInOut = easeInOutCubic) ── */
.skp-slider{outline:none;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.skp-slider:focus-visible{outline:2px solid var(--skp-dot-on);outline-offset:-2px}
.skp-slider-stage{position:relative;width:100%;overflow:hidden}
.skp-slide{position:absolute;inset:0;visibility:hidden}
.skp-slide[data-role="current"],.skp-slide[data-role="in"],.skp-slide[data-role="out"]{visibility:visible}
.skp-slide[data-role="current"],.skp-slide[data-role="in"]{z-index:2}
.skp-slide[data-role="out"]{z-index:1}
.skp-slide[data-role="in"],.skp-slide[data-role="out"]{animation-duration:var(--skp-t);animation-timing-function:cubic-bezier(.65,0,.35,1);animation-fill-mode:both}
.skp-slide[data-role="in"][data-transition="fade"]{animation-name:skp-fade-in}
.skp-slide[data-role="out"]:is([data-transition="fade"],[data-transition="zoom"],[data-transition="flip"]){animation-name:skp-fade-out}
.skp-slide[data-role="in"][data-transition="slide"][data-dir="next"]{animation-name:skp-from-right}
.skp-slide[data-role="in"][data-transition="slide"][data-dir="prev"]{animation-name:skp-from-left}
.skp-slide[data-role="out"][data-transition="slide"][data-dir="next"]{animation-name:skp-to-left}
.skp-slide[data-role="out"][data-transition="slide"][data-dir="prev"]{animation-name:skp-to-right}
.skp-slide[data-role="in"][data-transition="zoom"]{animation-name:skp-zoom-in}
.skp-slide[data-role="in"][data-transition="flip"]{animation-name:skp-flip-in}
@keyframes skp-fade-in{from{opacity:0}to{opacity:1}}
@keyframes skp-fade-out{from{opacity:1}to{opacity:0}}
@keyframes skp-from-right{from{translate:100% 0}to{translate:0 0}}
@keyframes skp-from-left{from{translate:-100% 0}to{translate:0 0}}
@keyframes skp-to-left{from{translate:0 0}to{translate:-100% 0}}
@keyframes skp-to-right{from{translate:0 0}to{translate:100% 0}}
@keyframes skp-zoom-in{from{opacity:0;scale:1.15}to{opacity:1;scale:1}}
@keyframes skp-flip-in{from{transform:perspective(1200px) rotateY(90deg)}to{transform:perspective(1200px) rotateY(0deg)}}
.skp-arrow{position:absolute;top:50%;translate:0 -50%;z-index:3;width:clamp(32px,4vw,52px);aspect-ratio:1;border-radius:50%;border:0;cursor:pointer;
  background:rgba(0,0,0,.35);color:#fff;font:700 clamp(20px,2.4vw,30px)/1 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.skp-arrow[data-dir="prev"]{left:clamp(6px,1.5%,24px)}
.skp-arrow[data-dir="next"]{right:clamp(6px,1.5%,24px)}
.skp-arrow:disabled{opacity:.3;cursor:default}
.skp-dots{position:absolute;left:0;right:0;bottom:clamp(8px,2.5%,28px);z-index:3;display:flex;justify-content:center;gap:8px}
.skp-dot{width:10px;height:10px;padding:0;border:0;border-radius:999px;background:var(--skp-dot);opacity:.7;cursor:pointer;transition:width .3s,background .3s,opacity .3s}
.skp-dot[aria-selected="true"]{width:28px;background:var(--skp-dot-on);opacity:1}
@media (prefers-reduced-motion:reduce){.skp-slide{animation:none!important}}

.skw{position:relative;width:100%;box-sizing:border-box;container-type:inline-size;color:var(--skw-text,#fff);background:var(--skw-bg,transparent)}
:where(.skw) *,:where(.skw) *::before,:where(.skw) *::after{box-sizing:border-box}
:where(.skw) button{font:inherit;color:inherit}
.skw-bgimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;user-select:none}
.skw-btn{appearance:none;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:filter .15s,scale .15s}
.skw-btn:active{scale:.97}
.skw-btn:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.skw-btn[aria-disabled="true"]{cursor:default}

/* ── ticket counter ── */
.skw-ticket{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,1.2cqw,24px);overflow:hidden;min-height:150px;padding:clamp(12px,2cqw,40px) 0}
.skw-ticket>*:not(.skw-bgimg){position:relative}
.skw-ticket-text{margin:0;font-weight:800;font-size:clamp(16px,2.3cqw,44px);text-align:center;text-shadow:0 .2em .6em rgba(0,0,0,.45)}
.skw-ticket-box{display:flex;align-items:center;justify-content:center;width:clamp(84px,11.5cqw,220px);aspect-ratio:1;background:center/contain no-repeat;color:var(--skw-number);text-decoration:none;padding:0}
.skw-ticket-box span{font-weight:900;font-size:clamp(28px,4.2cqw,80px);line-height:1;font-variant-numeric:tabular-nums}

/* ── calendar ── */
.skw-cal{padding:clamp(16px,3cqw,60px) clamp(8px,4cqw,80px)}
.skw-cal-title{margin:0 0 clamp(8px,1.4cqw,28px);font-weight:900;font-size:clamp(20px,3cqw,56px)}
.skw-cal-board{background:var(--skw-board);border-radius:clamp(12px,1.6cqw,32px);padding:clamp(8px,1.6cqw,32px);box-shadow:0 1.5cqw 4cqw rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12)}
.skw-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:clamp(4px,1.2cqw,24px);justify-items:center}
.skw-cal-head{font-size:clamp(9px,.9cqw,16px);font-weight:800;letter-spacing:.12em;color:var(--skw-muted);padding-bottom:clamp(4px,.8cqw,14px);text-align:center;width:100%;border-bottom:1px solid rgba(255,255,255,.12)}
.skw-cal-head[data-weekend="true"]{color:var(--skw-accent)}
.skw-day{position:relative;width:100%;max-width:clamp(44px,9.5cqw,150px);aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(1px,.25cqw,5px);padding:0;
  background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.28),transparent 55%),var(--skw-day);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 0 1.4cqw rgba(255,255,255,.12),0 .7cqw 1.4cqw -.5cqw rgba(0,0,0,.6);
  border:max(1px,.12cqw) solid rgba(255,255,255,.25);color:var(--skw-text);font-size:clamp(7px,1cqw,18px);line-height:1.05}
.skw-day[data-state="today"]{background:var(--skw-today);color:var(--skw-on-today);box-shadow:0 0 0 .3cqw rgba(255,255,255,.35),0 0 2.4cqw rgba(255,255,255,.55)}
.skw-day[data-special="true"]{border-color:var(--skw-accent);box-shadow:0 0 0 .2cqw var(--skw-accent),0 0 2cqw var(--skw-accent)}
.skw-day[data-tappable="true"]{cursor:pointer}
.skw-day[data-tappable="true"]:hover{scale:1.04}
.skw-day-num{font-weight:800;font-size:1.15em}
.skw-day-prize{font-weight:900;font-size:1.3em;color:var(--skw-accent);white-space:nowrap}
.skw-day[data-state="today"] .skw-day-prize{background:var(--skw-on-today);color:var(--skw-today);border-radius:999px;padding:.15em .55em}
.skw-day-stamp{font-weight:900;font-size:.68em;letter-spacing:.06em;border:max(1px,.1cqw) solid currentColor;border-radius:.3em;padding:.05em .35em;rotate:-6deg;opacity:.9;text-transform:uppercase}
.skw-day-chip{font-weight:900;font-size:.62em;letter-spacing:.08em;background:var(--skw-on-today);color:var(--skw-today);border-radius:999px;padding:.1em .6em;text-transform:uppercase}
.skw-day-watch{font-weight:800;font-size:.62em;background:var(--skw-accent);color:var(--skw-board);border-radius:999px;padding:.12em .7em}
.skw-day-note{font-size:.6em;opacity:.85;text-align:center;max-width:85%}
.skw-day-special{position:absolute;top:-.25em;left:50%;translate:-50% 0;font-weight:900;font-size:.55em;white-space:nowrap;background:var(--skw-accent);color:var(--skw-board);border-radius:999px;padding:.12em .6em}
.skw-day-out{font-size:clamp(8px,1cqw,18px);color:var(--skw-muted);opacity:.45;align-self:center}
.skw-day-wd{display:none}
/* phone layout (same as native): 4 days per row, weekday on each day, no header row / blank cells */
@container (max-width:560px){
  .skw-cal-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:2.6cqw}
  .skw-cal-head,.skw-cal-grid>span{display:none}
  .skw-day{max-width:none;font-size:clamp(8px,2.9cqw,14px)}
  .skw-day-wd{display:inline}
}

/* ── draw videos ── */
.skw-draws{display:flex;flex-direction:column;align-items:center;gap:clamp(12px,2cqw,40px);padding:clamp(20px,3cqw,60px) clamp(12px,4cqw,80px)}
.skw-draws-nav{display:flex;align-items:center;gap:clamp(10px,2cqw,40px);background:var(--skw-card);border-radius:999px;padding:clamp(6px,.8cqw,16px) clamp(8px,1cqw,20px);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1cqw 2.5cqw rgba(0,0,0,.35)}
.skw-round{width:clamp(30px,3cqw,56px);aspect-ratio:1;border-radius:50%;background:var(--skw-text,#fff);color:var(--skw-card,var(--skw-bg,#000));display:grid;place-items:center;font-size:clamp(14px,1.6cqw,28px);font-weight:900;line-height:1}
.skw-round:disabled{opacity:.35;cursor:default}
.skw-draws-date{display:flex;flex-direction:column;align-items:center;min-width:clamp(150px,18cqw,340px)}
.skw-draws-label{font-size:clamp(8px,.75cqw,14px);font-weight:800;letter-spacing:.2em;color:var(--skw-muted);text-transform:uppercase}
.skw-draws-value{font-size:clamp(20px,2.6cqw,52px);font-weight:900;font-variant-numeric:tabular-nums;line-height:1.1}
.skw-draws-meta{display:flex;align-items:center;gap:.5em;font-size:clamp(10px,.85cqw,16px);color:var(--skw-muted)}
.skw-chip{background:var(--skw-accent);color:var(--skw-on-accent);border-radius:999px;padding:.05em .6em;font-weight:900;font-size:.85em;text-transform:uppercase}
.skw-draws-card{position:relative;width:min(100%,clamp(280px,48cqw,960px));aspect-ratio:16/9;border-radius:clamp(10px,1.2cqw,24px);overflow:hidden;background:var(--skw-card);border:1px solid rgba(255,255,255,.14);box-shadow:0 2cqw 5cqw rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,1cqw,20px);text-align:center;padding:4%}
.skw-draws-card video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}
.skw-draws-icon{width:clamp(22px,2.2cqw,44px);aspect-ratio:1;border-radius:50%;border:2px solid var(--skw-muted);position:relative;opacity:.8}
.skw-draws-icon::before{content:"";position:absolute;left:50%;top:22%;width:2px;height:32%;background:var(--skw-muted);translate:-50% 0}
.skw-draws-icon::after{content:"";position:absolute;left:50%;top:50%;width:26%;height:2px;background:var(--skw-muted)}
.skw-draws-msg{margin:0;font-weight:700;font-size:clamp(12px,1.1cqw,22px);max-width:90%}
.skw-draws-count{font-weight:900;font-size:clamp(26px,3.4cqw,68px);font-variant-numeric:tabular-nums;letter-spacing:.06em}
.skw-draws-badge{position:absolute;left:3%;bottom:5%;background:var(--skw-accent);color:var(--skw-on-accent);font-weight:900;font-size:clamp(9px,.8cqw,15px);border-radius:.4em;padding:.15em .5em;z-index:1}
.skw-back{background:transparent;border:1px solid var(--skw-muted);color:var(--skw-text);border-radius:999px;padding:.5em 1.2em;font-weight:800;font-size:clamp(11px,.9cqw,17px)}

/* ── game carousel ── */
.skw-games{overflow:hidden;padding:clamp(24px,3.5cqw,70px) 0;display:flex;flex-direction:column;align-items:center;gap:clamp(10px,1.6cqw,32px)}
.skw-games>*:not(.skw-bgimg){position:relative}
.skw-games-title{margin:0;font-weight:900;letter-spacing:.04em;font-size:clamp(20px,3cqw,60px);text-align:center;text-shadow:0 .2em .6em rgba(0,0,0,.4)}
.skw-games-stage{position:relative;width:100%}
.skw-games-track{display:flex;gap:clamp(8px,1.4cqw,28px);overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:clamp(18px,2.4cqw,48px) calc(50% - clamp(55px,7cqw,140px));scroll-behavior:smooth}
.skw-games-track::-webkit-scrollbar{display:none}
.skw-game{position:relative;flex:none;width:clamp(110px,14cqw,280px);scroll-snap-align:center;display:flex;flex-direction:column;align-items:center;gap:.6em;padding:0;background:none;transition:scale .3s,opacity .3s;opacity:.7;scale:.88}
.skw-game[data-active="true"]{opacity:1;scale:1.08}
.skw-game img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:clamp(8px,.9cqw,18px);box-shadow:0 1cqw 2.4cqw rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.25)}
.skw-game[data-active="true"] img{border-color:var(--skw-accent)}
.skw-game .skw-game-badge{position:absolute;top:-6%;right:-8%;width:38%;height:auto;aspect-ratio:auto;object-fit:contain;border:0;box-shadow:none;border-radius:0;pointer-events:none;filter:drop-shadow(0 .3em .5em rgba(0,0,0,.5))}
.skw-game-name{font-weight:800;font-size:clamp(11px,.95cqw,18px);text-align:center}
.skw-game-play{background:var(--skw-accent);color:var(--skw-on-accent);border-radius:999px;padding:.35em 1.2em;font-weight:900;font-size:clamp(11px,.9cqw,17px);margin-top:-1.6em;box-shadow:0 .4em 1em rgba(0,0,0,.4)}
.skw-arrow{position:absolute;top:50%;translate:0 -50%;z-index:2}
.skw-arrow[data-dir="prev"]{left:clamp(6px,1.5cqw,30px)}
.skw-arrow[data-dir="next"]{right:clamp(6px,1.5cqw,30px)}
.skw-games-foot{display:flex;align-items:center;gap:1em;flex-wrap:wrap;justify-content:center;font-weight:800;font-size:clamp(11px,1cqw,19px);letter-spacing:.04em}
.skw-cta{background:var(--skw-accent);color:var(--skw-on-accent);border-radius:999px;padding:.7em 1.6em;font-weight:900;letter-spacing:.06em;box-shadow:0 .5em 1.4em rgba(0,0,0,.35)}

/* ── terms ── */
.skw-terms{padding:clamp(16px,2.5cqw,50px) clamp(12px,3cqw,60px)}
.skw-terms-title{margin:0 0 .8em;font-weight:900;font-size:clamp(15px,1.3cqw,26px)}
.skw-terms-card{background:var(--skw-card);border-radius:clamp(10px,1cqw,20px);padding:clamp(14px,1.8cqw,36px);font-size:clamp(13px,.95cqw,18px);line-height:1.55;position:relative}
.skw-terms-card[data-open="false"] .skw-terms-body{max-height:none;-webkit-mask-image:linear-gradient(#000 60%,transparent);mask-image:linear-gradient(#000 60%,transparent)}
.skw-terms-body h4{margin:.9em 0 .4em;font-size:1.1em}
.skw-terms-body p{margin:.5em 0}
.skw-terms-body ol,.skw-terms-body ul{margin:.4em 0;padding-left:1.6em}
.skw-terms-body li{margin:.25em 0}
.skw-link{appearance:none;background:none;border:0;padding:0;font:inherit;color:var(--skw-accent);text-decoration:underline;cursor:pointer}
.skw-link[aria-disabled="true"]{cursor:default}
.skw-terms-toggle{display:block;margin:1em auto 0;background:none;color:var(--skw-accent);font-weight:900;letter-spacing:.04em;font-size:.9em;text-transform:uppercase}
`;
