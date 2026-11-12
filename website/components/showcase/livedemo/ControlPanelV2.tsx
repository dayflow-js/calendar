'use client';

import { TimeZone, ViewType } from '@dayflow/react';
import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { ControlPanel } from './ControlPanel';
import {
  CalendarGroupsPreview,
  KeyboardShortcutsPreview,
  SecondaryTimeZonePreview,
} from './FeaturePreviews';
import { MiniDotsFeature } from './MiniDotsFeature';
import { MultiCalFeature } from './MultiCalFeature';
import { TaskFeature } from './TaskFeature';
import { ThemeColorColumn } from './ThemeColorColumn';
import type {
  CalendarFeatures,
  CalendarSelections,
  SwitcherMode,
  YearMode,
} from './types';
import { DEFAULT_THEME_COLOR } from './types';

type Section = 'overview' | 'general' | 'views' | 'plugins';
const SECTIONS: Array<[Section, string]> = [
  ['overview', 'Overview'],
  ['general', 'General'],
  ['views', 'Views'],
  ['plugins', 'Plugins'],
];
const VIEWS = [
  ['Day', ViewType.DAY],
  ['Week', ViewType.WEEK],
  ['Month', ViewType.MONTH],
  ['Year', ViewType.YEAR],
  ['Agenda', ViewType.AGENDA],
] as const;
const TIME_ZONES = Object.values(TimeZone).toSorted();

interface Props {
  features: CalendarFeatures;
  selections: CalendarSelections;
  onUpdateFeatures: (updates: Partial<CalendarFeatures>) => void;
  onUpdateSelections: (updates: Partial<CalendarSelections>) => void;
  onPreviewThemeColor: (color: string) => void;
  localesOptions: Array<{ label: string; value: string }>;
  showControls: boolean;
  onConfigureView: (view: ViewType) => void;
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className='flex items-center gap-2'>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={value => onChange(value === true)}
        className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
      />
      <Label htmlFor={id} className='cursor-pointer text-xs font-normal'>
        {label}
      </Label>
    </div>
  );
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className='space-y-1'>
      <Label className='block text-[11px] font-bold text-slate-600 uppercase dark:text-slate-300'>
        {label}
      </Label>
      {children}
    </div>
  );
}

