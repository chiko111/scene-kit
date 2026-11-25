import { useState, type ReactNode } from 'react';
import type { SceneAction, TermsBlock, WidgetOf } from '@chiko111/scene-kit-core/runtime';
import { usePage, useWidgetFont } from '../PageView';
import { colorVars } from './vars';

type Props = { widget: WidgetOf<'terms'> };

/** Called for link spans; undefined = links render as plain text (e.g. outside a page). */
type OnLink = ((action: SceneAction) => void) | undefined;

function Spans({ block, onLink, linksEnabled }: { block: TermsBlock; onLink: OnLink; linksEnabled: boolean }) {
  return (
    <>
      {block.spans.map((span, i) => {
        let el: ReactNode = span.text;
        if (span.italic) el = <em>{el}</em>;
        el = span.bold ? <strong key={i}>{el}</strong> : <span key={i}>{el}</span>;
        const action = span.action;
        if (action && onLink) {
          return (
            <button key={i} type="button" className="skw-link" aria-disabled={!linksEnabled} onClick={() => onLink(action)}>
              {el}
            </button>
          );
        }
        return el;
      })}
    </>
  );
}

const indent = (block: TermsBlock) => (block.level ? { marginInlineStart: `${block.level * 1.4}em` } : undefined);

/** Groups consecutive bullet / numbered blocks into lists (numbering continues within a run). */
export function renderTermsBlocks(blocks: readonly TermsBlock[], onLink?: OnLink, linksEnabled = true): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (!block) break;
    if (block.kind === 'bullet' || block.kind === 'numbered') {
      const kind = block.kind;
      const items: TermsBlock[] = [];
      while (i < blocks.length && blocks[i]?.kind === kind) items.push(blocks[i++] as TermsBlock);
      const lis = items.map((b, j) => (
        <li key={j} style={indent(b)}>
          <Spans block={b} onLink={onLink} linksEnabled={linksEnabled} />
        </li>
      ));
      out.push(kind === 'numbered' ? <ol key={`l${i}`}>{lis}</ol> : <ul key={`l${i}`}>{lis}</ul>);
      continue;
    }
    out.push(
      block.kind === 'heading' ? (
        <h4 key={i} style={indent(block)}>
          <Spans block={block} onLink={onLink} linksEnabled={linksEnabled} />
        </h4>
      ) : (
        <p key={i} style={indent(block)}>
          <Spans block={block} onLink={onLink} linksEnabled={linksEnabled} />
        </p>
      ),
    );
    i++;
  }
  return out;
}

export function TermsWidget({ widget }: Props) {
  const { palette, act, interactive } = usePage();
  const fontFamily = useWidgetFont(widget.font);
  const [open, setOpen] = useState(false);
  const canExpand = widget.blocks.length > widget.previewBlocks;
  const visible = open || !canExpand ? widget.blocks : widget.blocks.slice(0, widget.previewBlocks);
  const c = widget.colors;

  return (
    <div
      className="skw skw-terms"
      style={{ fontFamily, ...colorVars(palette, { bg: c.background, card: c.card, text: c.text, accent: c.accent }) }}
    >
      {widget.title && <h3 className="skw-terms-title">{widget.title}</h3>}
      <div className="skw-terms-card" data-open={open || !canExpand}>
        {visible.length > 0 && <div className="skw-terms-body">{renderTermsBlocks(visible, act, interactive)}</div>}
        {canExpand && (
          <button type="button" className="skw-btn skw-terms-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? widget.collapseLabel : widget.expandLabel} {open ? '▴' : '▾'}
          </button>
        )}
      </div>
    </div>
  );
}
