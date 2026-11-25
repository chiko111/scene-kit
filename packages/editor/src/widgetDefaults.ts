import { createId, createScene, type PageSection, type WidgetOf, type WidgetType } from '@chiko111/scene-kit-core';

/** Placeholder art (https, so it validates); operators replace it with CDN uploads. */
const PLACEHOLDER = 'https://placehold.co';

const pad = (n: number) => String(n).padStart(2, '0');

function thisMonth(): { month: string; today: string; end: string } {
  const d = new Date();
  const month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { month, today: `${month}-${pad(d.getDate())}`, end: `${month}-${pad(last)}` };
}

type Factories = { [T in WidgetType]: () => WidgetOf<T> };

const FACTORIES: Factories = {
  ticketCounter: () => ({
    type: 'ticketCounter',
    aspectRatio: 4.8,
    backgroundUri: null,
    background: 'surface',
    boxUri: null,
    guestText: 'Влезте в профила си',
    userText: 'Участваш с:',
    field: 'tickets',
    textColor: 'onSurface',
    numberColor: 'gold',
    loginAction: { type: 'navigate', route: 'Login' },
  }),
  calendar: () => {
    const { month } = thisMonth();
    return {
      type: 'calendar',
      title: 'Календар',
      month,
      firstDay: 1,
      lastDay: 28,
      timeZone: 'Europe/Sofia',
      prizeText: '1 000 €',
      wonText: 'СПЕЧЕЛЕНИ',
      watchText: 'Виж',
      todayText: 'Теглене до 20:00',
      todayChip: 'ДНЕС',
      tomorrowText: 'Утре',
      soonText: 'Скоро',
      weekdayLabels: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'],
      specialDays: [],
      colors: {
        background: null,
        board: 'surface',
        day: 'secondary',
        text: 'onSurface',
        muted: 'onSurface',
        accent: 'gold',
        today: 'white',
        onToday: 'danger',
      },
    };
  },
  drawVideos: () => {
    const { month, end } = thisMonth();
    return {
      type: 'drawVideos',
      videoUrlPattern: 'https://cdn.example.com/draws/{DD}{MM}{YYYY}.mp4',
      posterUri: null,
      startDate: `${month}-01`,
      endDate: end,
      timeZone: 'Europe/Sofia',
      releaseTime: { hour: 20, minute: 0 },
      labels: {
        drawFor: 'ТЕГЛЕНЕ ЗА',
        today: 'ДНЕС',
        pending: 'Тегленето ще бъде достъпно до {time}',
        future: 'Тегленето ще бъде на {date} в {time}',
        backToToday: 'Към днес',
        weekdays: ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'],
      },
      colors: { background: null, card: 'surface', text: 'onSurface', muted: 'onSurface', accent: 'gold', onAccent: 'black' },
    };
  },
  gameCarousel: () => ({
    type: 'gameCarousel',
    title: 'ИГРИ',
    backgroundUri: null,
    background: 'background',
    games: [1, 2, 3].map((n) => ({
      id: `game${n}`,
      name: `Игра ${n}`,
      imageUri: `${PLACEHOLDER}/300x400.png?text=Game+${n}`,
      action: { type: 'openGame' as const, gameId: `game${n}` },
    })),
    playLabel: 'ИГРАЙ',
    ctaText: 'Не намираш своята игра?',
    ctaLabel: 'Към казиното',
    ctaAction: { type: 'navigate', route: 'Casino' },
    colors: { text: 'onSurface', accent: 'gold', onAccent: 'black' },
  }),
  terms: () => ({
    type: 'terms',
    title: 'Правила и условия',
    expandLabel: 'Покажи пълните условия',
    collapseLabel: 'Скрий условията',
    previewBlocks: 3,
    blocks: [
      { kind: 'numbered', spans: [{ text: 'Промоцията е валидна за регистрирани играчи.', bold: false }] },
      { kind: 'numbered', spans: [{ text: 'Срок: ', bold: false }, { text: 'до края на месеца', bold: true }, { text: '.', bold: false }] },
      { kind: 'numbered', spans: [{ text: 'Организаторът може да променя условията.', bold: false }] },
    ],
    colors: { background: null, card: 'surface', text: 'onSurface', accent: 'gold' },
  }),
};

export const WIDGET_LABELS: Record<WidgetType, string> = {
  ticketCounter: 'Ticket counter',
  calendar: 'Campaign calendar',
  drawVideos: 'Daily draw videos',
  gameCarousel: 'Game carousel',
  terms: 'Terms & conditions',
};

export function createWidget<T extends WidgetType>(type: T): WidgetOf<T> {
  return FACTORIES[type]() as WidgetOf<T>;
}

export function createWidgetSection(type: WidgetType, taken: ReadonlySet<string>): PageSection {
  return { kind: 'widget', id: createId('sec', taken), widget: createWidget(type) };
}

export function createSceneSection(taken: ReadonlySet<string>, aspectRatio = 16 / 9): PageSection {
  return { kind: 'scene', id: createId('sec', taken), scene: createScene('Section', aspectRatio), mobileScene: null };
}
