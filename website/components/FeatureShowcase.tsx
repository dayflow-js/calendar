'use client';

import React, { useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Temporal } from 'temporal-polyfill';
import {
  CalendarDays,
  Clock3,
  MapPin,
  Star,
  StarOff,
  User,
  X,
} from 'lucide-react';
import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createWeekView,
  createDayView,
  createDragPlugin,
  ViewType,
} from '@dayflow/react';
import {
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  CalendarType,
  EventDetailContentProps,
  EventDetailDialogProps,
} from '@dayflow/core';
import { CALENDAR_SIDE_PANEL, getWebsiteCalendars } from '@/utils/palette';
import { generateSampleEvents } from '@/utils/sampleData';
import '@dayflow/core/dist/styles.css';

type SwitcherMode = 'buttons' | 'select';

interface DemoCalendarProps {
  switcherMode?: SwitcherMode;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  useEventDetailDialog?: boolean;
  className?: string;
}

interface FeatureCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const cloneCalendarTypes = (): CalendarType[] => getWebsiteCalendars();

const COLOR_PRESETS = CALENDAR_SIDE_PANEL.map(item => ({
  id: item.id,
  color: item.color,
  label: item.name,
}));

const META_PRESETS = [
  {
    owner: 'Alice',
    location: 'HQ West · Room 301',
    attendees: ['Brian', 'Chiara', 'Diego'],
    favorite: true,
  },
  {
    owner: 'Brian',
    location: 'Zoom',
    attendees: ['Alice', 'Product Design'],
    favorite: false,
  },
  {
    owner: 'Chiara',
    location: 'Local Bistro',
    attendees: ['Ops', 'Marketing'],
    favorite: false,
  },
  {
    owner: 'Diego',
    location: 'Online broadcast',
    attendees: ['Stakeholders', 'Engineering'],
    favorite: false,
  },
  {
    owner: 'Mina',
    location: 'HQ East · Innovation Lab',
    attendees: ['Research', 'Growth'],
    favorite: true,
  },
  {
    owner: 'Noah',
    location: 'Client HQ',
    attendees: ['Customer team', 'Support'],
    favorite: false,
  },
];

const enrichEventsWithMeta = (sourceEvents: Event[]): Event[] =>
  sourceEvents.map((event, index) => {
    const preset = META_PRESETS[index % META_PRESETS.length];
    return {
      ...event,
      meta: {
        ...(event.meta ?? {}),
        ...preset,
        favorite:
          typeof preset.favorite === 'boolean'
            ? preset.favorite
            : index % 4 === 0,
      },
    };
  });

const formatTemporal = (value: Event['start']) => {
  try {
    return value.toString();
  } catch {
    return String(value);
  }
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  children,
}) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
    <div className="p-6 bg-white dark:bg-slate-900">{children}</div>
  </div>
);

const useDemoCalendar = ({
  switcherMode,
  events,
  useEventDetailDialog = false,
}: {
  switcherMode?: SwitcherMode;
  events?: Event[];
  useEventDetailDialog?: boolean;
}) => {
  const { resolvedTheme } = useTheme();

  const memoizedEvents = useMemo(() => {
    if (events) {
      return events;
    }
    return enrichEventsWithMeta(generateSampleEvents());
  }, [events]);

  const views = useMemo(
    () => [createMonthView(), createWeekView(), createDayView()],
    []
  );
  const dragPlugin = useMemo(
    () =>
      createDragPlugin({
        enableDrag: true,
        enableResize: true,
        enableCreate: true,
      }),
    []
  );
  const calendars = useMemo(() => cloneCalendarTypes(), []);

  const themeMode = useMemo(() => {
    if (resolvedTheme === 'dark') return 'dark';
    if (resolvedTheme === 'light') return 'light';
    return 'auto';
  }, [resolvedTheme]);

  return useCalendarApp({
    views,
    plugins: [dragPlugin],
    events: memoizedEvents,
    calendars,
    defaultView: ViewType.MONTH,
    initialDate: new Date(),
    switcherMode: switcherMode ?? 'buttons',
    theme: { mode: themeMode },
    useEventDetailDialog,
  });
};

