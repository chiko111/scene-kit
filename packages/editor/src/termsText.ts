import { RouteSchema, WebPathSchema, type SceneAction, type TermsBlock } from '@chiko111/scene-kit-core';

/*
 * Plain-text format for editing terms blocks:
 *   # Heading
 *   - bullet
 *   1. numbered item
 *   anything else = paragraph
 *   2 leading spaces per nesting level (max 3)
 * Inline: **bold**, *italic*, ***both***, links [text](Route /web/path) (web path optional),
 * \* \[ \] \\ for literal characters. One block per line, empty lines are ignored.
 */

type Span = TermsBlock['spans'][number];

const MAX_SPANS = 40;
const MAX_SPAN_TEXT = 4000;
const MAX_LEVEL = 3;

function sameStyle(a: Span, b: Span): boolean {
  return a.bold === b.bold && !!a.italic === !!b.italic && !a.action && !b.action;
}

function makeSpan(text: string, bold: boolean, italic: boolean, action?: SceneAction): Span {
  const span: Span = { text: text.slice(0, MAX_SPAN_TEXT), bold };
  if (italic) span.italic = true;
  if (action) span.action = action;
  return span;
}

/** "[text](Route /path)" target → navigate action, or null if it isn't a valid whitelisted target. */
function linkAction(target: string): SceneAction | null {
  const [route, webPath, ...rest] = target.trim().split(/\s+/);
  if (!route || rest.length > 0 || !RouteSchema.safeParse(route).success) return null;
  if (webPath !== undefined && !WebPathSchema.safeParse(webPath).success) return null;
  return webPath ? { type: 'navigate', route, webPath } : { type: 'navigate', route };
}

/** Parses the inline markup of one line into spans. */
export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  let bold = false;
  let italic = false;
  let buffer = '';

  const flush = () => {
    if (!buffer) return;
    const span = makeSpan(buffer, bold, italic);
    const last = spans[spans.length - 1];
    if (last && sameStyle(last, span)) last.text = (last.text + span.text).slice(0, MAX_SPAN_TEXT);
    else spans.push(span);
    buffer = '';
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i] as string;
    if (c === '\\' && i + 1 < text.length && '*[]\\'.includes(text[i + 1] as string)) {
      buffer += text[i + 1];
      i++;
      continue;
    }
    if (c === '*') {
      flush();
      if (text[i + 1] === '*') {
        bold = !bold;
        i++;
      } else {
        italic = !italic;
      }
      continue;
    }
    if (c === '[') {
      const close = findUnescaped(text, ']', i + 1);
      if (close > i && text[close + 1] === '(') {
        const end = text.indexOf(')', close + 2);
        const action = end > close ? linkAction(text.slice(close + 2, end)) : null;
        const label = unescape(text.slice(i + 1, close));
        if (action && label) {
          flush();
          spans.push(makeSpan(label, bold, italic, action));
          i = end;
          continue;
        }
      }
    }
    buffer += c;
  }
  flush();

  // more spans than allowed: merge the tail into the last one (keeps the text)
  if (spans.length > MAX_SPANS) {
    const tail = spans.splice(MAX_SPANS - 1);
    spans.push(makeSpan(tail.map((s) => s.text).join(''), false, false));
  }
  return spans;
}

function findUnescaped(text: string, ch: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text[i] === ch) return i;
  }
  return -1;
}

function unescape(text: string): string {
  return text.replace(/\\([*[\]\\])/g, '$1');
}

function escape(text: string): string {
  return text.replace(/([*[\]\\])/g, '\\$1');
}

function spanToText(span: Span): string {
  let body = escape(span.text);
  if (span.action?.type === 'navigate') {
    body = `[${body}](${span.action.route}${span.action.webPath ? ` ${span.action.webPath}` : ''})`;
  }
  const marks = (span.bold ? '**' : '') + (span.italic ? '*' : '');
  // closing marks mirror the opening ones (italic closes first)
  const closing = (span.italic ? '*' : '') + (span.bold ? '**' : '');
  return marks + body + closing;
}

export function textToTerms(text: string): TermsBlock[] {
  const blocks: TermsBlock[] = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const indent = raw.length - raw.trimStart().length;
    const level = Math.min(MAX_LEVEL, Math.floor(indent / 2));
    const line = raw.trim();
    let kind: TermsBlock['kind'] = 'paragraph';
    let body = line;
    if (line.startsWith('# ')) {
      kind = 'heading';
      body = line.slice(2);
    } else if (line.startsWith('- ')) {
      kind = 'bullet';
      body = line.slice(2);
    } else if (/^\d+\.\s/.test(line)) {
      kind = 'numbered';
      body = line.replace(/^\d+\.\s+/, '');
    }
    const spans = parseInline(body.trim());
    if (spans.length === 0) continue;
    const block: TermsBlock = { kind, spans };
    if (level > 0) block.level = level;
    blocks.push(block);
  }
  return blocks;
}

export function termsToText(blocks: readonly TermsBlock[]): string {
  // numbering restarts after a non-numbered block; each level counts on its own
  const counters = [0, 0, 0, 0];
  return blocks
    .map((block) => {
      const level = Math.min(MAX_LEVEL, block.level ?? 0);
      const body = block.spans.map(spanToText).join('');
      const pad = '  '.repeat(level);
      for (let l = level + 1; l <= MAX_LEVEL; l++) counters[l] = 0;
      if (block.kind !== 'numbered') counters[level] = 0;
      switch (block.kind) {
        case 'heading':
          return `${pad}# ${body}`;
        case 'bullet':
          return `${pad}- ${body}`;
        case 'numbered':
          counters[level] = (counters[level] ?? 0) + 1;
          return `${pad}${counters[level]}. ${body}`;
        case 'paragraph':
          return `${pad}${body}`;
      }
    })
    .join('\n');
}
