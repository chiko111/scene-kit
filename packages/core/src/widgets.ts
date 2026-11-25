import { z } from 'zod';
import {
  ActionSchema,
  ColorTokenSchema,
  DateKeySchema,
  FontKeySchema,
  IdSchema,
  ImageUriSchema,
  MonthKeySchema,
  ParamKeySchema,
  TimeOfDaySchema,
  TimeZoneSchema,
} from './schema';

export { DateKeySchema, MonthKeySchema, TimeOfDaySchema, TimeZoneSchema, type TimeOfDay } from './schema';

/*
 * Widgets: interactive page sections that are too dynamic for a scene (calendars, video draws,
 * carousels, long terms). Like scenes they are pure data – no HTML, no code, no hex colors,
 * https-only media – and each platform renders them natively.
 */

const Text = (max: number) => z.string().max(max);
const NonEmpty = (max: number) => z.string().min(1).max(max);


/**
 * Video URL with date placeholders, https only: {DD} {MM} {YYYY}.
 * e.g. https://cdn.example.com/draws/{DD}{MM}novemberdraw.mp4
 */
export const VideoUrlPatternSchema = z
  .string()
  .max(2048)
  .regex(/^https:\/\/[^\s"'<>]+$/, 'video URL must be https://')
  .refine((s) => /\{(DD|MM|YYYY)\}/.test(s), { message: 'video URL needs a {DD}/{MM}/{YYYY} placeholder' });

/* ───────────── Ticket counter ───────────── */

/**
 * Shows a number from the signed-in user's data (e.g. tickets in a draw).
 * The app passes the value via PageView `user.fields[field]`; guests see guestText and a login button.
 */
export const TicketCounterWidgetSchema = z.object({
  type: z.literal('ticketCounter'),
  /** width / height of the section */
  aspectRatio: z.number().min(0.5).max(10),
  backgroundUri: ImageUriSchema.nullable(),
  background: ColorTokenSchema.nullable(),
  /** Image of the frame the number sits in (transparent PNG/WebP). */
  boxUri: ImageUriSchema.nullable(),
  guestText: Text(120),
  userText: Text(120),
  /** Key in user.fields, e.g. "tickets". */
  field: ParamKeySchema,
  textColor: ColorTokenSchema,
  numberColor: ColorTokenSchema,
  font: FontKeySchema.optional(),
  loginAction: ActionSchema,
});

/* ───────────── Campaign calendar ───────────── */

export const CalendarWidgetSchema = z.object({
  type: z.literal('calendar'),
  title: Text(80),
  month: MonthKeySchema,
  firstDay: z.number().int().min(1).max(31),
  lastDay: z.number().int().min(1).max(31),
  timeZone: TimeZoneSchema,
  /** Shown on every day, e.g. "33 000 €". */
  prizeText: NonEmpty(30),
  /** Stamp on days that are over, e.g. "СПЕЧЕЛЕНИ". */
  wonText: Text(30),
  /** Button on days that are over, e.g. "Виж" (opens that day's draw). */
  watchText: Text(20),
  /** Under today's prize, e.g. "Теглене до 20:00". */
  todayText: Text(40),
  /** Small chip on today, e.g. "ДНЕС". */
  todayChip: Text(20),
  tomorrowText: Text(20),
  soonText: Text(20),
  /** Mon … Sun column headers, e.g. ["ПН","ВТ",…]. */
  weekdayLabels: z.array(Text(6)).length(7),
  specialDays: z
    .array(z.object({ day: z.number().int().min(1).max(31), label: NonEmpty(30) }))
    .max(31),
  colors: z.object({
    background: ColorTokenSchema.nullable(),
    board: ColorTokenSchema,
    day: ColorTokenSchema,
    text: ColorTokenSchema,
    muted: ColorTokenSchema,
    accent: ColorTokenSchema,
    today: ColorTokenSchema,
    onToday: ColorTokenSchema,
  }),
  font: FontKeySchema.optional(),
});

/* ───────────── Daily draw videos ───────────── */

export const DrawVideosWidgetSchema = z.object({
  type: z.literal('drawVideos'),
  videoUrlPattern: VideoUrlPatternSchema,
  posterUri: ImageUriSchema.nullable(),
  startDate: DateKeySchema,
  endDate: DateKeySchema,
  timeZone: TimeZoneSchema,
  /** From this time today's video is shown. */
  releaseTime: TimeOfDaySchema,
  /** Official draw time shown in the labels ({time}); defaults to releaseTime. e.g. video at 19:00, "до 20:00". */
  announceTime: TimeOfDaySchema.optional(),
  labels: z.object({
    /** Small label above the date, e.g. "ТЕГЛЕНЕ ЗА". */
    drawFor: Text(40),
    today: Text(20),
    /** {time} is replaced by releaseTime, e.g. "Тегленето ще бъде достъпно до {time}". */
    pending: Text(120),
    /** {date} {time} placeholders, e.g. "Тегленето ще бъде на {date} в {time}". */
    future: Text(120),
    backToToday: Text(30),
    /** Mon … Sun names, e.g. ["Понеделник", …]. */
    weekdays: z.array(Text(20)).length(7),
  }),
  colors: z.object({
    background: ColorTokenSchema.nullable(),
    card: ColorTokenSchema,
    text: ColorTokenSchema,
    muted: ColorTokenSchema,
    accent: ColorTokenSchema,
    onAccent: ColorTokenSchema,
  }),
  font: FontKeySchema.optional(),
});

/* ───────────── Game carousel ───────────── */

export const MAX_CAROUSEL_GAMES = 30;

export const GameCarouselWidgetSchema = z.object({
  type: z.literal('gameCarousel'),
  title: Text(80),
  backgroundUri: ImageUriSchema.nullable(),
  background: ColorTokenSchema.nullable(),
  games: z
    .array(
      z.object({
        id: IdSchema,
        name: NonEmpty(60),
        imageUri: ImageUriSchema,
        action: ActionSchema,
        /** Optional corner badge (e.g. jackpot logo), transparent PNG/WebP. */
        badgeUri: ImageUriSchema.optional(),
      }),
    )
    .min(1)
    .max(MAX_CAROUSEL_GAMES),
  /** Label of the button on the centred game, e.g. "ИГРАЙ". */
  playLabel: Text(20),
  /** Footer, e.g. "НЕ НАМИРАШ СВОЯТА ИГРА?" + button "КЪМ КАЗИНОТО". Empty ctaLabel = no footer. */
  ctaText: Text(80),
  ctaLabel: Text(40),
  ctaAction: ActionSchema.nullable(),
  colors: z.object({ text: ColorTokenSchema, accent: ColorTokenSchema, onAccent: ColorTokenSchema }),
  font: FontKeySchema.optional(),
});

/* ───────────── Terms & conditions ───────────── */

export const MAX_TERMS_BLOCKS = 1000;

/** Rich text without HTML: blocks of spans (bold only). */
export const TermsBlockSchema = z.object({
  kind: z.enum(['heading', 'paragraph', 'bullet', 'numbered']),
  /** Nesting depth for lists (0 = top level). */
  level: z.number().int().min(0).max(3).optional(),
  spans: z
    .array(
      z.object({
        text: z.string().min(1).max(4000),
        bold: z.boolean(),
        italic: z.boolean().optional(),
        /** Makes the span a link – a whitelisted action, never a raw URL. */
        action: ActionSchema.optional(),
      }),
    )
    .min(1)
    .max(40),
});
export type TermsBlock = z.infer<typeof TermsBlockSchema>;

export const TermsWidgetSchema = z.object({
  type: z.literal('terms'),
  title: Text(120),
  expandLabel: NonEmpty(60),
  collapseLabel: NonEmpty(60),
  /** Blocks visible before expanding. */
  previewBlocks: z.number().int().min(0).max(20),
  blocks: z.array(TermsBlockSchema).min(1).max(MAX_TERMS_BLOCKS),
  colors: z.object({
    background: ColorTokenSchema.nullable(),
    card: ColorTokenSchema,
    text: ColorTokenSchema,
    accent: ColorTokenSchema,
  }),
  font: FontKeySchema.optional(),
});

export const WidgetSchema = z.discriminatedUnion('type', [
  TicketCounterWidgetSchema,
  CalendarWidgetSchema,
  DrawVideosWidgetSchema,
  GameCarouselWidgetSchema,
  TermsWidgetSchema,
]);
export type Widget = z.infer<typeof WidgetSchema>;
export type WidgetType = Widget['type'];
export type WidgetOf<T extends WidgetType> = Extract<Widget, { type: T }>;
export const WIDGET_TYPES: readonly WidgetType[] = ['ticketCounter', 'calendar', 'drawVideos', 'gameCarousel', 'terms'];
