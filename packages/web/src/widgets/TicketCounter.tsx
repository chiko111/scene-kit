import { resolveAsset } from '@chiko111/scene-kit-core/runtime';
import type { WidgetOf } from '@chiko111/scene-kit-core/runtime';
import { usePage, useWidgetFont } from '../PageView';
import { colorVars } from './vars';

export function TicketCounterWidget({ widget }: { widget: WidgetOf<'ticketCounter'> }) {
  const { palette, user, act, interactive } = usePage();
  const fontFamily = useWidgetFont(widget.font);
  const value = user.fields?.[widget.field];
  const boxStyle = widget.boxUri ? { backgroundImage: `url("${resolveAsset(widget.boxUri)}")` } : undefined;

  return (
    <div
      className="skw skw-ticket"
      style={{
        aspectRatio: widget.aspectRatio,
        fontFamily,
        ...colorVars(palette, { bg: widget.background, text: widget.textColor, number: widget.numberColor }),
      }}
    >
      {widget.backgroundUri && <img className="skw-bgimg" src={resolveAsset(widget.backgroundUri)} alt="" aria-hidden draggable={false} />}
      {user.loggedIn ? (
        <>
          <p className="skw-ticket-text">{widget.userText}</p>
          <div className="skw-ticket-box" style={boxStyle} role="status" aria-label={`${widget.userText} ${value ?? 0}`}>
            <span>{String(value ?? 0)}</span>
          </div>
        </>
      ) : (
        <>
          <p className="skw-ticket-text">{widget.guestText}</p>
          <button
            type="button"
            className="skw-btn skw-ticket-box"
            style={boxStyle}
            aria-label={widget.guestText}
            aria-disabled={!interactive}
            onClick={() => act(widget.loginAction)}
          />
        </>
      )}
    </div>
  );
}
