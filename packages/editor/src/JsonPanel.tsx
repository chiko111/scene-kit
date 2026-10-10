import { useActionState, useState } from 'react';
import { parseScene, serializeScene, type ParseIssue, type Scene } from '@scene-kit/core';

type Props = {
  scene: Scene;
  onImport: (scene: Scene) => void;
  onSave: ((scene: Scene) => Promise<void>) | undefined;
};

type SaveState = { status: 'idle' } | { status: 'saved'; at: string } | { status: 'error'; message: string };
type ImportState = { error: string | null; warnings: ParseIssue[] };

function safeSerialize(scene: Scene): { json: string; error: null } | { json: null; error: string } {
  try {
    return { json: serializeScene(scene, true), error: null };
  } catch (error) {
    return { json: null, error: error instanceof Error ? error.message : 'Invalid scene' };
  }
}

export function JsonPanel({ scene, onImport, onSave }: Props) {
  const exported = safeSerialize(scene);
  const [copied, setCopied] = useState(false);

  // The scene travels through FormData and is re-validated, so we never save something invalid.
  const [saveState, saveAction, saving] = useActionState<SaveState, FormData>(async (_prev, formData) => {
    if (!onSave) return { status: 'error', message: 'Saving is not configured' };
    const result = parseScene(String(formData.get('scene') ?? ''));
    if (!result.ok) return { status: 'error', message: result.error };
    if (result.warnings.length > 0) return { status: 'error', message: result.warnings[0]?.message ?? 'Invalid scene' };
    try {
      await onSave(result.scene);
      return { status: 'saved', at: new Date().toLocaleTimeString() };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Save failed' };
    }
  }, { status: 'idle' });

  const [importState, importAction, importing] = useActionState<ImportState, FormData>(async (_prev, formData) => {
    const result = parseScene(String(formData.get('json') ?? ''));
    if (!result.ok) return { error: result.error, warnings: result.warnings };
    onImport(result.scene);
    return { error: null, warnings: result.warnings };
  }, { error: null, warnings: [] });

  const copy = async () => {
    if (!exported.json) return;
    try {
      await navigator.clipboard.writeText(exported.json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    if (!exported.json) return;
    const url = URL.createObjectURL(new Blob([exported.json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.id}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="ske-json">
      {exported.json === null ? (
        <p className="ske-error" role="alert">
          Scene is invalid: {exported.error}
        </p>
      ) : (
        <textarea className="ske-code" readOnly value={exported.json} aria-label="Scene JSON" rows={14} />
      )}

      <div className="ske-row">
        <button type="button" className="ske-btn" disabled={!exported.json} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="ske-btn" disabled={!exported.json} onClick={download}>
          Download
        </button>
        {onSave && (
          <form action={saveAction}>
            <input type="hidden" name="scene" value={exported.json ?? ''} />
            <button type="submit" className="ske-btn ske-btn-primary" disabled={!exported.json || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
      {saveState.status === 'saved' && <p className="ske-ok">Saved at {saveState.at}</p>}
      {saveState.status === 'error' && (
        <p className="ske-error" role="alert">
          {saveState.message}
        </p>
      )}

      <form action={importAction} className="ske-import">
        <strong>Import JSON</strong>
        <textarea name="json" className="ske-code" rows={5} placeholder="Paste scene JSON…" />
        <button type="submit" className="ske-btn" disabled={importing}>
          Load (undoable)
        </button>
        {importState.error && (
          <p className="ske-error" role="alert">
            {importState.error}
          </p>
        )}
        {importState.warnings.length > 0 && (
          <ul className="ske-warnings">
            {importState.warnings.map((w, i) => (
              <li key={i}>
                {w.path}: {w.message}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}
