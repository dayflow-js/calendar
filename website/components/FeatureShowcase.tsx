'use client';

import React, { useMemo, useCallback } from 'react';
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
import { useCalendarApp } from '@dayflow/core';
import { DayFlowCalendar } from '@dayflow/core';
import { createMonthView } from '@dayflow/core';
import { createWeekView } from '@dayflow/core';
import { createDayView } from '@dayflow/core';
import { createDragPlugin } from '@dayflow/core';
import {
  ViewType,
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
} from '@dayflow/core';

type SwitcherMode = 'buttons' | 'select';

interface DemoCalendarProps {
  switcherMode?: SwitcherMode;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  className?: string;
}

interface FeatureCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const createSampleEvents = (): Event[] => {
  const today = Temporal.Now.plainDateISO();
  const tomorrow = today.add({ days: 1 });
  const nextWeek = today.add({ days: 7 });
  const allDayStart = Temporal.PlainDate.from(nextWeek.toString());
  const allDayEnd = Temporal.PlainDate.from(
    nextWeek.add({ days: 1 }).toString()
  );

  return [
    {
      id: 'event-1',
      title: 'Sprint Planning',
      description: 'Outline sprint goals and assign key tasks.',
      start: today.toZonedDateTime({
        timeZone: 'UTC',
        plainTime: Temporal.PlainTime.from('09:30'),
      }),
      end: today.toZonedDateTime({
        timeZone: 'UTC',
        plainTime: Temporal.PlainTime.from('11:00'),
      }),
      calendarId: '#2563eb',
      meta: {
        owner: 'Alice',
        location: 'Room 301',
        favorite: true,
      },
    },
    {
      id: 'event-2',
      title: 'Design Review',
      description: 'Review new dashboard designs with the product team.',
      start: today.toZonedDateTime({
        timeZone: 'UTC',
        plainTime: Temporal.PlainTime.from('14:00'),
      }),
      end: today.toZonedDateTime({
        timeZone: 'UTC',
        plainTime: Temporal.PlainTime.from('15:30'),
      }),
      calendarId: '#10b981',
      meta: {
        owner: 'Brian',
        location: 'Zoom',
        favorite: false,
      },
    },
    {
      id: 'event-3',
      title: 'Team Lunch',
      description: 'Monthly team lunch to celebrate recent wins.',
      start: tomorrow.toZonedDateTime({
        timeZone: 'UTC',
        plainTime: Temporal.PlainTime.from('12:00'),
      }),
      end: tomorrow.toZonedDateTime({
        timeZone: 'UTC',
        plainTime: Temporal.PlainTime.from('13:00'),
      }),
      calendarId: '#f97316',
      meta: {
        owner: 'Chiara',
        location: 'Local Bistro',
        favorite: false,
      },
    },
    {
      id: 'event-4',
      title: 'Product Showcase',
      description: 'Live demo for enterprise customer group.',
      start: allDayStart,
      end: allDayEnd,
      allDay: true,
      calendarId: '#8b5cf6',
      meta: {
        owner: 'Diego',
        location: 'Online',
        favorite: false,
      },
    },
  ];
};

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
  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
    <div className="p-6 bg-white">{children}</div>
  </div>
);

const useDemoCalendar = ({
  switcherMode,
  events,
}: {
  switcherMode?: SwitcherMode;
  events?: Event[];
}) => {
  const memoizedEvents = useMemo(
    () => events ?? createSampleEvents(),
    [events]
  );

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

  return useCalendarApp({
    views,
    plugins: [dragPlugin],
    events: memoizedEvents,
    defaultView: ViewType.MONTH,
    initialDate: new Date(),
    switcherMode: switcherMode ?? 'buttons',
  });
};

const DemoCalendar: React.FC<DemoCalendarProps> = ({
  switcherMode,
  customDetailPanelContent,
  customEventDetailDialog,
  className = 'h-[520px]',
}) => {
  const calendar = useDemoCalendar({ switcherMode });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <DayFlowCalendar
        calendar={calendar}
        className={`w-full ${className}`}
        customDetailPanelContent={customDetailPanelContent}
        customEventDetailDialog={customEventDetailDialog}
      />
    </div>
  );
};

export const SwitcherModeShowcase: React.FC = () => (
  <div className="flex flex-col gap-10">
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Buttons Mode
      </h4>
      <p className="mb-4 text-sm text-gray-500">
        The default experience with a centered button group for day, week, and
        month views.
      </p>
      <DemoCalendar switcherMode="buttons" className="h-[480px]" />
    </div>
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Select Dropdown Mode
      </h4>
      <p className="mb-4 text-sm text-gray-500">
        A compact select control that keeps toolbars tidy and mobile friendly.
      </p>
      <DemoCalendar switcherMode="select" className="h-[480px]" />
    </div>
  </div>
);

