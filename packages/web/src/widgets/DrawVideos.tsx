import {
  drawDays,
  drawStatus,
  drawVideoUrl,
  fillLabel,
  formatCountdown,
  formatDateKey,
  formatTimeOfDay,
  initialDrawDay,
  weekdayIndex,
  zonedNow,
  type WidgetOf,
  resolveAsset,
} from '@chiko111/scene-kit-core/runtime';
import { useState } from 'react';
import { usePage, useClock, useWidgetFont } from '../PageView';
import { colorVars } from './vars';

type Props = { widget: WidgetOf<'drawVideos'> };

export function DrawVideosWidget({ widget }: Props) {
  const { palette, drawDate, setDrawDate } = usePage();
  const fontFamily = useWidgetFont(widget.font);
  const time = useClock(1000);
  const now = zonedNow(time, widget.timeZone);
  const days = drawDays(widget.startDate, widget.endDate);
  const fallback = initialDrawDay(widget.startDate, widget.endDate, now.dateKey);
  const selected = drawDate && days.includes(drawDate) ? drawDate : fallback;
  const index = days.indexOf(selected);
  const status = drawStatus(selected, now, widget.releaseTime);
  // labels show the official draw time; availability still follows releaseTime
  const releaseText = formatTimeOfDay(widget.announceTime ?? widget.releaseTime);
  const isToday = selected === now.dateKey;
  const [failed, setFailed] = useState<string | null>(null);
  const url = resolveAsset(drawVideoUrl(widget.videoUrlPattern, selected));
  const { labels, colors } = widget;

  const go = (i: number) => {
    const next = days[Math.max(0, Math.min(days.length - 1, i))];
    if (next) setDrawDate(next);
  };

  return (
    <div
      className="skw skw-draws"
      style={{
        fontFamily,
        ...colorVars(palette, {
          bg: colors.background,
          card: colors.card,
          text: colors.text,
          muted: colors.muted,
          accent: colors.accent,
          onAccent: colors.onAccent,
        }),
      }}
    >
      <div className="skw-draws-nav">
        <button type="button" className="skw-btn skw-round" aria-label="‹" disabled={index <= 0} onClick={() => go(index - 1)}>
          ‹
        </button>
        <div className="skw-draws-date" aria-live="polite">
          <span className="skw-draws-label">{labels.drawFor}</span>
          <span className="skw-draws-value">{formatDateKey(selected)}</span>
          <span className="skw-draws-meta">
            {labels.weekdays[weekdayIndex(selected)]}
            {isToday && labels.today && <span className="skw-chip">{labels.today}</span>}
          </span>
        </div>
        <button
          type="button"
          className="skw-btn skw-round"
          aria-label="›"
          disabled={index >= days.length - 1}
          onClick={() => go(index + 1)}
        >
          ›
        </button>
      </div>

      <div className="skw-draws-card" data-status={status.kind}>
        {status.kind === 'released' && failed !== url ? (
          <video
            key={url}
            src={url}
            poster={widget.posterUri ? resolveAsset(widget.posterUri) : undefined}
            controls
            playsInline
            preload="metadata"
            onError={() => setFailed(url)}
          />
        ) : status.kind === 'future' ? (
          <>
            <span className="skw-draws-icon" aria-hidden />
            <p className="skw-draws-msg">{fillLabel(labels.future, { date: formatDateKey(selected), time: releaseText })}</p>
          </>
        ) : (
          <>
            <span className="skw-draws-icon" aria-hidden />
            <p className="skw-draws-msg">{fillLabel(labels.pending, { time: releaseText })}</p>
            {status.kind === 'pending' && <span className="skw-draws-count">{formatCountdown(status.secondsLeft)}</span>}
          </>
        )}
        <span className="skw-draws-badge">{formatDateKey(selected).slice(0, 5)}</span>
      </div>

      {!isToday && days.includes(now.dateKey) && labels.backToToday && (
        <button type="button" className="skw-btn skw-back" onClick={() => setDrawDate(now.dateKey)}>
          → {labels.backToToday}
        </button>
      )}
    </div>
  );
}
