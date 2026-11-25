/** Editor chrome only (the scene itself is styled by @chiko111/scene-kit-web). Override the --ske-* vars to theme it. */
export const EDITOR_CSS = `
.ske-root{
  --ske-bg:#0f1115;--ske-panel:#171a21;--ske-raised:#1f2430;--ske-line:#2b3140;
  --ske-text:#e7e9ee;--ske-muted:#8b93a7;--ske-accent:#4f8cff;--ske-danger:#ff5c6c;--ske-ok:#3ecf8e;
  --ske-checker:#242936;
  display:grid;grid-template-columns:minmax(0,1fr) 340px;height:100%;min-height:600px;
  background:var(--ske-bg);color:var(--ske-text);font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif
}
.ske-root *,.ske-root *::before,.ske-root *::after{box-sizing:border-box}
.ske-panel{background:var(--ske-panel);overflow-y:auto;min-height:0}
.ske-left{border-right:1px solid var(--ske-line)}
.ske-right{border-left:1px solid var(--ske-line)}
.ske-main{display:flex;flex-direction:column;min-width:0;min-height:0}
.ske-section{border-bottom:1px solid var(--ske-line);padding:12px}
.ske-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.ske-section-head h3{margin:0;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ske-muted)}
.ske-section-body{display:flex;flex-direction:column;gap:8px}
.ske-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ske-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ske-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.ske-field>label{font-size:11px;color:var(--ske-muted)}
.ske-field-wide{grid-column:1/-1}
.ske-root input[type=text],.ske-root input[type=number],.ske-root input[type=url],.ske-root select,.ske-root textarea{
  width:100%;background:var(--ske-raised);color:var(--ske-text);border:1px solid var(--ske-line);border-radius:6px;padding:6px 8px;font:inherit
}
.ske-root textarea{resize:vertical}
.ske-root input:focus,.ske-root select:focus,.ske-root textarea:focus{outline:2px solid var(--ske-accent);outline-offset:-1px}
.ske-root [aria-invalid=true]{border-color:var(--ske-danger)}
.ske-color{display:flex;align-items:flex-end;gap:6px;min-width:0}
.ske-color .ske-field{flex:1}
.ske-swatch{flex:none;width:28px;height:30px;border-radius:6px;border:1px solid var(--ske-line)}
.ske-check{display:flex;align-items:center;gap:6px;cursor:pointer}
.ske-btn{background:var(--ske-raised);color:var(--ske-text);border:1px solid var(--ske-line);border-radius:6px;padding:6px 10px;font:inherit;cursor:pointer}
.ske-btn:hover:not(:disabled){border-color:var(--ske-accent)}
.ske-btn:disabled{opacity:.45;cursor:not-allowed}
.ske-btn[aria-pressed=true]{border-color:var(--ske-accent)}
.ske-btn-primary{background:var(--ske-accent);border-color:var(--ske-accent);color:#fff}
.ske-btn-small{padding:3px 8px;font-size:12px}
.ske-icon-btn{background:none;border:0;color:var(--ske-muted);cursor:pointer;padding:2px 5px;border-radius:4px;font:inherit}
.ske-icon-btn:hover:not(:disabled){color:var(--ske-text);background:var(--ske-raised)}
.ske-icon-btn:disabled{opacity:.3;cursor:not-allowed}
.ske-icon-btn.is-danger:hover{color:var(--ske-danger)}
.ske-muted{color:var(--ske-muted);margin:0}
.ske-hint{color:var(--ske-muted);font-size:11px}
.ske-hint.is-error,.ske-error{color:var(--ske-danger);margin:0}
.ske-ok{color:var(--ske-ok);margin:0}
.ske-add{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ske-upload,.ske-import{display:flex;flex-direction:column;gap:6px}
.ske-layers{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.ske-layer{display:flex;align-items:center;border-radius:6px}
.ske-layer.is-selected{background:var(--ske-raised);outline:1px solid var(--ske-accent)}
.ske-layer-name{flex:1;min-width:0;display:flex;gap:8px;align-items:center;background:none;border:0;color:inherit;font:inherit;text-align:left;padding:6px;cursor:pointer}
.ske-layer-name>span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ske-layer-name .is-hidden{opacity:.45;text-decoration:line-through}
.ske-layer-icon{width:16px;text-align:center;color:var(--ske-muted)}
.ske-layer-tools{display:flex;flex:none}
.ske-toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--ske-line);background:var(--ske-panel)}
.ske-shortcuts{margin-left:auto;font-size:11px}
.ske-spacer{flex:1}
.ske-sep{width:1px;align-self:stretch;background:var(--ske-line);margin:0 4px}
.ske-help{cursor:help;color:var(--ske-muted);border:1px solid var(--ske-line);border-radius:999px;width:22px;height:22px;display:inline-grid;place-items:center;font-size:12px}
.ske-pop{position:relative}
.ske-pop>summary{list-style:none}
.ske-pop>summary::-webkit-details-marker{display:none}
.ske-pop[open]>summary{border-color:var(--ske-accent)}
.ske-pop-body{position:absolute;top:calc(100% + 6px);left:0;z-index:30;width:300px;display:flex;flex-direction:column;gap:6px;background:var(--ske-raised);border:1px solid var(--ske-line);border-radius:10px;padding:10px;box-shadow:0 14px 40px rgba(0,0,0,.5)}
.ske-pop-body input{background:var(--ske-panel)!important}
.ske-stage{flex:1;min-height:160px;overflow:hidden;display:grid;place-items:center;container-type:size;
  background-color:var(--ske-bg);background-image:conic-gradient(var(--ske-checker) 25%,transparent 0 50%,var(--ske-checker) 0 75%,transparent 0);background-size:24px 24px}
/* the canvas takes all the room the stage has, keeping the scene's aspect ratio */
.ske-canvas{position:relative;width:min(calc(100cqw - 40px),calc((100cqh - 40px) * var(--ske-ar)));box-shadow:0 0 0 1px var(--ske-line),0 12px 40px rgba(0,0,0,.4)}
.ske-overlay{position:absolute;inset:0;touch-action:none}
.ske-box{position:absolute;cursor:move;outline:1px dashed transparent}
.ske-box:hover{outline-color:rgba(79,140,255,.6)}
.ske-box.is-selected{outline:2px solid var(--ske-accent)}
.ske-handle{position:absolute;width:12px;height:12px;background:#fff;border:2px solid var(--ske-accent);border-radius:3px}
.ske-handle-nw{left:-7px;top:-7px;cursor:nwse-resize}
.ske-handle-ne{right:-7px;top:-7px;cursor:nesw-resize}
.ske-handle-sw{left:-7px;bottom:-7px;cursor:nesw-resize}
.ske-handle-se{right:-7px;bottom:-7px;cursor:nwse-resize}
.ske-tabs{display:flex;border-bottom:1px solid var(--ske-line);position:sticky;top:0;background:var(--ske-panel);z-index:1}
.ske-tabs button{flex:1;font-weight:600;background:none;border:0;border-bottom:2px solid transparent;color:var(--ske-muted);padding:10px;font:inherit;cursor:pointer}
.ske-tabs button[aria-selected=true]{color:var(--ske-text);border-bottom-color:var(--ske-accent)}
.ske-effect{background:var(--ske-raised);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:8px}
.ske-effect.is-focused{box-shadow:0 0 0 2px var(--ske-accent)}
.ske-effect-head{display:flex;justify-content:space-between;align-items:center}
.ske-json{padding:12px;display:flex;flex-direction:column;gap:10px}
.ske-code{font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
.ske-warnings{margin:0;padding-left:16px;color:var(--ske-muted);font-size:12px}
.ske-right>p.ske-muted{padding:12px}
.ske-colors{display:flex;flex-direction:column;gap:4px}
.ske-colors-label{font-size:11px;color:var(--ske-muted)}
.ske-colors-row{display:flex;align-items:flex-end;gap:4px}
.ske-colors-row .ske-color{flex:1}
.ske-badge{font-size:10px;line-height:1;padding:2px 5px;border-radius:999px;background:var(--ske-line);color:var(--ske-muted);margin-left:4px;white-space:nowrap}
.ske-badge.is-accent{background:var(--ske-accent);color:#fff}
.ske-sub{display:block;font-size:12px;margin:6px 0 4px}
.ske-trigger{display:grid;grid-template-columns:1fr 1.4fr auto;gap:6px;align-items:end;margin-bottom:6px}
.ske-preset-row{align-items:flex-end;flex-wrap:wrap}
.ske-preset-row input{flex:1;min-width:120px}
.ske-range label{display:flex;flex-direction:column;gap:4px;font-size:12px}
.ske-timeline{display:flex;flex-direction:column;gap:8px}
.ske-tl-strip{display:block;max-width:100%;overflow:visible}
.ske-tl-axis{stroke:var(--ske-line);stroke-width:2}
.ske-tl-head{stroke:var(--ske-accent);stroke-width:2}
.ske-tl-dot{fill:var(--ske-muted);cursor:pointer}
.ske-tl-dot.is-open{fill:var(--ske-accent)}
.ske-tl-scrub{display:flex;flex-direction:column;gap:2px;font-size:12px}
.ske-tl-stage{position:relative;height:84px;border:1px dashed var(--ske-line);border-radius:6px;overflow:hidden;display:grid;place-items:center;background:repeating-conic-gradient(rgba(127,127,127,.12) 0 25%,transparent 0 50%) 0 0/16px 16px}
.ske-tl-ghost{width:56px;height:42px;display:grid;place-items:center;transform-origin:center;background:var(--ske-accent);color:#fff;border-radius:4px;font-weight:700;font-size:12px}
.ske-tl-ghost img{width:100%;height:100%;object-fit:contain}
.ske-tl-ghost:has(img){background:transparent}
.ske-tl-tabs{display:flex;flex-wrap:wrap;gap:4px}
.ske-tl-tabs [aria-selected="true"]{outline:2px solid var(--ske-accent)}
.ske-right-empty{padding:12px}
.ske-presets{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ske-preset{position:relative;display:flex;flex-direction:column;padding:0;overflow:hidden;text-align:left;background:var(--ske-raised);border:1px solid var(--ske-line);border-radius:10px;color:inherit;font:inherit;cursor:pointer}
.ske-preset:hover{border-color:var(--ske-accent)}
.ske-preset:focus-visible{outline:2px solid var(--ske-accent);outline-offset:1px}
.ske-preset.is-applied{border-color:var(--ske-ok)}
.ske-preset-stage{position:relative;aspect-ratio:2.2/1;overflow:hidden;background:#0b0d12;pointer-events:none}
.ske-preset-stage>*{position:absolute;inset:0}
.ske-preset-name{display:flex;justify-content:space-between;gap:4px;padding:6px 8px;font-size:12px;font-weight:600}
.ske-preset-name em{font-style:normal;color:var(--ske-ok)}
.ske-fx-list{display:flex;flex-direction:column;gap:8px}
.ske-effect-head strong{display:flex;align-items:center;gap:6px}
.ske-chip{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:999px;background:var(--ske-line);color:var(--ske-muted)}
.ske-chip[data-group=entrance]{background:rgba(62,207,142,.18);color:#5fe3a5}
.ske-chip[data-group=loop]{background:rgba(230,180,34,.18);color:#f0c64a}
.ske-chip[data-group=image]{background:rgba(255,159,67,.18);color:#ffb066}
.ske-chip[data-group=scroll]{background:rgba(79,140,255,.18);color:#86aeff}
.ske-chip[data-group=text]{background:rgba(180,108,255,.2);color:#c99bff}
.ske-fx-sum{font-size:12px;color:var(--ske-muted);margin:0}
.ske-quick{display:flex;flex-direction:column;gap:6px}
.ske-quick-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ske-quick-row>span{font-size:11px;color:var(--ske-muted)}
.ske-seg{display:inline-flex;border:1px solid var(--ske-line);border-radius:6px;overflow:hidden}
.ske-seg button{background:var(--ske-panel);color:var(--ske-muted);border:0;border-left:1px solid var(--ske-line);padding:4px 9px;font:inherit;font-size:12px;cursor:pointer}
.ske-seg button:first-child{border-left:0}
.ske-seg button[aria-pressed=true]{background:var(--ske-accent);color:#fff}
.ske-sec-input{display:flex;align-items:center;gap:4px}
.ske-sec-input input{width:64px!important;padding:4px 6px!important}
.ske-more>summary{cursor:pointer;color:var(--ske-muted);font-size:12px;padding:2px 0}
.ske-more>summary:hover{color:var(--ske-text)}
.ske-more[open]>summary{margin-bottom:8px}
.ske-fx-group{display:flex;flex-direction:column;gap:4px}
.ske-fx-group h4{margin:6px 0 2px;font-size:11px;font-weight:600;color:var(--ske-muted)}
.ske-fx-opt{display:flex;flex-direction:column;gap:1px;text-align:left;background:var(--ske-raised);border:1px solid transparent;border-radius:8px;padding:6px 9px;color:inherit;font:inherit;cursor:pointer}
.ske-fx-opt:hover:not(:disabled){border-color:var(--ske-accent)}
.ske-fx-opt:disabled{opacity:.4;cursor:not-allowed}
.ske-fx-opt b{font-weight:600}
.ske-fx-opt small{color:var(--ske-muted);font-size:11px}
`;

