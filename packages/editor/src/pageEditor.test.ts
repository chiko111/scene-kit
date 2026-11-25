import { describe, expect, it } from 'vitest';
import { WIDGET_TYPES, WidgetSchema, parsePage, validatePage, createScene } from '@chiko111/scene-kit-core';
import { termsToText, textToTerms } from './termsText';
import { createSceneSection, createWidget, createWidgetSection } from './widgetDefaults';
import {
  addSection,
  createMobileVariant,
  duplicateSection,
  getSceneVariant,
  moveSection,
  removeSection,
  setSceneVariant,
} from './pageOps';
import { createPage } from './PageEditor';

describe('widget defaults', () => {
  for (const type of WIDGET_TYPES) {
    it(`${type} default passes WidgetSchema`, () => {
      const result = WidgetSchema.safeParse(createWidget(type));
      expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
    });
  }
});

describe('terms text format', () => {
  it('parses headings, bullets, numbered items, paragraphs and bold', () => {
    const blocks = textToTerms('# Правила\n\n1. Първо **важно** нещо\n2. Второ\n- точка\nобикновен текст');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'numbered', 'numbered', 'bullet', 'paragraph']);
    expect(blocks[1]?.spans).toEqual([
      { text: 'Първо ', bold: false },
      { text: 'важно', bold: true },
      { text: ' нещо', bold: false },
    ]);
  });

  it('round-trips', () => {
    const text = '# Заглавие\n1. **Срок:** до 30.11\n2. Второ\n- точка\nабзац';
    expect(termsToText(textToTerms(text))).toBe(text);
  });

  it('ignores empty lines and caps spans', () => {
    const many = Array.from({ length: 50 }, (_, i) => `**b${i}** t`).join('');
    const blocks = textToTerms(`\n\n${many}\n`);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.spans.length).toBeLessThanOrEqual(40);
  });
});

describe('page ops', () => {
  const base = () => {
    const page = createPage('Test');
    return addSection(page, createWidgetSection('calendar', new Set()), null);
  };

  it('a new page + widget section validates strictly', () => {
    expect(validatePage(JSON.parse(JSON.stringify(base()))).ok).toBe(true);
  });

  it('moves, duplicates and removes sections', () => {
    const page = base();
    const [a, b] = page.sections.map((s) => s.id) as [string, string];
    expect(moveSection(page, b, -1).sections.map((s) => s.id)).toEqual([b, a]);
    const dup = duplicateSection(page, a);
    expect(dup.page.sections).toHaveLength(3);
    expect(dup.page.sections[1]?.id).toBe(dup.newId);
    expect(new Set(dup.page.sections.map((s) => s.id)).size).toBe(3);
    expect(removeSection(page, a).sections).toHaveLength(1);
    expect(parsePage(JSON.parse(JSON.stringify(dup.page))).warnings).toEqual([]);
  });

  it('creates, edits and removes a mobile variant', () => {
    let page = addSection(createPage(), createSceneSection(new Set()), null);
    const id = page.sections[1]!.id;
    expect(getSceneVariant(page, id, 'mobile')).toBeNull();
    page = createMobileVariant(page, id);
    const mobile = getSceneVariant(page, id, 'mobile');
    expect(mobile).not.toBeNull();
    expect(mobile?.id).not.toBe(getSceneVariant(page, id, 'desktop')?.id);
    page = setSceneVariant(page, id, 'mobile', { ...createScene('M', 0.5) });
    expect(getSceneVariant(page, id, 'mobile')?.aspectRatio).toBe(0.5);
    page = setSceneVariant(page, id, 'mobile', null);
    expect(getSceneVariant(page, id, 'mobile')).toBeNull();
  });
});
