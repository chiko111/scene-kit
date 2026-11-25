import type { PageSection } from './page';
import type { Scene } from './schema';
import type { Widget } from './widgets';

/** Picks the scene variant for the current width (scene sections and slides). */
export function sceneForWidth(section: { scene: Scene; mobileScene: Scene | null }, width: number, breakpoint: number): Scene {
  return section.mobileScene && width > 0 && width < breakpoint ? section.mobileScene : section.scene;
}

/** Picks the widget variant for the current width. */
export function widgetForWidth(section: Extract<PageSection, { kind: 'widget' }>, width: number, breakpoint: number): Widget {
  return section.mobileWidget && width > 0 && width < breakpoint ? section.mobileWidget : section.widget;
}
