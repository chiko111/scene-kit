import { createContext, use, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  resolveFont,
  sceneForWidth,
  widgetForWidth,
  type FontMap,
  type Page,
  type PageSection,
  type PageUser,
  type Palette,
  type SceneAction,
  type Widget,
} from '@chiko111/scene-kit-core/runtime';
import { SceneView } from './SceneView';
import { SceneEnvContext, type SceneEnv } from './sceneEnv';
import { Slider } from './Slider';
import { PAGE_CSS } from './pageStyles';
import { CalendarWidget } from './widgets/Calendar';
import { DrawVideosWidget } from './widgets/DrawVideos';
import { GameCarouselWidget } from './widgets/GameCarousel';
import { TermsWidget } from './widgets/Terms';
import { TicketCounterWidget } from './widgets/TicketCounter';

export type PageViewProps = {
  page: Page;
  palette: Palette;
  onAction?: (action: SceneAction) => void;
  user?: PageUser;
  fontFamily?: string;
  fonts?: FontMap;
  /** Clock override (tests / editor preview); default Date.now. */
  now?: () => number;
  /** false in the editor preview: buttons/taps don't fire. */
  interactive?: boolean;
  className?: string;
};

/** Everything widgets need from the page. */
export type PageContextValue = {
  palette: Palette;
  fonts: FontMap | undefined;
  fontFamily: string | undefined;
  user: PageUser;
  now: () => number;
  interactive: boolean;
  /** Fires the action only when the page is interactive. */
  act: (action: SceneAction) => void;
  /** Date shown by the draw videos widget (null = its default, today). */
  drawDate: string | null;
  setDrawDate: (dateKey: string) => void;
  /** Selects a draw day and scrolls the draw videos widget into view (calendar → draws). */
  showDraw: (dateKey: string) => void;
};

const GUEST: PageUser = { loggedIn: false };
const PageContext = createContext<PageContextValue | null>(null);

export function usePage(): PageContextValue {
  const ctx = use(PageContext);
  if (!ctx) throw new Error('scene-kit widgets must be rendered inside <PageView>');
  return ctx;
}

/** Font family for a widget's font key (falls back to the page font). */
export function useWidgetFont(key: string | undefined): string | undefined {
  const { fonts, fontFamily } = usePage();
  return resolveFont(fonts, key) ?? fontFamily;
}

/**
 * Current time, refreshed every `intervalMs`. Kept in state (not read during render) so memoizing
 * compilers can't cache a stale clock.
 */
export function useClock(intervalMs: number): number {
  const { now } = usePage();
  const [time, setTime] = useState(() => now());
  useEffect(() => {
    setTime(now());
    const id = setInterval(() => setTime(now()), intervalMs);
    return () => clearInterval(id);
  }, [now, intervalMs]);
  return time;
}

/** Width of an element, tracked with ResizeObserver (0 until measured). */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[entries.length - 1]?.contentRect.width;
      if (w !== undefined) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function WidgetView({ widget }: { widget: Widget }): ReactNode {
  switch (widget.type) {
    case 'ticketCounter':
      return <TicketCounterWidget widget={widget} />;
    case 'calendar':
      return <CalendarWidget widget={widget} />;
    case 'drawVideos':
      return <DrawVideosWidget widget={widget} />;
    case 'gameCarousel':
      return <GameCarouselWidget widget={widget} />;
    case 'terms':
      return <TermsWidget widget={widget} />;
  }
}

function Section({
  section,
  width,
  breakpoint,
  props,
}: {
  section: PageSection;
  width: number;
  breakpoint: number;
  props: PageViewProps;
}) {
  if (section.kind === 'widget') {
    const widget = widgetForWidth(section, width, breakpoint);
    return (
      <section
        className="skp-section"
        data-section-id={section.id}
        data-sk-widget={widget.type}
        data-variant={widget === section.widget ? 'default' : 'mobile'}
      >
        <WidgetView widget={widget} />
      </section>
    );
  }
  if (section.kind === 'slider') {
    return (
      <Slider
        section={section}
        width={width}
        breakpoint={breakpoint}
        palette={props.palette}
        onAction={props.onAction}
        interactive={props.interactive}
        fontFamily={props.fontFamily}
        fonts={props.fonts}
      />
    );
  }
  const scene = sceneForWidth(section, width, breakpoint);
  return (
    <section className="skp-section" data-section-id={section.id} data-variant={scene === section.scene ? 'default' : 'mobile'}>
      <SceneView
        key={scene.id}
        scene={scene}
        palette={props.palette}
        onAction={props.onAction}
        interactive={props.interactive}
        fontFamily={props.fontFamily}
        fonts={props.fonts}
      />
    </section>
  );
}

export function PageView(props: PageViewProps) {
  const { page, palette, onAction, user, fontFamily, fonts, now, interactive, className } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const width = useWidth(rootRef);
  const [drawDate, setDrawDate] = useState<string | null>(null);
  const isInteractive = interactive ?? true;
  const clock = now ?? Date.now;

  const env: SceneEnv = { now: clock, parallax: true };
  const ctx: PageContextValue = {
    palette,
    fonts,
    fontFamily,
    user: user ?? GUEST,
    now: clock,
    interactive: isInteractive,
    act: (action) => {
      if (isInteractive && onAction) onAction(action);
    },
    drawDate,
    setDrawDate,
    showDraw: (dateKey) => {
      setDrawDate(dateKey);
      rootRef.current
        ?.querySelector('[data-sk-widget="drawVideos"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  };

  return (
    <PageContext value={ctx}>
      <SceneEnvContext value={env}>
      <style href="scene-kit-page" precedence="medium">
        {PAGE_CSS}
      </style>
      <div
        className={className ? `skp-page ${className}` : 'skp-page'}
        role="region"
        aria-label={page.name || undefined}
        style={{ background: page.background ? palette[page.background] : undefined, fontFamily }}
      >
        <div ref={rootRef} className="skp-column" style={{ maxWidth: page.maxWidth }}>
          {page.sections.map((section) => (
            <Section
              key={section.id}
              section={section}
              width={width}
              breakpoint={page.mobileBreakpoint}
              props={props}
            />
          ))}
        </div>
      </div>
      </SceneEnvContext>
    </PageContext>
  );
}