export const CustomDetailPanelShowcase: React.FC = () => {
  const detailPanel: EventDetailContentRenderer = useCallback(
    ({ event, onEventDelete, onEventUpdate, onClose }) => {
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
              <h5 className="text-base font-semibold text-gray-900">
                {event.title}
              </h5>
              <p className="text-xs text-gray-500 mt-0.5">
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
            <p className="text-sm text-gray-600 leading-relaxed">
              {event.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div>
              <span className="font-medium text-gray-700">Owner:</span>
              <span>{meta.owner ?? 'Unassigned'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              <span>{meta.location ?? 'TBD'}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors"
            >
              {isFavorite ? 'Remove favorite' : 'Add to favorites'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
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
      <p className="mb-4 text-sm text-gray-500">
        Use{' '}
        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
          customDetailPanelContent
        </code>{' '}
        to replace the default panel content with business context and custom
        actions.
      </p>
      <DemoCalendar
        customDetailPanelContent={detailPanel}
        className="h-[520px]"
      />
    </div>
  );
};

export const EventDialogShowcase: React.FC = () => {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        The built-in event dialog provides comprehensive event management with
        editing, time selection, calendar types, and delete functionality. Click
        any event to see it in action.
      </p>
      <DemoCalendar className="h-[520px]" />
    </div>
  );
};

export const CustomDetailDialogShowcase: React.FC = () => {
  const customDialog: EventDetailDialogRenderer = useCallback(
    ({ event, isOpen, onClose, onEventDelete, onEventUpdate }) => {
      if (!isOpen) return null;

      const meta = event.meta ?? {};
      const accentColor = '#6366f1';

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
        } else if (typeof (value as any)?.toString === 'function') {
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

      const colorPresets = ['#6366f1', '#f97316', '#22c55e', '#0ea5e9', '#ef4444'];
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
        icon: React.ComponentType<any>;
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
      };

      const handleDelete = () => {
        onEventDelete(event.id);
        onClose();
      };

      return (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-md sm:py-10"
          data-event-detail-dialog="true"
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
            <div
              className="absolute inset-x-0 top-0 h-48"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #0f172a)`,
              }}
            />
            <div className="relative px-7 pt-8 pb-4 text-white sm:px-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                    {meta.owner ? `Hosted by ${meta.owner}` : 'Team ritual'}
                  </span>
                  <h2 className="text-2xl font-semibold sm:text-3xl">
                    {event.title}
                  </h2>
                  {event.description && (
                    <p className="max-w-xl text-sm text-white/80">
                      {event.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {headerChips.map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex w-full justify-end gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                      isFavorite ? 'bg-white/20 backdrop-blur' : 'hover:bg-white/15'
                    }`}
                    aria-label={
                      isFavorite ? 'Remove from focus list' : 'Add to focus list'
                    }
                  >
                    {isFavorite ? (
                      <Star className="h-5 w-5 fill-current" />
                    ) : (
                      <StarOff className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    aria-label="Close dialog"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative grid gap-6 px-7 pb-7 sm:px-9 sm:pb-9 lg:grid-cols-[1.6fr,1fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-100 bg-white/60 p-5 shadow-sm backdrop-blur">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                          <p className="text-sm font-medium text-gray-900">{title}</p>
                          <p className="text-xs text-gray-500">
                            {date}
                            {time ? ` · ${time}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {durationLabel && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                        <Clock3 className="h-4 w-4" />
                        {durationLabel}
                      </span>
                    )}
                    {timeZoneLabel && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        <Clock3 className="h-4 w-4" />
                        {timeZoneLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Logistics
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <User className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Host
                        </p>
                        <p className="text-sm text-gray-900">
                          {(meta.owner as string) ?? 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <MapPin className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Location
                        </p>
                        <p className="text-sm text-gray-900">{location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Participants
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {participants.map(participant => (
                        <span
                          key={participant}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
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
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Personalize
                  </h3>
                  <p className="mt-2 text-xs text-gray-500">
                    Update highlight colors to match your brand palette.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {colorPresets.map(color => {
                      const isActive = accentColor.toLowerCase() === color.toLowerCase();
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleUpdateColor(color)}
                          className={`h-9 w-9 rounded-full border-2 border-white shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                            isActive
                              ? 'ring-2 ring-offset-2 ring-offset-white'
                              : ''
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Change color to ${color}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Quick actions
                  </h3>
                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        isFavorite
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
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
                      className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100"
                    >
                      <span>Delete event</span>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-7 py-4 sm:px-9">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >
                  Close
                </button>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>Need more? Swap in your design system dialog.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
    []
  );

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Use{' '}
        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
          customEventDetailDialog
        </code>{' '}
        to supply a fully custom modal that aligns with your design system.
      </p>
      <DemoCalendar
        customEventDetailDialog={customDialog}
        className="h-[520px]"
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
