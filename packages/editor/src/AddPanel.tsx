import { useActionState } from 'react';
import { ImageUriSchema } from '@scene-kit/core';

const ACCEPTED_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif'] as const;
const LOAD_TIMEOUT_MS = 15000;

type Props = {
  canAdd: boolean;
  onAddImage: (uri: string, aspect: number) => void;
  onAddText: () => void;
  onAddButton: () => void;
  onAddShape: () => void;
  onUpload: ((file: File) => Promise<string>) | undefined;
  maxUploadBytes: number;
};

type UploadState = { error: string | null };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

/** Loads the image to get its natural aspect ratio (also proves the URL works). */
function loadImageAspect(uri: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.src = '';
      reject(new Error('Image took too long to load'));
    }, LOAD_TIMEOUT_MS);
    img.onload = () => {
      window.clearTimeout(timer);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve(img.naturalWidth / img.naturalHeight);
      else reject(new Error('Image has no size'));
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Image could not be loaded'));
    };
    img.src = uri;
  });
}

const isAccepted = (type: string) => ACCEPTED_TYPES.some((t) => t === type);

export function AddPanel({ canAdd, onAddImage, onAddText, onAddButton, onAddShape, onUpload, maxUploadBytes }: Props) {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(async (_prev, formData) => {
    if (!canAdd) return { error: 'Layer limit reached' };

    const file = formData.get('file');
    const url = String(formData.get('url') ?? '').trim();
    let uri: string;

    if (file instanceof File && file.size > 0) {
      if (!onUpload) return { error: 'Upload is not configured — paste a CDN URL instead' };
      if (!isAccepted(file.type)) return { error: 'Use WebP, PNG, JPEG or GIF' };
      if (file.size > maxUploadBytes) {
        return { error: `File is ${(file.size / 1048576).toFixed(1)} MB, limit is ${(maxUploadBytes / 1048576).toFixed(1)} MB` };
      }
      try {
        uri = await onUpload(file);
      } catch (error) {
        return { error: `Upload failed: ${messageOf(error)}` };
      }
    } else if (url) {
      uri = url;
    } else {
      return { error: 'Choose a file or paste an image URL' };
    }

    if (!ImageUriSchema.safeParse(uri).success) return { error: 'Image URL must start with https://' };

    try {
      onAddImage(uri, await loadImageAspect(uri));
      return { error: null };
    } catch (error) {
      return { error: messageOf(error) };
    }
  }, { error: null });

  return (
    <div className="ske-add">
      <div className="ske-row">
        <button type="button" className="ske-btn" disabled={!canAdd} onClick={onAddButton}>
          + Button
        </button>
        <button type="button" className="ske-btn" disabled={!canAdd} onClick={onAddText}>
          + Text
        </button>
        <button type="button" className="ske-btn" disabled={!canAdd} onClick={onAddShape}>
          + Shape
        </button>
      </div>

      <form action={formAction} className="ske-upload">
        <strong>+ Image</strong>
        {onUpload && (
          <input type="file" name="file" accept={ACCEPTED_TYPES.join(',')} disabled={pending || !canAdd} />
        )}
        <input type="url" name="url" placeholder="https://cdn…/image.webp" disabled={pending || !canAdd} />
        <button type="submit" className="ske-btn ske-btn-primary" disabled={pending || !canAdd}>
          {pending ? 'Adding…' : 'Add image'}
        </button>
        {state.error && (
          <p className="ske-error" role="alert">
            {state.error}
          </p>
        )}
        <small className="ske-hint">Animated WebP is preferred over GIF (smaller, real transparency).</small>
      </form>
    </div>
  );
}
