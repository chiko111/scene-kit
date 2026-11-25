import { useActionState, useEffect, useEffectEvent, useState } from 'react';
import {
  COLOR_TOKENS,
  MAX_SECTIONS,
  MAX_SLIDES,
  SLIDER_TRANSITIONS,
  PAGE_VERSION,
  WIDGET_TYPES,
  createId,
  createScene,
  parsePage,
  serializePage,
  validatePage,
  type ColorToken,
  type FontMap,
  type Page,
  type PageSection,
  type ParseIssue,
  type Scene,
  type Widget,
  type WidgetType,
} from '@chiko111/scene-kit-core';
import { PageView } from '@chiko111/scene-kit-web';
import { CheckboxField, ColorField, NumberField, Section, SelectField, TextField } from './fields';
import { focusSceneHistory, useHistory } from './history';
import {
  addSection,
  addSlide,
  createMobileVariant,
  createSliderMobile,
  createSliderSection,
  createTemplateSceneSection,
  createWidgetMobileVariant,
  duplicateSection,
  duplicateSlide,
  getSceneVariant,
  getSlideScene,
  getWidgetVariant,
  moveSection,
  moveSlide,
  removeSection,
  removeSlide,
  removeSliderMobile,
  sectionIds,
  setSceneVariant,
  setSlideScene,
  setWidgetVariant,
  updateSliderSettings,
  type SceneVariant,
  type SliderSection,
} from './pageOps';
import type { AnimationPreset } from './presets';
import { SCENE_TEMPLATES } from './templates';
import { SceneEditor } from './SceneEditor';
import { EDITOR_CSS, PAGE_EDITOR_CSS } from './styles';
import { WidgetForm } from './WidgetForm';
import { WIDGET_LABELS, createWidgetSection } from './widgetDefaults';
import type { Palette } from '@chiko111/scene-kit-core';

export type PageEditorProps = {
  /** Must already be validated with parsePage(). */
  initialPage?: Page;
  palette: Palette;
  /** Whitelisted screens for "navigate" actions. */
  routes?: readonly string[];
  /** Persist the page. Receives a strictly re-validated page. Throw to show an error. */
  onSave?: (page: Page) => Promise<void>;
  onUpload?: (file: File) => Promise<string>;
  maxUploadBytes?: number;
  fontFamily?: string;
  fonts?: FontMap;
  /** Saved animation presets (see SceneEditor). */
  presets?: readonly AnimationPreset[];
  onSavePreset?: (preset: AnimationPreset) => void;
};

type Tab = 'edit' | 'preview' | 'json';
type SaveState = { status: 'idle' } | { status: 'saved'; at: string } | { status: 'error'; message: string };

const NO_ROUTES: readonly string[] = [];
const PREFS_KEY = 'scene-kit-editor:page-prefs';

type Prefs = { advanced: boolean; rail: boolean };

function readPrefs(): Prefs {
  const wide = typeof window !== 'undefined' && window.innerWidth >= 1600;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Prefs>;
      return { advanced: v.advanced === true, rail: typeof v.rail === 'boolean' ? v.rail : wide };
    }
  } catch {
    // storage blocked – defaults
  }
  return { advanced: false, rail: wide };
}

const SECTION_ICON: Record<PageSection['kind'], string> = { scene: '▦', slider: '⇆', widget: '⚙' };

function sectionLabel(s: PageSection): string {
  return s.kind === 'scene' ? s.scene.name || 'Scene' : s.kind === 'slider' ? `Slider · ${s.slides.length} slides` : WIDGET_LABELS[s.widget.type];
}

/** Desktop / Mobile switch shared by every section kind. */
function VariantSwitch({
  variant,
  hasMobile,
  onChange,
}: {
  variant: SceneVariant;
  hasMobile: boolean;
  onChange: (v: SceneVariant) => void;
}) {
  return (
    <span className="ske-seg" role="group" aria-label="Layout">
      <button type="button" aria-pressed={variant === 'desktop'} onClick={() => onChange('desktop')}>
        Desktop
      </button>
      <button type="button" aria-pressed={variant === 'mobile'} onClick={() => onChange('mobile')} title={hasMobile ? 'Phone layout' : 'No phone layout yet – the desktop one is scaled down'}>
        Mobile{hasMobile ? '' : ' (none)'}
      </button>
    </span>
  );
}