function PreviewLabel({
  children,
  preview,
}: {
  children: ReactNode;
  preview: 'calendar-groups' | 'secondary-timezone' | 'keyboard-shortcuts';
}) {
  return (
    <span className='inline-flex items-center gap-1'>
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className='inline-flex cursor-help'
            onClick={e => e.preventDefault()}
          >
            <CircleAlert className='h-3 w-3 text-slate-400' />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side='top'
          className={cn(
            'p-3',
            preview === 'keyboard-shortcuts' ? 'w-60' : 'w-64 space-y-2'
          )}
        >
          {preview === 'calendar-groups' ? (
            <>
              <p className='text-xs'>Group calendars by their source.</p>
              <CalendarGroupsPreview />
            </>
          ) : preview === 'secondary-timezone' ? (
            <>
              <p className='text-xs'>
                Show a second reference timeline in Day and Week views.
              </p>
              <SecondaryTimeZonePreview />
            </>
          ) : (
            <>
              <p className='mb-2 text-sm font-semibold'>Shortcuts</p>
              <KeyboardShortcutsPreview />
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type='number'
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className='h-8 w-24 rounded-md border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700'
      />
    </Field>
  );
}

const HOURS = Array.from({ length: 25 }, (_, hour) => hour);
const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function TimeRangeField({
  firstHour,
  lastHour,
  onChange,
}: {
  firstHour: number;
  lastHour: number;
  onChange: (updates: { firstHour?: number; lastHour?: number }) => void;
}) {
  return (
    <Field label='Visible time range'>
      <div className='grid grid-cols-2 gap-2'>
        <Select
          value={String(firstHour)}
          onValueChange={value => onChange({ firstHour: Number(value) })}
        >
          <SelectTrigger className='h-8 w-28 text-xs' aria-label='First hour'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.filter(hour => hour < lastHour).map(hour => (
              <SelectItem key={hour} value={String(hour)}>
                {String(hour).padStart(2, '0')}:00
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(lastHour)}
          onValueChange={value => onChange({ lastHour: Number(value) })}
        >
          <SelectTrigger className='h-8 w-28 text-xs' aria-label='Last hour'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.filter(hour => hour > firstHour).map(hour => (
              <SelectItem key={hour} value={String(hour)}>
                {String(hour).padStart(2, '0')}:00
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Field>
  );
}

export function ControlPanelV2(props: Props) {
  const {
    features,
    selections,
    onUpdateFeatures: updateFeatures,
    onUpdateSelections: updateSelections,
    onPreviewThemeColor,
    localesOptions,
    showControls,
    onConfigureView,
  } = props;
  const [section, setSection] = useState<Section>('overview');
  const [configuredView, setConfiguredView] = useState<ViewType>(
    selections.activeView
  );
  if (!showControls) return null;

  const nav = (
    <div className='flex gap-1 overflow-x-auto border-b border-slate-200 p-2 dark:border-slate-800'>
      {SECTIONS.map(([value, label]) => (
        <Button
          key={value}
          type='button'
          size='sm'
          variant='ghost'
          className={cn(
            'h-8 shrink-0 rounded-md px-3 text-xs',
            section === value &&
              'bg-white text-slate-950 shadow-sm hover:bg-white dark:bg-slate-800 dark:text-white'
          )}
          onClick={() => setSection(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
  const toggleView = (view: ViewType) => {
    const next = selections.selectedViews.includes(view)
      ? selections.selectedViews.filter(item => item !== view)
      : [...selections.selectedViews, view];
    const enabled = next.length ? next : [view];
    updateSelections({ selectedViews: enabled });
    if (!enabled.includes(configuredView)) {
      const fallback = enabled[0] as ViewType;
      setConfiguredView(fallback);
      onConfigureView(fallback);
    }
  };
  const selectClass = 'h-8 w-36 text-xs';

  return (
    <Card className='relative z-30 border-slate-200 bg-slate-50/60 py-0 shadow-none dark:border-slate-800 dark:bg-gray-900/60'>
      <CardContent className='p-0'>
        {nav}
        {section === 'overview' && (
          <div className='[&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none'>
            <ControlPanel {...props} showControls />
          </div>
        )}
        {section !== 'overview' && (
          <div className='p-4'>
            {section === 'general' && (
              <div className='grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(34rem,1fr)_8.75rem_8.75rem_8.75rem_auto]'>
                <div className='min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-1'>
                  <Field label='Features'>
                    <div className='flex min-h-7 flex-wrap items-center gap-x-5 gap-y-2'>
                      <Toggle
                        id='header'
                        label='Header'
                        checked={features.showHeader}
                        onChange={showHeader => updateFeatures({ showHeader })}
                      />
                      <Toggle
                        id='read-only'
                        label='Read only'
                        checked={features.readOnly}
                        onChange={readOnly => updateFeatures({ readOnly })}
                      />
                      <TaskFeature
                        checked={features.enableTasks}
                        onUpdateFeatures={updateFeatures}
                      />
                      <MultiCalFeature
                        checked={features.showMultiCalendar}
                        onUpdateFeatures={updateFeatures}
                      />
                      <MiniDotsFeature
                        checked={features.showEventDots}
                        onUpdateFeatures={updateFeatures}
                      />
                    </div>
                  </Field>
                </div>
                <Field label='Language'>
                  <Select
                    value={selections.locale}
                    onValueChange={locale => updateSelections({ locale })}
                  >
                    <SelectTrigger className='h-7 w-35 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {localesOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label='Timezone'>
                  <Select
                    value={selections.timeZone || 'device-local'}
                    onValueChange={value =>
                      updateSelections({
                        timeZone: value === 'device-local' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger className='h-7 w-35 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className='max-h-72'>
                      <SelectItem value='device-local'>Device local</SelectItem>
                      {TIME_ZONES.map(zone => (
                        <SelectItem key={zone} value={zone}>
                          {zone.replaceAll('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label='Switcher'>
                  <Select
                    value={selections.switcherMode}
                    onValueChange={value =>
                      updateSelections({ switcherMode: value as SwitcherMode })
                    }
                  >
                    <SelectTrigger className='h-7 w-35 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='buttons'>Buttons</SelectItem>
                      <SelectItem value='select'>Select</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <ThemeColorColumn
                  themeColor={selections.themeColor || DEFAULT_THEME_COLOR}
                  onPreviewThemeColor={onPreviewThemeColor}
                  onUpdateSelections={updateSelections}
                />
              </div>
            )}

            {section === 'plugins' && (
              <div className='flex flex-wrap items-start gap-x-8 gap-y-4'>
                <Field label='Plugins'>
                  <div className='flex h-8 flex-wrap items-center gap-5'>
                    <Toggle
                      id='sidebar-plugin'
                      label='Sidebar'
                      checked={features.showSidebar}
                      onChange={showSidebar => updateFeatures({ showSidebar })}
                    />
                    <Toggle
                      id='drag-plugin'
                      label='Drag & drop'
                      checked={features.enableDrag}
                      onChange={enableDrag => updateFeatures({ enableDrag })}
                    />
                    <Toggle
                      id='keyboard-plugin'
                      label={
                        <PreviewLabel preview='keyboard-shortcuts'>
                          Keyboard shortcuts
                        </PreviewLabel>
                      }
                      checked={features.enableShortcuts}
                      onChange={enableShortcuts =>
                        updateFeatures({ enableShortcuts })
                      }
                    />
                  </div>
                </Field>
                <Field label='Sidebar options'>
                  <div className='flex h-8 flex-wrap items-center gap-5'>
                    <Toggle
                      id='calendar-groups'
                      label={
                        <PreviewLabel preview='calendar-groups'>
                          Calendar groups
                        </PreviewLabel>
                      }
                      checked={features.showCalendarGroups}
                      onChange={showCalendarGroups =>
                        updateFeatures({ showCalendarGroups })
                      }
                    />
                    <Toggle
                      id='title-bar-slot'
                      label='Title bar slot'
                      checked={features.collapsedSafeAreaLeft}
                      onChange={collapsedSafeAreaLeft =>
                        updateFeatures({ collapsedSafeAreaLeft })
                      }
                    />
                  </div>
                </Field>
                <Field label='Sidebar order'>
                  <Select
                    value={
                      features.sidebarOrder?.[0] === 'calendarList'
                        ? 'list-first'
                        : 'mini-first'
                    }
                    onValueChange={value =>
                      updateFeatures({
                        sidebarOrder:
                          value === 'list-first'
                            ? ['calendarList', 'miniCalendar']
                            : ['miniCalendar', 'calendarList'],
                      })
                    }
                  >
                    <SelectTrigger className='h-8 w-40 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='list-first'>List → Mini</SelectItem>
                      <SelectItem value='mini-first'>Mini → List</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

            {section === 'views' && (
              <div className='space-y-4'>
                <div className='flex flex-wrap items-start gap-x-10 gap-y-4'>
                  <Field label='Enable views'>
                    <div className='flex h-8 flex-wrap items-center gap-4'>
                      {VIEWS.map(([label, view]) => (
                        <Toggle
                          key={view}
                          id={`view-${view}`}
                          label={label}
                          checked={selections.selectedViews.includes(view)}
                          onChange={() => toggleView(view)}
                        />
                      ))}
                    </div>
                  </Field>
                  <Field label='View config'>
                    <Select
                      value={configuredView}
                      onValueChange={value => {
                        const view = value as ViewType;
                        setConfiguredView(view);
                        onConfigureView(view);
                      }}
                    >
                      <SelectTrigger className={selectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIEWS.filter(([, view]) =>
                          selections.selectedViews.includes(view)
                        ).map(([label, view]) => (
                          <SelectItem key={view} value={view}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className='flex flex-wrap items-start gap-6 border-t border-slate-200 pt-4 dark:border-slate-800'>
                  {(configuredView === ViewType.DAY ||
                    configuredView === ViewType.WEEK) && (
                    <>
                      <Field label='Display'>
                        <div className='flex h-8 flex-wrap items-center gap-5'>
                          <Toggle
                            id='all-day'
                            label='All-day row'
                            checked={features.showAllDay}
                            onChange={showAllDay =>
                              updateFeatures({ showAllDay })
                            }
                          />
                          <Toggle
                            id='scroll-now'
                            label='Scroll to current time'
                            checked={features.scrollToCurrentTime}
                            onChange={scrollToCurrentTime =>
                              updateFeatures({ scrollToCurrentTime })
                            }
                          />
                          <Toggle
                            id='half-hour'
                            label='Half-hour lines'
                            checked={features.showHalfHourLines}
                            onChange={showHalfHourLines =>
                              updateFeatures({ showHalfHourLines })
                            }
                          />
                          {configuredView === ViewType.WEEK && (
                            <Toggle
                              id='weekends'
                              label='Weekends'
                              checked={features.showWeekends}
                              onChange={showWeekends =>
                                updateFeatures({ showWeekends })
                              }
                            />
                          )}
                        </div>
                      </Field>
                      <TimeRangeField
                        firstHour={selections.firstHour}
                        lastHour={selections.lastHour}
                        onChange={updateSelections}
                      />
                      <NumberField
                        label='Hour height'
                        value={selections.hourHeight}
                        min={45}
                        max={160}
                        onChange={hourHeight =>
                          updateSelections({ hourHeight })
                        }
                      />
                      <Field label='Time format'>
                        <Select
                          value={selections.timeFormat}
                          onValueChange={value =>
                            updateSelections({
                              timeFormat: value as '12h' | '24h',
                            })
                          }
                        >
                          <SelectTrigger className='h-8 w-28 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='24h'>24 hour</SelectItem>
                            <SelectItem value='12h'>12 hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field
                        label={
                          <PreviewLabel preview='secondary-timezone'>
                            Secondary TZ
                          </PreviewLabel>
                        }
                      >
                        <Select
                          value={selections.secondaryTimeZone || 'none'}
                          onValueChange={value =>
                            updateSelections({
                              secondaryTimeZone:
                                value === 'none' ? undefined : value,
                            })
                          }
                        >
                          <SelectTrigger className='h-8 w-40 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className='max-h-72'>
                            <SelectItem value='none'>None</SelectItem>
                            {TIME_ZONES.map(zone => (
                              <SelectItem key={zone} value={zone}>
                                {zone.replaceAll('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </>
                  )}
                  {configuredView === ViewType.MONTH && (
                    <>
                      <Field label='Display'>
                        <div className='flex h-8 flex-wrap items-center gap-5'>
                          <Toggle
                            id='week-numbers'
                            label='Week numbers'
                            checked={features.showWeekNumbers}
                            onChange={showWeekNumbers =>
                              updateFeatures({ showWeekNumbers })
                            }
                          />
                          <Toggle
                            id='month-indicator'
                            label='Month indicator while scrolling'
                            checked={features.showMonthIndicator}
                            onChange={showMonthIndicator =>
                              updateFeatures({ showMonthIndicator })
                            }
                          />
                        </div>
                      </Field>
                      <Field label='Start of week'>
                        <Select
                          value={String(selections.startOfWeek)}
                          onValueChange={value =>
                            updateSelections({ startOfWeek: Number(value) })
                          }
                        >
                          <SelectTrigger className='h-8 w-36 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEK_DAYS.map((day, index) => (
                              <SelectItem key={day} value={String(index)}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </>
                  )}
                  {configuredView === ViewType.YEAR && (
                    <>
                      <Field label='Year mode'>
                        <Select
                          value={selections.yearMode}
                          onValueChange={value =>
                            updateSelections({ yearMode: value as YearMode })
                          }
                        >
                          <SelectTrigger className={selectClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='fixed-week'>
                              Fixed Week
                            </SelectItem>
                            <SelectItem value='canvas'>Canvas</SelectItem>
                            <SelectItem value='grid'>Grid Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label='Display'>
                        <div className='flex h-8 items-center'>
                          <Toggle
                            id='timed-events'
                            label='Timed events'
                            checked={features.showTimedEventsInYearView}
                            onChange={showTimedEventsInYearView =>
                              updateFeatures({ showTimedEventsInYearView })
                            }
                          />
                        </div>
                      </Field>
                    </>
                  )}
                  {configuredView === ViewType.AGENDA && (
                    <>
                      <NumberField
                        label='Days to show'
                        value={selections.agendaDaysToShow}
                        min={1}
                        max={90}
                        onChange={agendaDaysToShow =>
                          updateSelections({ agendaDaysToShow })
                        }
                      />
                      <Field label='Display'>
                        <div className='flex h-8 items-center'>
                          <Toggle
                            id='empty-days'
                            label='Empty days'
                            checked={features.showEmptyAgendaDays}
                            onChange={showEmptyAgendaDays =>
                              updateFeatures({ showEmptyAgendaDays })
                            }
                          />
                        </div>
                      </Field>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
