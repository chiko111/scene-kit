import { useEffect, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  sceneForWidth,
  widgetForWidth,
  type FontMap,
  type Page,
  type PageSection,
  type PageUser,
  type Palette,
  type SceneAction,
} from '@chiko111/scene-kit-core/runtime';
import { PageContext, type PageContextValue } from './pageContext';
import { SceneView } from './SceneView';
import { Slider } from './Slider';
import { useAppActive } from './useAppActive';
import { Calendar } from './widgets/Calendar';
import { DrawVideos } from './widgets/DrawVideos';
import { GameCarousel } from './widgets/GameCarousel';
import { Terms } from './widgets/Terms';
import { TicketCounter } from './widgets/TicketCounter';

export type PageViewProps = {
  page: Page;
  /** Map theme tokens to your Colors.* — never hex in the page JSON. */
  palette: Palette;
  onAction?: (action: SceneAction) => void;
  /** Display values of the signed-in user (e.g. { loggedIn: true, fields: { tickets: 7 } }). Never tokens. */
  user?: PageUser;
  fontFamily?: string;
  fonts?: FontMap;
  /** Clock override (ms) for previews/tests. Default Date.now. */
  now?: () => number;
  /** e.g. useIsFocused(). App background is handled internally. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Optional content above the sections (e.g. your screen header). */
  header?: ReactElement | null;
};

type Box = { y: number; height: number };

/** Sections count as visible a bit before they scroll in, so entrances start as they appear. */
const VISIBILITY_MARGIN = 40;

const defaultNow = () => Date.now();

export function PageView({
  page,
  palette,
  onAction,
  user,
  fontFamily,
  fonts,
  now,
  active,
  style,
  contentContainerStyle,
  header,
}: PageViewProps) {
  const appActive = useAppActive();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // UI-thread scroll position + viewport height (parallax); JS copies drive section visibility
  const scrollY = useSharedValue(0);
  const viewportH = useSharedValue(0);
  const lastJsY = useSharedValue(-1000);
  // Section tops are derived from heights (header + sections above), not from onLayout's y:
  // react-native-web only reports layout on resize, so a section that merely MOVES would keep a stale y.
  const heights = useRef(new Map<string, number>());
  const headerH = useRef(0);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const viewport = useRef({ offset: 0, height: 0 });
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState<ReadonlySet<string>>(new Set());
  const [selectedDraw, setSelectedDraw] = useState<string | null>(null);
  const running = (active ?? true) && appActive;

  const boxesNow = (): Map<string, Box> => {
    const out = new Map<string, Box>();
    let y = headerH.current;
    for (const section of page.sections) {
      const h = heights.current.get(section.id) ?? 0;
      out.set(section.id, { y, height: h });
      y += h;
    }
    return out;
  };

  const recompute = () => {
    const { offset, height } = viewport.current;
    if (height <= 0) return;
    const next = new Set<string>();
    for (const [id, box] of boxesNow()) {
      if (box.height > 0 && box.y < offset + height - VISIBILITY_MARGIN && box.y + box.height > offset + VISIBILITY_MARGIN) next.add(id);
    }
    setVisible((prev) => (sameSet(prev, next) ? prev : next));
  };

  const onScrollJs = (y: number) => {
    viewport.current.offset = y;
    recompute();
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.set(e.contentOffset.y);
      // visibility only needs coarse updates: hop to JS every ~24px
      if (Math.abs(e.contentOffset.y - lastJsY.get()) > 24) {
        lastJsY.set(e.contentOffset.y);
        runOnJS(onScrollJs)(e.contentOffset.y);
      }
    },
    onMomentumEnd: (e) => {
      lastJsY.set(e.contentOffset.y);
      runOnJS(onScrollJs)(e.contentOffset.y);
    },
  });

  const onRootLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    viewport.current.height = h;
    viewportH.set(h);
    setWidth((prev) => (prev === w ? prev : w));
    recompute();
  };

  const onSectionLayout = (id: string) => (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (heights.current.get(id) === height) return;
    heights.current.set(id, height);
    setLayoutVersion((v) => v + 1);
    recompute();
  };

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    if (headerH.current === e.nativeEvent.layout.height) return;
    headerH.current = e.nativeEvent.layout.height;
    setLayoutVersion((v) => v + 1);
    recompute();
  };

  const tops = boxesNow();

  const contentWidth = Math.min(width, page.maxWidth);

  const openDraw = (dateKey: string) => {
    setSelectedDraw(dateKey);
    const draws = page.sections.find((s) => s.kind === 'widget' && widgetForWidth(s, contentWidth, page.mobileBreakpoint).type === 'drawVideos');
    const box = draws && boxesNow().get(draws.id);
    if (box) scrollRef.current?.scrollTo({ y: Math.max(0, box.y - 12), animated: true });
  };

  const context: PageContextValue = {
    palette,
    fonts,
    fontFamily,
    user,
    onAction,
    now: now ?? defaultNow,
    width: contentWidth,
    selectedDraw,
    openDraw,
  };

  return (
    <PageContext.Provider value={context}>
      <Animated.ScrollView
        ref={scrollRef}
        style={[styles.root, { backgroundColor: page.background ? palette[page.background] : undefined }, style]}
        contentContainerStyle={contentContainerStyle}
        onLayout={onRootLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {header ? <View onLayout={onHeaderLayout}>{header}</View> : null}
        {contentWidth > 0 &&
          page.sections.map((section) => (
            <SectionBox
              key={section.id}
              section={section}
              page={page}
              width={contentWidth}
              active={running && visible.has(section.id)}
              palette={palette}
              fonts={fonts}
              fontFamily={fontFamily}
              onAction={onAction}
              scrollY={scrollY}
              viewportH={viewportH}
              top={tops.get(section.id)?.y ?? 0}
              onBox={onSectionLayout(section.id)}
            />
          ))}
      </Animated.ScrollView>
    </PageContext.Provider>
  );
}

