/** Editor chrome only (the scene itself is styled by @chiko111/scene-kit-web). Override the --ske-* vars to theme it. */
export const EDITOR_CSS = `
.ske-root{
  --ske-bg:#0f1115;--ske-panel:#171a21;--ske-raised:#1f2430;--ske-line:#2b3140;
  --ske-text:#e7e9ee;--ske-muted:#8b93a7;--ske-accent:#4f8cff;--ske-danger:#ff5c6c;--ske-ok:#3ecf8e;
  --ske-checker:#242936;
  display:grid;grid-template-columns:280px minmax(0,1fr) 320px;height:100%;min-height:600px;
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
.ske-add{display:flex;flex-direction:column;gap:10px}
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
.ske-stage{flex:1;min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:24px;
  background-color:var(--ske-bg);background-image:conic-gradient(var(--ske-checker) 25%,transparent 0 50%,var(--ske-checker) 0 75%,transparent 0);background-size:24px 24px}
.ske-canvas{position:relative;width:min(100%,calc(var(--ske-ar) * (100vh - 160px)));box-shadow:0 0 0 1px var(--ske-line),0 12px 40px rgba(0,0,0,.4)}
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
.ske-tabs button{flex:1;background:none;border:0;border-bottom:2px solid transparent;color:var(--ske-muted);padding:10px;font:inherit;cursor:pointer}
.ske-tabs button[aria-selected=true]{color:var(--ske-text);border-bottom-color:var(--ske-accent)}
.ske-effect{background:var(--ske-raised);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:8px}
.ske-effect-head{display:flex;justify-content:space-between;align-items:center}
.ske-json{padding:12px;display:flex;flex-direction:column;gap:10px}
.ske-code{font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
.ske-warnings{margin:0;padding-left:16px;color:var(--ske-muted);font-size:12px}
.ske-right>p.ske-muted{padding:12px}
.ske-colors{display:flex;flex-direction:column;gap:4px}
.ske-colors-label{font-size:11px;color:var(--ske-muted)}
.ske-colors-row{display:flex;align-items:flex-end;gap:4px}
.ske-colors-row .ske-color{flex:1}
`;
