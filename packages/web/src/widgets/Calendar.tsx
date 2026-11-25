import { calendarCells, weekdayIndex, zonedNow, type CalendarCell, type WidgetOf } from '@chiko111/scene-kit-core/runtime';
import { usePage, useClock, useWidgetFont } from '../PageView';
import { colorVars } from './vars';

type Props = { widget: WidgetOf<'calendar'> };

function DayCell({ cell, widget, onOpen }: { cell: Extract<CalendarCell, { kind: 'day' }>; widget: Props['widget']; onOpen: (dateKey: string) => void }) {
  const tappable = cell.state === 'won' || cell.state === 'today';
  const content = (
    <>
      {cell.special && <span className="skw-day-special">{cell.special}</span>}
      {cell.state === 'today' ? (
        widget.todayChip && <span className="skw-day-chip">{widget.todayChip}</span>
      ) : (
        <span className="skw-day-num">
          {/* weekday name: only shown in the narrow (phone) layout, where the header row is hidden */}
          <span className="skw-day-wd">{widget.weekdayLabels[weekdayIndex(cell.dateKey)]} </span>
          {cell.day}
        </span>
      )}
      {cell.state === 'won' && widget.wonText && <span className="skw-day-stamp">{widget.wonText}</span>}
      <span className="skw-day-prize">{widget.prizeText}</span>
      {cell.state === 'won' && widget.watchText && <span className="skw-day-watch">▸ {widget.watchText}</span>}
      {cell.state === 'today' && widget.todayText && <span className="skw-day-note">{widget.todayText}</span>}
      {cell.state === 'tomorrow' && widget.tomorrowText && <span className="skw-day-note">{widget.tomorrowText}</span>}
      {cell.state === 'soon' && widget.soonText && <span className="skw-day-note">🔒 {widget.soonText}</span>}
    </>
  );
  const common = {
    className: tappable ? 'skw-btn skw-day' : 'skw-day',
    'data-state': cell.state,
    'data-special': cell.special !== null,
    'data-tappable': tappable,
  };
  return tappable ? (
    <button type="button" {...common} aria-label={`${cell.day} – ${widget.prizeText}`} onClick={() => onOpen(cell.dateKey)}>
      {content}
    </button>
  ) : (
    <div {...common} aria-label={`${cell.day} – ${widget.prizeText}`}>
      {content}
    </div>
  );
}

export function CalendarWidget({ widget }: Props) {
  const { palette, showDraw } = usePage();
  const fontFamily = useWidgetFont(widget.font);
  const time = useClock(60_000);
  const today = zonedNow(time, widget.timeZone).dateKey;
  const weeks = calendarCells({ ...widget, today });
  const c = widget.colors;

  return (
    <div
      className="skw skw-cal"
      style={{
        fontFamily,
        ...colorVars(palette, {
          bg: c.background,
          board: c.board,
          day: c.day,
          text: c.text,
          muted: c.muted,
          accent: c.accent,
          today: c.today,
          onToday: c.onToday,
        }),
      }}
    >
      {widget.title && <h2 className="skw-cal-title">{widget.title}</h2>}
      <div className="skw-cal-board">
        <div className="skw-cal-grid" role="grid">
          {widget.weekdayLabels.map((label, i) => (
            <div key={`h${i}`} className="skw-cal-head" data-weekend={i >= 5} role="columnheader">
              {label}
            </div>
          ))}
          {weeks.flat().map((cell, i) =>
            cell.kind === 'day' ? (
              <DayCell key={cell.dateKey} cell={cell} widget={widget} onOpen={showDraw} />
            ) : cell.kind === 'outside' ? (
              <span key={`o${i}`} className="skw-day-out">
                {cell.day}
              </span>
            ) : (
              <span key={`e${i}`} aria-hidden />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
