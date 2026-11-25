import { createContext, useContext } from 'react';
import type { FontMap, PageUser, Palette, SceneAction } from '@chiko111/scene-kit-core/runtime';

/** Shared state between the sections of one PageView (e.g. calendar → draw videos). */
export type PageContextValue = {
  palette: Palette;
  fonts: FontMap | undefined;
  fontFamily: string | undefined;
  user: PageUser | undefined;
  onAction: ((action: SceneAction) => void) | undefined;
  /** Current time in ms (overridable for previews/tests). */
  now: () => number;
  /** Width the widgets lay out in (px / dp). */
  width: number;
  /** Day selected in the calendar – the drawVideos widget follows it. */
  selectedDraw: string | null;
  /** Select a draw day and scroll to the drawVideos section. */
  openDraw: (dateKey: string) => void;
};

export const PageContext = createContext<PageContextValue | null>(null);

export function usePageContext(): PageContextValue {
  const value = useContext(PageContext);
  if (!value) throw new Error('scene-kit widgets must be rendered inside <PageView>');
  return value;
}