/** Page editor chrome (sections list, widget forms, preview). Reuses the --ske-* variables. */
export const PAGE_EDITOR_CSS = `
.skp-root{
  --ske-bg:#0f1115;--ske-panel:#171a21;--ske-raised:#1f2430;--ske-line:#2b3140;
  --ske-text:#e7e9ee;--ske-muted:#8b93a7;--ske-accent:#4f8cff;--ske-danger:#ff5c6c;--ske-ok:#3ecf8e;--ske-checker:#242936;
  display:grid;grid-template-rows:auto minmax(0,1fr);height:100%;min-height:640px;
  background:var(--ske-bg);color:var(--ske-text);font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif
}
.skp-root *,.skp-root *::before,.skp-root *::after{box-sizing:border-box}
.skp-root input[type=text],.skp-root input[type=number],.skp-root select,.skp-root textarea{
  width:100%;background:var(--ske-raised);color:var(--ske-text);border:1px solid var(--ske-line);border-radius:6px;padding:6px 8px;font:inherit
}
.skp-root [aria-invalid=true]{border-color:var(--ske-danger)}
.skp-top{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid var(--ske-line);background:var(--ske-panel)}
.skp-tabs{border:0;position:static;margin-right:auto;flex:none}
.skp-tabs button{flex:none;padding:8px 14px}
.skp-save-error{max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skp-body{display:grid;grid-template-columns:240px minmax(0,1fr);min-height:0}
.skp-body[data-rail=closed]{grid-template-columns:52px minmax(0,1fr)}
.skp-rail-head{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 8px 12px;border-bottom:1px solid var(--ske-line)}
.skp-rail-head h3{margin:0;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ske-muted)}
.skp-rail-icons{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0}
.skp-rail-icons button{width:36px;height:36px;border-radius:8px;border:1px solid transparent;background:none;color:var(--ske-text);cursor:pointer;font-size:12px;font-weight:700}
.skp-rail-icons button[aria-pressed=true]{border-color:var(--ske-accent);background:var(--ske-raised)}
.skp-details{border-bottom:1px solid var(--ske-line)}
.skp-details>summary{cursor:pointer;padding:12px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ske-muted);list-style-position:inside}
.skp-details>.ske-section-body{padding:0 12px 12px}
.skp-adv{display:flex;align-items:center;gap:6px;color:var(--ske-muted);font-size:12px;cursor:pointer;margin-left:6px}
.skp-context{gap:8px}
.skp-context .ske-seg button{padding:5px 12px;font-size:13px}
.skp-sections{border-right:1px solid var(--ske-line)}
.skp-add-widget{display:flex;align-items:flex-end;gap:6px}
.skp-add-widget .ske-field{flex:1}
.skp-main{min-width:0;min-height:0;display:flex;flex-direction:column}
.skp-scene{flex:1;min-height:0;display:flex;flex-direction:column}
.skp-scene>.ske-root{flex:1;min-height:0;height:auto}
.skp-widget{flex:1;overflow-y:auto}
.skp-widget .ske-widget-form{max-width:760px}
.skp-empty{padding:24px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.skp-preview{flex:1;min-height:0;display:flex;flex-direction:column}
.skp-preview-stage{flex:1;min-height:0;overflow:auto;padding:24px;display:flex;justify-content:center;
  background-color:var(--ske-bg);background-image:conic-gradient(var(--ske-checker) 25%,transparent 0 50%,var(--ske-checker) 0 75%,transparent 0);background-size:24px 24px}
.skp-preview-frame{flex:none;max-width:100%;align-self:flex-start;box-shadow:0 0 0 1px var(--ske-line),0 12px 40px rgba(0,0,0,.4);background:#000}
.skp-json{flex:1;overflow-y:auto;max-width:900px}
.ske-thumb{width:22px;height:28px;object-fit:cover;border-radius:3px;flex:none}
.ske-games{display:flex;flex-direction:column;gap:8px}
.skp-slides{flex-wrap:wrap;gap:6px}
.skp-slide{display:inline-flex;align-items:center;gap:1px;border:1px solid var(--ske-line);border-radius:6px;padding:1px 2px}
.skp-slide.is-selected{border-color:var(--ske-accent)}

/* ── timeline panel (Slider Revolution–style) ── */
.ske-tlp{position:relative;flex:none;display:flex;flex-direction:column;border-top:1px solid var(--ske-line);background:var(--ske-panel);min-height:0;user-select:none}
.ske-tlp-grip{position:absolute;left:0;right:0;top:-4px;height:8px;cursor:ns-resize;z-index:5}
.ske-tlp-grip:hover{background:linear-gradient(transparent 3px,var(--ske-accent) 3px,var(--ske-accent) 5px,transparent 5px)}
.ske-tlp-head{flex:none;display:flex;align-items:center;gap:6px;height:38px;padding:0 10px;border-bottom:1px solid var(--ske-line)}
.ske-tlp-head strong{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ske-text)}
.ske-tlp-time{font-variant-numeric:tabular-nums;min-width:120px}
.ske-tlp-spacer{flex:1}
.ske-tlp-mode{font-size:11px;color:#ffb020;margin-right:6px}
.ske-tlp-body{flex:1;min-height:0;overflow:auto;position:relative}
.ske-tlp-grid{position:relative;min-width:100%}
.ske-tlp-row{display:flex;align-items:stretch;min-height:30px;border-bottom:1px solid rgba(255,255,255,.05)}
.ske-tlp-row.is-selected{background:rgba(79,140,255,.10)}
.ske-tlp-row[data-hidden=true]{opacity:.45}
.ske-tlp-name{position:sticky;left:0;z-index:3;flex:none;width:210px;display:flex;align-items:center;gap:2px;padding:0 4px 0 8px;background:var(--ske-panel);border-right:1px solid var(--ske-line)}
.ske-tlp-row.is-selected .ske-tlp-name{background:#1c2333}
.ske-tlp-layer{flex:1;min-width:0;display:flex;align-items:center;gap:6px;background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:4px 0;text-align:left}
.ske-tlp-icon{width:16px;text-align:center;color:var(--ske-muted)}
.ske-tlp-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ske-tlp-add{font-weight:700}
.ske-tlp-menu{position:absolute;left:100%;top:2px;z-index:10;min-width:170px;display:flex;flex-direction:column;background:var(--ske-raised);border:1px solid var(--ske-line);border-radius:8px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.ske-tlp-menu button{background:none;border:0;color:var(--ske-text);font:inherit;text-align:left;padding:6px 8px;border-radius:5px;cursor:pointer}
.ske-tlp-menu button:hover:not(:disabled){background:var(--ske-line)}
.ske-tlp-menu button:disabled{opacity:.4;cursor:not-allowed}
.ske-tlp-corner{z-index:4}
.ske-tlp-ruler-row{position:sticky;top:0;z-index:4;min-height:26px;background:var(--ske-panel);border-bottom:1px solid var(--ske-line)}
.ske-tlp-ruler{position:relative;cursor:ew-resize;flex:none}
.ske-tlp-tick{position:absolute;bottom:0;width:1px;height:5px;background:var(--ske-line)}
.ske-tlp-tick.is-major{height:11px;background:var(--ske-muted)}
.ske-tlp-tick em{position:absolute;left:3px;bottom:9px;font-style:normal;font-size:10px;color:var(--ske-muted);white-space:nowrap}
.ske-tlp-track{position:relative;flex:none;padding:2px 0;display:flex;flex-direction:column;gap:2px}
.ske-tlp-lane{position:relative;height:24px}
.ske-tlp-bar{--c:#4f8cff;position:absolute;top:1px;bottom:1px;border-radius:6px;background:color-mix(in srgb,var(--c) 70%,#000);border:1px solid var(--c);color:#fff;font-size:11px;display:flex;align-items:center;cursor:grab;overflow:visible;box-sizing:border-box}
.ske-tlp-bar[data-movable=false]{cursor:default}
.ske-tlp-bar:active{cursor:grabbing}
.ske-tlp-bar[data-kind=enter]{--c:#3ecf8e}
.ske-tlp-bar[data-kind=fadeIn]{--c:#2bb3a3}
.ske-tlp-bar[data-kind=timeline]{--c:#4f8cff}
.ske-tlp-bar[data-kind=splitText]{--c:#b46cff}
.ske-tlp-bar[data-kind=kenBurns]{--c:#ff9f43}
.ske-tlp-bar[data-kind=blur]{--c:#7d8aa5}
.ske-tlp-bar[data-kind=loop]{--c:#e6b422}
.ske-tlp-bar-label{padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
.ske-tlp-bar-label.is-outside{position:absolute;left:calc(100% + 6px);padding:0;overflow:visible;color:var(--ske-text);opacity:.8;font-weight:500}
.ske-tlp-tools{display:flex;flex:none;opacity:.55}
.ske-tlp-row:hover .ske-tlp-tools,.ske-tlp-row.is-selected .ske-tlp-tools{opacity:1}
.ske-tlp-tools .ske-icon-btn{padding:2px 4px}
.ske-tlp-menu hr{border:0;border-top:1px solid var(--ske-line);margin:4px 0}
.ske-tlp-menu .is-danger{color:var(--ske-danger)}
.ske-tlp-repeat{--c:#e6b422;position:absolute;top:5px;bottom:5px;border-radius:0 6px 6px 0;opacity:.55;pointer-events:none;
  background:repeating-linear-gradient(-45deg,color-mix(in srgb,var(--c) 55%,transparent) 0 5px,transparent 5px 10px);border:1px dashed color-mix(in srgb,var(--c) 70%,transparent);border-left:0}
.ske-tlp-repeat[data-kind=timeline]{--c:#4f8cff}
.ske-tlp-repeat[data-kind=kenBurns]{--c:#ff9f43}
.ske-tlp-edge{position:absolute;right:-4px;top:0;bottom:0;width:9px;cursor:ew-resize;z-index:2}
.ske-tlp-edge::after{content:"";position:absolute;right:3px;top:5px;bottom:5px;width:2px;border-radius:2px;background:rgba(255,255,255,.7)}
.ske-tlp-kf{position:absolute;top:50%;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;rotate:45deg;background:#fff;border:2px solid #1b2a4a;border-radius:2px;cursor:ew-resize;z-index:3}
.ske-tlp-kf.is-selected{background:#ffb020;border-color:#fff;box-shadow:0 0 0 2px #ffb020}
.ske-tlp-timeless{position:absolute;right:6px;top:50%;translate:0 -50%;color:var(--ske-muted);font-size:13px}
.ske-tlp-playhead{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#ff4757;z-index:6;pointer-events:none}
.ske-tlp-playhead::before{content:"";position:absolute;top:0;left:-5px;border:6px solid transparent;border-top:8px solid #ff4757}
.ske-tlp-empty{padding:10px}
`;