type SectionProps = {
  section: PageSection;
  page: Page;
  width: number;
  active: boolean;
  palette: Palette;
  fonts: FontMap | undefined;
  fontFamily: string | undefined;
  onAction: ((action: SceneAction) => void) | undefined;
};

/** Wrapper that measures the section and derives its parallax offset on the UI thread. */
function SectionBox({
  scrollY,
  viewportH,
  top: topPx,
  onBox,
  ...props
}: SectionProps & {
  scrollY: SharedValue<number>;
  viewportH: SharedValue<number>;
  /** y of the section inside the scroll content (header + heights of the sections above) */
  top: number;
  onBox: (e: LayoutChangeEvent) => void;
}) {
  const top = useSharedValue(topPx);
  const h = useSharedValue(0);
  useEffect(() => {
    top.set(topPx);
  }, [top, topPx]);
  // sectionCenterY − viewportCenterY (px)
  const parallaxDelta = useDerivedValue(() => top.get() + h.get() / 2 - (scrollY.get() + viewportH.get() / 2));
  const onLayout = (e: LayoutChangeEvent) => {
    h.set(e.nativeEvent.layout.height);
    onBox(e);
  };
  return (
    <View onLayout={onLayout} style={[styles.section, { width: props.width }]}>
      <Section {...props} parallaxDelta={parallaxDelta} />
    </View>
  );
}

function Section({
  section,
  page,
  width,
  active,
  palette,
  fonts,
  fontFamily,
  onAction,
  parallaxDelta,
}: SectionProps & { parallaxDelta: SharedValue<number> }) {
  if (section.kind === 'scene') {
    const scene = sceneForWidth(section, width, page.mobileBreakpoint);
    return (
      <SceneView
        key={scene.id}
        scene={scene}
        palette={palette}
        fonts={fonts}
        fontFamily={fontFamily}
        onAction={onAction}
        active={active}
        parallaxDelta={parallaxDelta}
      />
    );
  }
  if (section.kind === 'slider') {
    return (
      <Slider
        section={section}
        width={width}
        breakpoint={page.mobileBreakpoint}
        active={active}
        palette={palette}
        fonts={fonts}
        fontFamily={fontFamily}
        onAction={onAction}
        parallaxDelta={parallaxDelta}
      />
    );
  }
  const widget = widgetForWidth(section, width, page.mobileBreakpoint);
  switch (widget.type) {
    case 'ticketCounter':
      return <TicketCounter widget={widget} />;
    case 'calendar':
      return <Calendar widget={widget} />;
    case 'drawVideos':
      return <DrawVideos widget={widget} />;
    case 'gameCarousel':
      return <GameCarousel widget={widget} />;
    case 'terms':
      return <Terms widget={widget} />;
  }
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: { alignSelf: 'center' },
});