const DemoCalendar: React.FC<DemoCalendarProps> = ({
  switcherMode,
  customDetailPanelContent,
  customEventDetailDialog,
  useEventDetailDialog = false,
}) => {
  const calendar = useDemoCalendar({ switcherMode, useEventDetailDialog });

  return (
    <div className="rounded-xl dark:border-slate-700 bg-white dark:bg-slate-900 ">
      <DayFlowCalendar
        calendar={calendar}
        eventDetailContent={customDetailPanelContent}
        eventDetailDialog={customEventDetailDialog}
      />
    </div>
  );
};

export const SwitcherModeShowcase: React.FC = () => (
  <div className="flex flex-col gap-10">
    <div>
      <DemoCalendar switcherMode="buttons" className="h-120" />
    </div>
    <div>
      <DemoCalendar switcherMode="select" className="h-120" />
    </div>
  </div>
);

export const CustomDetailPanelShowcase: React.FC = () => {
  const detailPanel: EventDetailContentRenderer = useCallback(
    ({ event, onEventDelete, onEventUpdate, onClose }: EventDetailContentProps) => {
      const meta = event.meta ?? {};
      const isFavorite = Boolean(meta.favorite);

      const handleToggleFavorite = () => {
        const updatedEvent: Event = {
          ...event,
          meta: {
            ...meta,
            favorite: !isFavorite,
          },
        };
        onEventUpdate(updatedEvent);
      };

      const handleDelete = () => {
        onEventDelete(event.id);
        onClose?.();
      };

      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h5 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {event.title}
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formatTemporal(event.start)} → {formatTemporal(event.end)}
              </p>
            </div>
            {isFavorite && (
              <span className="text-amber-500 text-sm font-semibold">
                ★ Favorite
              </span>
            )}
          </div>

          {event.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {event.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-200">Owner:</span>
              <span>{meta.owner ?? 'Unassigned'}</span>
            </div>
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-200">Location:</span>
              <span>{meta.location ?? 'TBD'}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="rounded-md border border-amber-300 dark:border-amber-600 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-200 hover:bg-amber-50 dark:bg-amber-900/30 transition-colors"
            >
              {isFavorite ? 'Remove favorite' : 'Add to favorites'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-200 hover:bg-red-50 dark:bg-red-900/30 transition-colors"
            >
              Delete event
            </button>
          </div>
        </div>
      );
    },
    []
  );

  return (
    <div>
      <DemoCalendar
        customDetailPanelContent={detailPanel}
        className="h-130"
      />
    </div>
  );
};

export const EventDialogShowcase: React.FC = () => {
  return (
    <DemoCalendar className="h-130" useEventDetailDialog={true} />
  );
};

export const CustomDetailDialogShowcase: React.FC = () => {
  const customDialog: EventDetailDialogRenderer = useCallback(
    ({ event, isOpen, onClose, onEventDelete, onEventUpdate }: EventDetailDialogProps) => {
      if (!isOpen) return null;

      const meta = event.meta ?? {};
      const colorPresets = COLOR_PRESETS;
      const accentColor =
        colorPresets.find(preset => preset.id === event.calendarId)?.color ||
        (typeof event.calendarId === 'string' && event.calendarId.startsWith('#')
          ? event.calendarId
          : '#6366f1');

      const toJsDate = (
        value: Event['start'] | Event['end']
      ): Date | null => {
        if (!value) return null;

        let result: Date | null = null;

        if (value instanceof Temporal.ZonedDateTime) {
          result = new Date(Number(value.epochMilliseconds));
        } else if (value instanceof Temporal.PlainDate) {
          result = new Date(Date.UTC(value.year, value.month - 1, value.day));
        } else if (value instanceof Date) {
          result = value;
        } else if (
          typeof value === 'string' ||
          typeof value === 'number'
        ) {
          result = new Date(value);
        } else if (typeof (value as unknown as { toString?: () => string })?.toString === 'function') {
          result = new Date(String(value));
        }

        if (!result || Number.isNaN(result.getTime())) {
          return null;
        }

        return result;
      };

      const rawStartDate = toJsDate(event.start);
      const rawEndDate = toJsDate(event.end ?? event.start);
      const fallbackDate = new Date();

      const startDate = rawStartDate ?? fallbackDate;
      const endDate = rawEndDate ?? startDate;
      const hasValidStart = Boolean(rawStartDate);
      const hasValidEnd = Boolean(rawEndDate);
      const isAllDayEvent = Boolean(event.allDay);
      const sameDay =
        hasValidStart &&
        hasValidEnd &&
        startDate.toDateString() === endDate.toDateString();

      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      const startDayLabel = hasValidStart
        ? dateFormatter.format(startDate)
        : 'Date TBD';
      const endDayLabel = hasValidEnd
        ? dateFormatter.format(endDate)
        : 'Date TBD';

      const dayLabel =
        hasValidStart && hasValidEnd
          ? sameDay
            ? startDayLabel
            : `${startDayLabel} → ${endDayLabel}`
          : 'Date to be scheduled';

      const timeRangeLabel = isAllDayEvent
        ? 'All day'
        : hasValidStart && hasValidEnd
          ? sameDay
            ? `${timeFormatter.format(startDate)} – ${timeFormatter.format(
              endDate
            )}`
            : `${startDayLabel} ${timeFormatter.format(
              startDate
            )} → ${endDayLabel} ${timeFormatter.format(endDate)}`
          : 'Time to be scheduled';

      const diffMinutes =
        hasValidStart && hasValidEnd
          ? Math.max(
            0,
            Math.round((endDate.getTime() - startDate.getTime()) / 60000)
          )
          : 0;
      let durationLabel = '';
      if (isAllDayEvent) {
        const diffDays = Math.max(1, Math.round(diffMinutes / (60 * 24)));
        durationLabel = diffDays === 1 ? 'All day' : `${diffDays} days`;
      } else if (diffMinutes > 0) {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        if (hours && minutes) {
          durationLabel = `${hours}h ${minutes}m`;
        } else if (hours) {
          durationLabel = `${hours}h`;
        } else {
          durationLabel = `${minutes}m`;
        }
      }

      const timeZoneLabel =
        !isAllDayEvent &&
          hasValidStart &&
          event.start instanceof Temporal.ZonedDateTime &&
          typeof event.start.timeZoneId === 'string'
          ? event.start.timeZoneId
          : hasValidStart && !isAllDayEvent
            ? 'Local time'
            : null;

      const participants = Array.from(
        new Set(
          [
            meta.owner,
            ...(Array.isArray(meta.attendees) ? meta.attendees : []),
            'Product Design',
            'Stakeholders',
            'Engineering',
          ].filter(Boolean) as string[]
        )
      ).slice(0, 4);

      const isFavorite = Boolean(meta.favorite);
      const location = meta.location ?? 'To be announced';

      const headerChips = [
        {
          icon: CalendarDays,
          label: dayLabel,
        },
        {
          icon: Clock3,
          label: timeRangeLabel,
        },
        durationLabel
          ? {
            icon: Clock3,
            label: `Duration · ${durationLabel}`,
          }
          : null,
      ].filter(Boolean) as Array<{
        icon: React.ComponentType<{ className?: string; size?: number }>;
        label: string;
      }>;

      const handleToggleFavorite = () => {
        onEventUpdate({
          ...event,
          meta: {
            ...meta,
            favorite: !isFavorite,
          },
        });
      };

      const handleUpdateColor = (calendarId: string) => {
        onEventUpdate({
          ...event,
          calendarId,
        });
        onClose();
      };

      const handleDelete = () => {
        onEventDelete(event.id);
        onClose();
      };

      return (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-md sm:py-10"
          data-event-detail-dialog="true"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5">
            <div
              className="absolute inset-x-0 top-0 h-40"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #0f172a)`,
              }}
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900/20 text-slate-900 dark:text-white transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:right-6 sm:top-6 z-10"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative px-7 pt-9 pb-4 text-white sm:px-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                    {meta.owner ? `Hosted by ${meta.owner}` : 'Team ritual'}
                  </span>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold sm:text-3xl">
                      {event.title}
                    </h2>
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${isFavorite ? 'bg-white text-slate-900 dark:bg-slate-900/20 dark:text-white backdrop-blur' : 'text-white hover:bg-white hover:text-slate-900 dark:hover:bg-slate-900/15 dark:hover:text-white'
                        }`}
                      aria-label={
                        isFavorite ? 'Remove from focus list' : 'Add to focus list'
                      }
                    >
                      {isFavorite ? (
                        <Star className="h-4 w-4 fill-current" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {event.description && (
                    <p className="max-w-xl text-sm text-white/80">
                      {event.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {headerChips.map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900/10 px-3 py-1 text-xs font-medium text-slate-900 dark:text-white shadow-sm backdrop-blur"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-7 pb-7 sm:px-9 sm:pb-9">
              <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm backdrop-blur">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Schedule
                    </h3>
                    <div className="mt-4 space-y-4">
                      {[
                        {
                          title: 'Starts',
                          date: startDayLabel,
                          time: isAllDayEvent
                            ? 'All day'
                            : hasValidStart
                              ? timeFormatter.format(startDate)
                              : 'Time TBD',
                        },
                        {
                          title: 'Wraps',
                          date: endDayLabel,
                          time: isAllDayEvent
                            ? sameDay && hasValidEnd
                              ? 'Same day'
                              : endDayLabel
                            : hasValidEnd
                              ? timeFormatter.format(endDate)
                              : 'Time TBD',
                        },
                      ].map(({ title, date, time }) => (
                        <div key={title} className="flex items-start gap-3">
                          <span
                            className="mt-1 h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: accentColor }}
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {date}
                              {time ? ` · ${time}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {durationLabel && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-200">
                          <Clock3 className="h-4 w-4" />
                          {durationLabel}
                        </span>
                      )}
                      {timeZoneLabel && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-200">
                          <Clock3 className="h-4 w-4" />
                          {timeZoneLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Logistics
                    </h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
                          <User className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Host
                          </p>
                          <p className="text-sm text-slate-900 dark:text-slate-100">
                            {(meta.owner as string) ?? 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
                          <MapPin className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Location
                          </p>
                          <p className="text-sm text-slate-900 dark:text-slate-100">{location}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Participants
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {participants.map(participant => (
                          <span
                            key={participant}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                          >
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                            {participant}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Personalize
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Update highlight colors to match your brand palette.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {colorPresets.map(({ id, color }) => {
                        const isActive = event.calendarId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleUpdateColor(id)}
                            className={`h-9 w-9 rounded-full border-2 border-white shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isActive ? 'ring-2 ring-offset-white' : ''
                              }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Change color to ${id}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Quick actions
                    </h3>
                    <div className="mt-4 space-y-3">
                      <button
                        type="button"
                        onClick={handleToggleFavorite}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${isFavorite
                          ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/30 text-amber-700'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span>
                          {isFavorite ? 'Added to focus list' : 'Add to focus list'}
                        </span>
                        <Star className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex w-full items-center justify-between rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-200 transition hover:bg-red-100"
                      >
                        <span>Delete event</span>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                Need more? Swap in your design system dialog.
              </div>
            </div>
          </div>
        </div>
      );
    },
    []
  );

  return (
    <div className='mt-2'>
      <DemoCalendar
        customEventDetailDialog={customDialog}
        className="h-130"
      />
    </div>
  );
};

export const FeatureShowcase: React.FC = () => (
  <div className="space-y-10">
    <FeatureCard
      title="View Switcher Modes"
      description="Switch between button and select based headers with the switcherMode prop."
    >
      <SwitcherModeShowcase />
    </FeatureCard>

    <FeatureCard
      title="Custom Event Detail Content"
      description="Replace the default detail panel body with bespoke business information and actions."
    >
      <CustomDetailPanelShowcase />
    </FeatureCard>

    <FeatureCard
      title="Custom Event Detail Dialog"
      description="Open a fully custom dialog when an event is selected, keeping parity with your modal system."
    >
      <CustomDetailDialogShowcase />
    </FeatureCard>
  </div>
);

export default FeatureShowcase;
