import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  calendarCells,
  weekdayIndex,
  withAlpha,
  zonedNow,
  type CalendarCell,
  type WidgetOf,
} from '@chiko111/scene-kit-core/runtime';
import { usePageContext } from '../pageContext';
import { clamp, fontOf, useTicker, widgetUnit } from './shared';

type DayCell = Extract<CalendarCell, { kind: 'day' }>;

/** Narrow screens show only the campaign days, 4 per row (big enough to read); wide ones the month grid. */
const NARROW = 560;

export function Calendar({ widget }: { widget: WidgetOf<'calendar'> }) {
  const { palette, fonts, fontFamily, now, width, openDraw } = usePageContext();
  useTicker(60_000); // "today" moves at midnight
  const today = zonedNow(now(), widget.timeZone).dateKey;
  const weeks = calendarCells({ ...widget, today });
  const font = fontOf(fonts, widget.font, fontFamily);
  const c = widget.colors;
  const narrow = width < NARROW;
  const inner = Math.min(width, 960) - 24;
  const columns = narrow ? 4 : 7;
  const cell = inner / columns;
  const bubble = cell * (narrow ? 0.9 : 0.86);
  const u = widgetUnit(width);

  const rows: (CalendarCell | null)[][] = narrow
    ? chunk(weeks.flat().filter((x): x is DayCell => x.kind === 'day'), 4)
    : weeks;

  return (
    <View style={[styles.root, { backgroundColor: c.background ? palette[c.background] : undefined }]}>
      <View style={{ width: inner }}>
        {widget.title !== '' && (
          <Text style={[styles.title, { color: palette[c.text], fontFamily: font, fontSize: clamp(7 * u, 20, 40) }]}>
            {widget.title}
          </Text>
        )}
        <View style={[styles.board, { backgroundColor: withAlpha(palette[c.board], 0.85), borderColor: withAlpha(palette[c.accent], 0.25) }]}>
          {!narrow && (
            <View style={styles.row}>
              {widget.weekdayLabels.map((label, i) => (
                <Text
                  key={label + i}
                  style={[styles.weekday, { width: cell, color: palette[i >= 5 ? c.accent : c.muted], fontFamily: font, fontSize: clamp(bubble * 0.12, 9, 14) }]}
                >
                  {label}
                </Text>
              ))}
            </View>
          )}
          {rows.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cellData, i) => (
                <View key={i} style={[styles.cell, { width: cell, height: cell }]}>
                  {cellData?.kind === 'day' ? (
                    <Day
                      cell={cellData}
                      size={bubble}
                      widget={widget}
                      font={font}
                      weekday={narrow ? widget.weekdayLabels[weekdayIndex(cellData.dateKey)] : undefined}
                      onOpen={openDraw}
                    />
                  ) : cellData?.kind === 'outside' ? (
                    <Text style={{ color: withAlpha(palette[c.muted], 0.35), fontFamily: font, fontSize: bubble * 0.16 }}>
                      {cellData.day}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Day({
  cell,
  size,
  widget,
  font,
  weekday,
  onOpen,
}: {
  cell: DayCell;
  size: number;
  widget: WidgetOf<'calendar'>;
  font: string | undefined;
  weekday: string | undefined;
  onOpen: (dateKey: string) => void;
}) {
  const { palette } = usePageContext();
  const c = widget.colors;
  const isToday = cell.state === 'today';
  const isWon = cell.state === 'won';
  const tappable = isToday || isWon;
  const fs = (k: number) => size * k;
  const text = palette[isToday ? c.onToday : c.text];
  const label = isToday ? widget.todayText : cell.state === 'tomorrow' ? widget.tomorrowText : cell.state === 'soon' ? widget.soonText : '';

  return (
    <Pressable
      disabled={!tappable}
      onPress={() => onOpen(cell.dateKey)}
      accessibilityRole={tappable ? 'button' : undefined}
      accessibilityLabel={`${cell.day} ${widget.prizeText} ${isWon ? widget.wonText : label}`}
      style={({ pressed }) => [
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isToday ? palette[c.today] : withAlpha(palette[c.day], isWon ? 0.75 : 0.5),
          borderColor: cell.special ? palette[c.accent] : withAlpha(palette[c.accent], isToday ? 0 : 0.45),
          borderWidth: cell.special ? 2 : 1,
        },
        pressed && styles.pressed,
      ]}
    >
      {cell.special && (
        <Text numberOfLines={1} style={[styles.badge, { backgroundColor: palette[c.accent], color: palette[c.onToday], fontFamily: font, fontSize: fs(0.07) }]}>
          {cell.special}
        </Text>
      )}
      {isToday ? (
        <Text style={[styles.chip, { color: palette[c.onToday], borderColor: withAlpha(palette[c.onToday], 0.4), fontFamily: font, fontSize: fs(0.075) }]}>
          {widget.todayChip}
        </Text>
      ) : (
        <Text style={{ color: text, fontFamily: font, fontWeight: '800', fontSize: fs(weekday ? 0.17 : 0.15) }}>
          {weekday ? `${weekday} ${cell.day}` : cell.day}
        </Text>
      )}
      {isWon && widget.wonText !== '' && (
        <Text style={[styles.stamp, { color: palette[c.text], borderColor: palette[c.text], fontFamily: font, fontSize: fs(0.07) }]}>
          {widget.wonText}
        </Text>
      )}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.prize,
          { fontFamily: font, fontSize: fs(0.15), color: isToday ? palette[c.today] : palette[c.accent] },
          isToday && { backgroundColor: palette[c.onToday], paddingHorizontal: fs(0.06), borderRadius: fs(0.1), overflow: 'hidden' },
        ]}
      >
        {widget.prizeText}
      </Text>
      {isWon ? (
        widget.watchText !== '' && (
          <Text style={[styles.watch, { backgroundColor: palette[c.accent], color: palette[c.onToday], fontFamily: font, fontSize: fs(0.075), borderRadius: fs(0.08) }]}>
            {'▸ '}
            {widget.watchText}
          </Text>
        )
      ) : (
        label !== '' && (
          <Text numberOfLines={1} style={{ color: isToday ? palette[c.onToday] : palette[c.muted], fontFamily: font, fontSize: fs(0.075), fontWeight: '600' }}>
            {label}
          </Text>
        )
      )}
    </Pressable>
  );
}

function chunk<T>(list: readonly T[], size: number): (T | null)[][] {
  const out: (T | null)[][] = [];
  for (let i = 0; i < list.length; i += size) {
    const row: (T | null)[] = list.slice(i, i + size);
    while (row.length < size) row.push(null);
    out.push(row);
  }
  return out;
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', paddingVertical: 24 },
  title: { fontWeight: '800', marginBottom: 12 },
  board: { borderRadius: 18, borderWidth: 1, paddingVertical: 10 },
  row: { flexDirection: 'row' },
  weekday: { textAlign: 'center', fontWeight: '700', letterSpacing: 1, paddingBottom: 6 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  bubble: { alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 4 },
  badge: { position: 'absolute', top: -4, fontWeight: '900', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  chip: { fontWeight: '800', borderWidth: 1, borderRadius: 8, paddingHorizontal: 5, overflow: 'hidden' },
  stamp: { fontWeight: '900', borderWidth: 1, borderRadius: 3, paddingHorizontal: 3, transform: [{ rotate: '-6deg' }], letterSpacing: 0.5 },
  prize: { fontWeight: '900', textAlign: 'center' },
  watch: { fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  pressed: { opacity: 0.8 },
});
