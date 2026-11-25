import { resolveAsset } from '@chiko111/scene-kit-core/runtime';
import { useEffect, useRef, useState } from 'react';
import type { WidgetOf } from '@chiko111/scene-kit-core/runtime';
import { usePage, useWidgetFont } from '../PageView';
import { colorVars } from './vars';

type Props = { widget: WidgetOf<'gameCarousel'> };

export function GameCarouselWidget({ widget }: Props) {
  const { palette, act, interactive } = usePage();
  const fontFamily = useWidgetFont(widget.font);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(Math.floor((widget.games.length - 1) / 2));

  const scrollTo = (i: number, smooth: boolean) => {
    const track = trackRef.current;
    const card = track?.children[i] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth ? 'smooth' : 'instant' });
  };

  // open on the middle game
  useEffect(() => {
    const track = trackRef.current;
    const card = track?.children[Math.floor((widget.games.length - 1) / 2)] as HTMLElement | undefined;
    if (track && card) track.scrollLeft = card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2;
  }, [widget.games.length]);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(track.children).forEach((el, i) => {
      const card = el as HTMLElement;
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  };

  const showFooter = widget.ctaLabel.length > 0 && widget.ctaAction !== null;
  const ctaAction = widget.ctaAction;

  return (
    <div
      className="skw skw-games"
      style={{
        fontFamily,
        ...colorVars(palette, { bg: widget.background, text: widget.colors.text, accent: widget.colors.accent, onAccent: widget.colors.onAccent }),
      }}
    >
      {widget.backgroundUri && <img className="skw-bgimg" src={resolveAsset(widget.backgroundUri)} alt="" aria-hidden draggable={false} />}
      {widget.title && <h2 className="skw-games-title">{widget.title}</h2>}
      <div className="skw-games-stage">
        <button type="button" className="skw-btn skw-round skw-arrow" data-dir="prev" aria-label="‹" onClick={() => scrollTo(Math.max(0, active - 1), true)}>
          ‹
        </button>
        <div ref={trackRef} className="skw-games-track" onScroll={onScroll}>
          {widget.games.map((game, i) => (
            <button
              key={game.id}
              type="button"
              className="skw-btn skw-game"
              data-active={i === active}
              aria-label={game.name}
              aria-disabled={!interactive}
              onClick={() => (i === active ? act(game.action) : scrollTo(i, true))}
            >
              <img src={resolveAsset(game.imageUri)} alt="" draggable={false} loading="lazy" decoding="async" />
              {game.badgeUri && <img className="skw-game-badge" src={resolveAsset(game.badgeUri)} alt="" aria-hidden draggable={false} loading="lazy" />}
              {i === active && widget.playLabel && <span className="skw-game-play">{widget.playLabel}</span>}
              <span className="skw-game-name">{game.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="skw-btn skw-round skw-arrow"
          data-dir="next"
          aria-label="›"
          onClick={() => scrollTo(Math.min(widget.games.length - 1, active + 1), true)}
        >
          ›
        </button>
      </div>
      {showFooter && ctaAction && (
        <div className="skw-games-foot">
          {widget.ctaText && <span>{widget.ctaText}</span>}
          <button type="button" className="skw-btn skw-cta" aria-disabled={!interactive} onClick={() => act(ctaAction)}>
            {widget.ctaLabel}
          </button>
        </div>
      )}
    </div>
  );
}
