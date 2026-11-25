import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { withAlpha, type SceneAction, type TermsBlock, type WidgetOf } from '@chiko111/scene-kit-core/runtime';
import { usePageContext } from '../pageContext';
import { fontOf } from './shared';

/** Terms & conditions: rich text blocks (bold / italic / link spans, nesting levels), collapsed to previewBlocks. */
export function Terms({ widget }: { widget: WidgetOf<'terms'> }) {
  const { palette, fonts, fontFamily, width, onAction } = usePageContext();
  const [open, setOpen] = useState(false);
  const font = fontOf(fonts, widget.font, fontFamily);
  const c = widget.colors;
  const visible = open ? widget.blocks : widget.blocks.slice(0, widget.previewBlocks);
  const hasMore = widget.blocks.length > widget.previewBlocks;

  // numbering per nesting level; a shallower block resets deeper counters,
  // a non-numbered block at the same level restarts that level
  const counters = [0, 0, 0, 0];
  const numbers = widget.blocks.map((b) => {
    const level = b.level ?? 0;
    for (let l = level + 1; l < counters.length; l++) counters[l] = 0;
    if (b.kind === 'numbered') return ++counters[level]!;
    counters[level] = 0;
    return 0;
  });

  return (
    <View style={[styles.root, { backgroundColor: c.background ? palette[c.background] : undefined }]}>
      <View style={{ width: Math.min(width - 24, 900) }}>
        {widget.title !== '' && <Text style={[styles.title, { color: palette[c.text], fontFamily: font }]}>{widget.title}</Text>}
        <View style={[styles.card, { backgroundColor: palette[c.card], borderColor: withAlpha(palette[c.text], 0.12) }]}>
          {visible.map((block, i) => (
            <Block key={i} block={block} number={numbers[i] ?? 0} color={palette[c.text]} linkColor={palette[c.accent]} font={font} onAction={onAction} />
          ))}
          {hasMore && (
            <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
              <Text style={[styles.toggleText, { color: palette[c.accent], fontFamily: font }]}>
                {open ? widget.collapseLabel : widget.expandLabel} {open ? '⌃' : '⌄'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function Block({
  block,
  number,
  color,
  linkColor,
  font,
  onAction,
}: {
  block: TermsBlock;
  number: number;
  color: string;
  linkColor: string;
  font: string | undefined;
  onAction: ((action: SceneAction) => void) | undefined;
}) {
  const spans = block.spans.map((s, i) => {
    const action = s.action;
    return (
      <Text
        key={i}
        style={[s.bold && styles.bold, s.italic && styles.italic, action && [styles.link, { color: linkColor }]]}
        onPress={action && onAction ? () => onAction(action) : undefined}
        accessibilityRole={action ? 'link' : undefined}
      >
        {s.text}
      </Text>
    );
  });
  const indent = { marginLeft: (block.level ?? 0) * 18 };
  if (block.kind === 'heading') return <Text style={[styles.heading, indent, { color, fontFamily: font }]}>{spans}</Text>;
  if (block.kind === 'paragraph') return <Text style={[styles.text, indent, { color, fontFamily: font }]}>{spans}</Text>;
  return (
    <View style={[styles.item, indent]}>
      <Text style={[styles.text, styles.marker, { color, fontFamily: font }]}>{block.kind === 'numbered' ? `${number}.` : '•'}</Text>
      <Text style={[styles.text, styles.itemText, { color, fontFamily: font }]}>{spans}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', paddingVertical: 24 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  card: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  heading: { fontSize: 15, fontWeight: '800', marginTop: 8, marginBottom: 4 },
  text: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
  link: { textDecorationLine: 'underline' },
  item: { flexDirection: 'row', gap: 6 },
  marker: { minWidth: 18 },
  itemText: { flex: 1 },
  toggle: { alignItems: 'center', paddingVertical: 12 },
  toggleText: { fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  pressed: { opacity: 0.7 },
});