export function createPage(name = 'Promo page'): Page {
  return {
    version: PAGE_VERSION,
    id: createId('page'),
    name,
    background: 'background',
    mobileBreakpoint: 600,
    maxWidth: 1400,
    sections: [{ kind: 'scene', id: createId('sec'), scene: createScene('Hero', 16 / 9), mobileScene: null }],
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

const NONE = '__none__';
const BG_OPTIONS = [{ value: NONE, label: 'None' }, ...COLOR_TOKENS.map((t) => ({ value: t as string, label: t }))];

export function PageEditor({
  initialPage,
  palette,
  routes: routesProp,
  onSave,
  onUpload,
  maxUploadBytes,
  fontFamily,
  fonts,
  presets,
  onSavePreset,
}: PageEditorProps) {
  const routes = routesProp ?? NO_ROUTES;
  const history = useHistory<Page>(initialPage ?? createPage());
  const page = history.present;
  const [selectedId, setSelectedId] = useState<string | null>(page.sections[0]?.id ?? null);
  const [variant, setVariant] = useState<SceneVariant>('desktop');
  const [tab, setTab] = useState<Tab>('edit');
  const [addType, setAddType] = useState<WidgetType>('calendar');
  const [previewWidth, setPreviewWidth] = useState<390 | 1280>(1280);
  const [previewLoggedIn, setPreviewLoggedIn] = useState(false);
  const [template, setTemplate] = useState('');
  const [slideId, setSlideId] = useState<string | null>(null);
  const [sliderSettings, setSliderSettings] = useState(false);
  const [prefs, setPrefs] = useState(readPrefs);
  const setPref = (patch: Partial<Prefs>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  const { advanced } = prefs;
  const shownTab: Tab = tab === 'json' && !advanced ? 'edit' : tab;

  const selected = page.sections.find((s) => s.id === selectedId) ?? null;
  const session = { begin: history.beginGesture, end: history.endGesture };
  const canAdd = page.sections.length < MAX_SECTIONS;

  const select = (id: string | null) => {
    setSelectedId(id);
    setVariant('desktop');
    setTab('edit');
    setSliderSettings(false);
    const section = page.sections.find((x) => x.id === id);
    setSlideId(section?.kind === 'slider' ? (section.slides[0]?.id ?? null) : null);
  };

  const add = (section: PageSection) => {
    history.apply((p) => addSection(p, section, selectedId));
    setSelectedId(section.id);
    setVariant('desktop');
    setTab('edit');
    setSliderSettings(false);
    setSlideId(section.kind === 'slider' ? (section.slides[0]?.id ?? null) : null);
  };

  const slider: SliderSection | null = selected?.kind === 'slider' ? selected : null;
  const activeSlide = slider ? (slider.slides.find((x) => x.id === slideId) ?? slider.slides[0] ?? null) : null;
  const sliderHasMobile = slider ? slider.slides.some((x) => x.mobileScene) : false;

  // Single undo stack: the scene editor edits the page through this focused view.
  const sceneScene: Scene | null = selected?.kind === 'scene' ? getSceneVariant(page, selected.id, variant) : null;
  const sceneHistory =
    selected?.kind === 'scene' && sceneScene
      ? focusSceneHistory(
          history,
          (p) => getSceneVariant(p, selected.id, variant) ?? sceneScene,
          (p, scene) => setSceneVariant(p, selected.id, variant, scene),
        )
      : null;
  const slideScene: Scene | null = slider && activeSlide ? getSlideScene(page, slider.id, activeSlide.id, variant) : null;
  const slideHistory =
    slider && activeSlide && slideScene
      ? focusSceneHistory(
          history,
          (p) => getSlideScene(p, slider.id, activeSlide.id, variant) ?? slideScene,
          (p, scene) => setSlideScene(p, slider.id, activeSlide.id, variant, scene),
        )
      : null;
  const widgetValue: Widget | null = selected?.kind === 'widget' ? getWidgetVariant(page, selected.id, variant) : null;
  const sceneProps = { palette, routes, onUpload, maxUploadBytes, fontFamily, fonts, presets, onSavePreset, advanced };

  // Page-level undo shortcuts (the scene editor handles its own while it is mounted).
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((sceneHistory || slideHistory) && shownTab === 'edit' && !sliderSettings) return;
    if (isEditableTarget(event.target)) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (mod && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
    } else if (mod && key === 'y') {
      event.preventDefault();
      history.redo();
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const [saveState, saveAction, saving] = useActionState<SaveState>(async () => {
    if (!onSave) return { status: 'error', message: 'Saving is not configured' };
    const result = validatePage(JSON.parse(JSON.stringify(page)));
    if (!result.ok) return { status: 'error', message: result.errors.slice(0, 3).join('; ') };
    try {
      await onSave(result.page);
      return { status: 'saved', at: new Date().toLocaleTimeString() };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Save failed' };
    }
  }, { status: 'idle' });

  return (
    <div className="skp-root">
      <style href="scene-kit-editor" precedence="medium">
        {EDITOR_CSS}
      </style>
      <style href="scene-kit-page-editor" precedence="medium">
        {PAGE_EDITOR_CSS}
      </style>

      <header className="skp-top">
        <div className="ske-tabs skp-tabs" role="tablist">
          {(advanced ? (['edit', 'preview', 'json'] as const) : (['edit', 'preview'] as const)).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={shownTab === t} onClick={() => setTab(t)}>
              {t === 'edit' ? 'Edit' : t === 'preview' ? 'Preview' : 'JSON'}
            </button>
          ))}
        </div>
        <label className="skp-adv" title="Show technical tools: JSON, ids, exact sizes and breakpoints">
          <input type="checkbox" checked={advanced} onChange={(e) => setPref({ advanced: e.target.checked })} /> Advanced
        </label>
        <button type="button" className="ske-btn" disabled={!history.canUndo} onClick={history.undo}>
          Undo
        </button>
        <button type="button" className="ske-btn" disabled={!history.canRedo} onClick={history.redo}>
          Redo
        </button>
        {onSave && (
          <form action={saveAction}>
            <button type="submit" className="ske-btn ske-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save page'}
            </button>
          </form>
        )}
        {saveState.status === 'saved' && <span className="ske-ok">Saved {saveState.at}</span>}
        {saveState.status === 'error' && (
          <span className="ske-error skp-save-error" role="alert">
            {saveState.message}
          </span>
        )}
      </header>

      <div className="skp-body" data-rail={prefs.rail ? 'open' : 'closed'}>
        {!prefs.rail ? (
          <aside className="ske-panel skp-sections" aria-label="Sections">
            <div className="skp-rail-icons">
              <button type="button" onClick={() => setPref({ rail: true })} aria-label="Show sections panel" title="Show sections">
                »
              </button>
              {page.sections.map((s, i) => (
                <button key={s.id} type="button" aria-pressed={s.id === selectedId} title={`${i + 1}. ${sectionLabel(s)}`} onClick={() => select(s.id)}>
                  {SECTION_ICON[s.kind]}
                  {i + 1}
                </button>
              ))}
            </div>
          </aside>
        ) : (
        <aside className="ske-panel skp-sections">
          <div className="skp-rail-head">
            <h3>Sections ({page.sections.length}/{MAX_SECTIONS})</h3>
            <button type="button" className="ske-icon-btn" onClick={() => setPref({ rail: false })} aria-label="Collapse sections panel" title="Collapse – more room for the canvas">
              «
            </button>
          </div>
          <div className="ske-section">
            <ul className="ske-layers">
              {page.sections.map((s, i) => (
                <li key={s.id} className={s.id === selectedId ? 'ske-layer is-selected' : 'ske-layer'}>
                  <button type="button" className="ske-layer-name" onClick={() => select(s.id)}>
                    <span className="ske-layer-icon">{SECTION_ICON[s.kind]}</span>
                    <span>
                      {sectionLabel(s)}
                      {(s.kind === 'scene' && s.mobileScene) ||
                      (s.kind === 'widget' && s.mobileWidget) ||
                      (s.kind === 'slider' && s.slides.some((x) => x.mobileScene))
                        ? ' · +mobile'
                        : ''}
                    </span>
                  </button>
                  <span className="ske-layer-tools">
                    <button type="button" className="ske-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => history.apply((p) => moveSection(p, s.id, -1))}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ske-icon-btn"
                      aria-label="Move down"
                      disabled={i === page.sections.length - 1}
                      onClick={() => history.apply((p) => moveSection(p, s.id, 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ske-icon-btn"
                      aria-label="Duplicate section"
                      disabled={!canAdd}
                      onClick={() => {
                        const { page: next, newId } = duplicateSection(page, s.id);
                        if (!newId) return;
                        history.apply(() => next);
                        select(newId);
                      }}
                    >
                      ⧉
                    </button>
                    <button
                      type="button"
                      className="ske-icon-btn is-danger"
                      aria-label="Delete section"
                      onClick={() => {
                        history.apply((p) => removeSection(p, s.id));
                        if (s.id === selectedId) setSelectedId(null);
                      }}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {page.sections.length === 0 && <p className="ske-muted">No sections yet.</p>}
          </div>

          <details className="skp-details" open={page.sections.length === 0 || undefined}>
            <summary>+ Add section</summary>
            <div className="ske-section-body">
            <SelectField
              label="Start from"
              value={template}
              options={[{ value: '', label: 'Blank scene' }, ...SCENE_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))]}
              onChange={setTemplate}
              wide
            />
            {template && <small className="ske-hint">{SCENE_TEMPLATES.find((t) => t.id === template)?.description}</small>}
            <div className="ske-row">
              <button type="button" className="ske-btn" disabled={!canAdd} onClick={() => add(createTemplateSceneSection(sectionIds(page), template || undefined))}>
                + Scene section
              </button>
              <button type="button" className="ske-btn" disabled={!canAdd} onClick={() => add(createSliderSection(sectionIds(page)))}>
                + Slider section
              </button>
            </div>
            <div className="skp-add-widget">
              <SelectField
                label="Widget"
                value={addType}
                options={WIDGET_TYPES.map((t) => ({ value: t, label: WIDGET_LABELS[t] }))}
                onChange={setAddType}
              />
              <button type="button" className="ske-btn" disabled={!canAdd} onClick={() => add(createWidgetSection(addType, sectionIds(page)))}>
                + Widget
              </button>
            </div>
            {!canAdd && <p className="ske-error">Limit of {MAX_SECTIONS} sections reached.</p>}
            </div>
          </details>

          <details className="skp-details">
            <summary>Page settings</summary>
            <div className="ske-section-body">
            <TextField label="Name" value={page.name} maxLength={120} session={session} onChange={(name) => history.apply((p) => ({ ...p, name }))} />
            <SelectField
              label="Background"
              value={page.background ?? NONE}
              options={BG_OPTIONS}
              onChange={(v) => history.apply((p) => ({ ...p, background: v === NONE ? null : (v as ColorToken) }))}
            />
            {advanced && <div className="ske-grid">
              <NumberField
                label="Mobile below (px)"
                value={page.mobileBreakpoint}
                min={200}
                max={2000}
                step={10}
                session={session}
                onChange={(v) => history.apply((p) => ({ ...p, mobileBreakpoint: Math.round(v) }))}
              />
              <NumberField
                label="Max width (px)"
                value={page.maxWidth}
                min={320}
                max={4000}
                step={10}
                session={session}
                onChange={(v) => history.apply((p) => ({ ...p, maxWidth: Math.round(v) }))}
              />
            </div>}
            </div>
          </details>
        </aside>
        )}

        <main className="skp-main">
          {shownTab === 'edit' &&
            (!selected ? (
              <p className="ske-muted skp-empty">Select or add a section.</p>
            ) : selected.kind === 'scene' ? (
              <div className="skp-scene">
                <div className="ske-toolbar skp-context">
                  <strong>{selected.scene.name || 'Scene'}</strong>
                  <span className="ske-spacer" />
                  {variant === 'mobile' && selected.mobileScene && (
                    <button
                      type="button"
                      className="ske-btn"
                      onClick={() => {
                        history.apply((p) => setSceneVariant(p, selected.id, 'mobile', null));
                        setVariant('desktop');
                      }}
                    >
                      Remove mobile version
                    </button>
                  )}
                  <VariantSwitch variant={variant} hasMobile={!!selected.mobileScene} onChange={setVariant} />
                </div>
                {sceneHistory ? (
                  <SceneEditor key={`${selected.id}-${variant}`} history={sceneHistory} {...sceneProps} />
                ) : (
                  <div className="skp-empty">
                    <p className="ske-muted">This section has no mobile version – the desktop scene is scaled down on phones.</p>
                    <button type="button" className="ske-btn ske-btn-primary" onClick={() => history.apply((p) => createMobileVariant(p, selected.id))}>
                      Create mobile version (copy of desktop)
                    </button>
                  </div>
                )}
              </div>
            ) : selected.kind === 'slider' && slider ? (
              <div className="skp-scene">
                <div className="ske-toolbar skp-context skp-slides" aria-label="Slides">
                  <span className="ske-muted">Slides</span>
                  {slider.slides.map((slide, i) => (
                    <span key={slide.id} className={slide.id === activeSlide?.id && !sliderSettings ? 'skp-slide is-selected' : 'skp-slide'}>
                      <button
                        type="button"
                        className="ske-btn ske-btn-small"
                        aria-pressed={slide.id === activeSlide?.id && !sliderSettings}
                        onClick={() => {
                          setSlideId(slide.id);
                          setSliderSettings(false);
                        }}
                      >
                        {i + 1}
                      </button>
                      <button type="button" className="ske-icon-btn" aria-label={`Move slide ${i + 1} left`} disabled={i === 0} onClick={() => history.apply((p) => moveSlide(p, slider.id, slide.id, -1))}>
                        ‹
                      </button>
                      <button
                        type="button"
                        className="ske-icon-btn"
                        aria-label={`Move slide ${i + 1} right`}
                        disabled={i === slider.slides.length - 1}
                        onClick={() => history.apply((p) => moveSlide(p, slider.id, slide.id, 1))}
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        className="ske-icon-btn"
                        aria-label={`Duplicate slide ${i + 1}`}
                        disabled={slider.slides.length >= MAX_SLIDES}
                        onClick={() => {
                          const r = duplicateSlide(page, slider.id, slide.id);
                          if (!r.slideId) return;
                          history.apply(() => r.page);
                          setSlideId(r.slideId);
                        }}
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="ske-icon-btn is-danger"
                        aria-label={`Delete slide ${i + 1}`}
                        disabled={slider.slides.length <= 1}
                        onClick={() => {
                          history.apply((p) => removeSlide(p, slider.id, slide.id));
                          if (slide.id === activeSlide?.id) setSlideId(slider.slides.find((x) => x.id !== slide.id)?.id ?? null);
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="ske-btn ske-btn-small"
                    disabled={slider.slides.length >= MAX_SLIDES}
                    onClick={() => {
                      const r = addSlide(page, slider.id, activeSlide?.id ?? null, template || undefined);
                      if (!r.slideId) return;
                      history.apply(() => r.page);
                      setSlideId(r.slideId);
                      setSliderSettings(false);
                    }}
                    title={template ? `New slide from “${SCENE_TEMPLATES.find((t) => t.id === template)?.name}”` : 'Copy of the current slide'}
                  >
                    + Slide{template ? ' (template)' : ''}
                  </button>
                  <button type="button" className="ske-btn ske-btn-small" aria-pressed={sliderSettings} onClick={() => setSliderSettings((v) => !v)}>
                    Slider settings
                  </button>
                  <span className="ske-spacer" />
                  {!sliderSettings && (
                  <>
                    {variant === 'mobile' && sliderHasMobile && (
                      <button
                        type="button"
                        className="ske-btn"
                        onClick={() => {
                          history.apply((p) => removeSliderMobile(p, slider.id));
                          setVariant('desktop');
                        }}
                      >
                        Remove mobile versions (all slides)
                      </button>
                    )}
                    <VariantSwitch variant={variant} hasMobile={sliderHasMobile} onChange={setVariant} />
                  </>
                  )}
                </div>
                {sliderSettings ? (
                  <div className="ske-panel skp-widget">
                    <SliderSettingsForm slider={slider} palette={palette} session={session} onChange={(patch) => history.apply((p) => updateSliderSettings(p, slider.id, patch))} />
                  </div>
                ) : slideHistory && activeSlide ? (
                  <SceneEditor key={`${slider.id}-${activeSlide.id}-${variant}`} history={slideHistory} {...sceneProps} />
                ) : (
                  <div className="skp-empty">
                    <p className="ske-muted">No mobile versions yet – the desktop slides are scaled down on phones. Mobile versions are created for every slide at once.</p>
                    <button type="button" className="ske-btn ske-btn-primary" onClick={() => history.apply((p) => createSliderMobile(p, slider.id))}>
                      Create mobile versions (copies of desktop)
                    </button>
                  </div>
                )}
              </div>
            ) : selected.kind === 'widget' ? (
              <div className="skp-scene">
                <div className="ske-toolbar skp-context">
                  <strong>{WIDGET_LABELS[selected.widget.type]}</strong>
                  <span className="ske-spacer" />
                  {variant === 'mobile' && selected.mobileWidget && (
                    <button
                      type="button"
                      className="ske-btn"
                      onClick={() => {
                        history.apply((p) => setWidgetVariant(p, selected.id, 'mobile', null));
                        setVariant('desktop');
                      }}
                    >
                      Remove mobile version
                    </button>
                  )}
                  <VariantSwitch variant={variant} hasMobile={!!selected.mobileWidget} onChange={setVariant} />
                </div>
                {widgetValue ? (
                  <div className="ske-panel skp-widget">
                    <WidgetForm
                      key={`${selected.id}-${variant}`}
                      widget={widgetValue}
                      palette={palette}
                      routes={routes}
                      fonts={fonts}
                      session={session}
                      onChange={(widget) => history.apply((p) => setWidgetVariant(p, selected.id, variant, widget))}
                    />
                  </div>
                ) : (
                  <div className="skp-empty">
                    <p className="ske-muted">This widget has no mobile version – the desktop settings are used on phones too.</p>
                    <button type="button" className="ske-btn ske-btn-primary" onClick={() => history.apply((p) => createWidgetMobileVariant(p, selected.id))}>
                      Create mobile version (copy of desktop)
                    </button>
                  </div>
                )}
              </div>
            ) : null)}

          {shownTab === 'preview' && (
            <div className="skp-preview">
              <div className="ske-toolbar">
                <button type="button" className="ske-btn" aria-pressed={previewWidth === 390} onClick={() => setPreviewWidth(390)}>
                  Phone 390
                </button>
                <button type="button" className="ske-btn" aria-pressed={previewWidth === 1280} onClick={() => setPreviewWidth(1280)}>
                  Desktop 1280
                </button>
                <CheckboxField label="Signed in (tickets: 7)" checked={previewLoggedIn} onChange={setPreviewLoggedIn} />
              </div>
              <div className="skp-preview-stage">
                <div className="skp-preview-frame" style={{ width: previewWidth }}>
                  <PreviewPage page={page} palette={palette} fontFamily={fontFamily} fonts={fonts} loggedIn={previewLoggedIn} />
                </div>
              </div>
            </div>
          )}

          {shownTab === 'json' && (
            <PageJsonPanel
              page={page}
              onImport={(next) => {
                history.apply(() => next);
                setSelectedId(next.sections[0]?.id ?? null);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

const TRANSITION_LABELS: Record<(typeof SLIDER_TRANSITIONS)[number], string> = {
  fade: 'Fade',
  slide: 'Slide',
  zoom: 'Zoom',
  flip: 'Flip',
};

function SliderSettingsForm({
  slider,
  palette,
  session,
  onChange,
}: {
  slider: SliderSection;
  palette: Palette;
  session: { begin: () => void; end: () => void };
  onChange: (patch: Partial<Omit<SliderSection, 'kind' | 'id' | 'slides'>>) => void;
}) {
  return (
    <div className="ske-widget-form">
      <Section title="Slider">
        <div className="ske-grid">
          <SelectField
            label="Transition"
            value={slider.transition}
            options={SLIDER_TRANSITIONS.map((t) => ({ value: t, label: TRANSITION_LABELS[t] }))}
            onChange={(transition) => onChange({ transition })}
          />
          <NumberField
            label="Transition ms"
            value={slider.transitionMs}
            min={150}
            max={3000}
            step={50}
            session={session}
            onChange={(v) => onChange({ transitionMs: Math.round(v) })}
          />
          <NumberField
            label="Autoplay ms (0 = off)"
            value={slider.autoplayMs}
            min={0}
            max={30000}
            step={500}
            session={session}
            onChange={(v) => onChange({ autoplayMs: Math.round(v) })}
          />
        </div>
        <CheckboxField label="Loop (after the last slide comes the first)" checked={slider.loop} onChange={(loop) => onChange({ loop })} />
        <CheckboxField label="Dots" checked={slider.showDots} onChange={(showDots) => onChange({ showDots })} />
        <CheckboxField label="Arrows" checked={slider.showArrows} onChange={(showArrows) => onChange({ showArrows })} />
        <CheckboxField
          label="Pause autoplay while touched / hovered"
          checked={slider.pauseOnInteraction}
          onChange={(pauseOnInteraction) => onChange({ pauseOnInteraction })}
        />
      </Section>
      <Section title="Dots">
        <div className="ske-grid">
          <ColorField label="Dot" value={slider.dotColor} palette={palette} onChange={(dotColor) => onChange({ dotColor })} />
          <ColorField label="Active dot" value={slider.activeDotColor} palette={palette} onChange={(activeDotColor) => onChange({ activeDotColor })} />
        </div>
      </Section>
      <p className="ske-muted">Layer animations (entrance, timeline, split text) replay every time a slide becomes active.</p>
    </div>
  );
}

/** Renders what the app would: parsed (invalid sections dropped) through the real web renderer. */
function PreviewPage({
  page,
  palette,
  fontFamily,
  fonts,
  loggedIn,
}: {
  page: Page;
  palette: Palette;
  fontFamily: string | undefined;
  fonts: FontMap | undefined;
  loggedIn: boolean;
}) {
  const parsed = parsePage(JSON.parse(JSON.stringify(page)));
  if (!parsed.ok) return <p className="ske-error">{parsed.error}</p>;
  return (
    <>
      {parsed.warnings.length > 0 && (
        <ul className="ske-warnings ske-error">
          {parsed.warnings.slice(0, 5).map((w, i) => (
            <li key={i}>
              Not shown – {w.path}: {w.message}
            </li>
          ))}
        </ul>
      )}
      <PageView
        page={parsed.page}
        palette={palette}
        fontFamily={fontFamily}
        fonts={fonts}
        interactive={false}
        user={{ loggedIn, fields: { tickets: 7 } }}
      />
    </>
  );
}

type ImportState = { error: string | null; warnings: ParseIssue[] };

function PageJsonPanel({ page, onImport }: { page: Page; onImport: (page: Page) => void }) {
  let json: string | null = null;
  let error: string | null = null;
  try {
    json = serializePage(page, true);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid page';
  }
  const strict = validatePage(JSON.parse(JSON.stringify(page)));

  const [importState, importAction, importing] = useActionState<ImportState, FormData>(async (_prev, formData) => {
    const result = parsePage(String(formData.get('json') ?? ''));
    if (!result.ok) return { error: result.error, warnings: result.warnings };
    onImport(result.page);
    return { error: null, warnings: result.warnings };
  }, { error: null, warnings: [] });

  const download = () => {
    if (!json) return;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.id}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="ske-json skp-json">
      {json === null ? <p className="ske-error">Page is invalid: {error}</p> : <textarea className="ske-code" readOnly value={json} rows={22} aria-label="Page JSON" />}
      {!strict.ok && (
        <ul className="ske-warnings ske-error" role="alert">
          {strict.errors.slice(0, 8).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <div className="ske-row">
        <button type="button" className="ske-btn" disabled={!json} onClick={() => json && navigator.clipboard?.writeText(json)}>
          Copy
        </button>
        <button type="button" className="ske-btn" disabled={!json} onClick={download}>
          Download
        </button>
      </div>
      <form action={importAction} className="ske-import">
        <strong>Import page JSON</strong>
        <textarea name="json" className="ske-code" rows={6} placeholder="Paste page JSON…" />
        <button type="submit" className="ske-btn" disabled={importing}>
          Load (undoable)
        </button>
        {importState.error && <p className="ske-error">{importState.error}</p>}
        {importState.warnings.length > 0 && (
          <ul className="ske-warnings">
            {importState.warnings.map((w, i) => (
              <li key={i}>
                {w.path}: {w.message}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}
