'use client';

import { TimeZone } from '@dayflow/core';
import { ViewType } from '@dayflow/react';
import { CircleAlert, Inbox, PanelRightClose, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

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

import { MiniDotsFeature } from './MiniDotsFeature';
import { MultiCalFeature } from './MultiCalFeature';
import { ThemeColorColumn } from './ThemeColorColumn';
import {
  CalendarFeatures,
  CalendarSelections,
  DEFAULT_THEME_COLOR,
  YearMode,
  SwitcherMode,
} from './types';

interface ControlPanelProps {
  features: CalendarFeatures;
  selections: CalendarSelections;
  onUpdateFeatures: (updates: Partial<CalendarFeatures>) => void;
  onUpdateSelections: (updates: Partial<CalendarSelections>) => void;
  onPreviewThemeColor: (color: string) => void;
  localesOptions: Array<{ label: string; value: string }>;
  showControls: boolean;
}

const VIEW_OPTIONS = [
  { label: 'Day', value: ViewType.DAY },
  { label: 'Week', value: ViewType.WEEK },
  { label: 'Month', value: ViewType.MONTH },
  { label: 'Year', value: ViewType.YEAR },
  { label: 'Agenda', value: ViewType.AGENDA },
];

const TIME_ZONE_OPTIONS = Object.entries(TimeZone).toSorted((a, b) =>
  a[1].localeCompare(b[1])
);

const formatTimeZoneLabel = (timeZone: string) =>
  timeZone
    .split('/')
    .map(part => part.replaceAll('_', ' '))
    .join(' / ');

function FeatureCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className='flex items-center space-x-2'>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={newChecked => onCheckedChange(newChecked === true)}
        className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
      />
      <Label
        htmlFor={id}
        className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
      >
        {label}
      </Label>
    </div>
  );
}

export function ControlPanel({
  features,
  selections,
  onUpdateFeatures,
  onUpdateSelections,
  onPreviewThemeColor,
  localesOptions,
  showControls,
}: ControlPanelProps) {
  const [searchTimeZone, setSearchTimeZone] = useState('');
  const [searchSecondaryTz, setSearchSecondaryTz] = useState('');

  const filterTimeZones = (search: string) => {
    if (!search) return TIME_ZONE_OPTIONS;
    const lowerSearch = search.toLowerCase();
    return TIME_ZONE_OPTIONS.filter(
      ([key, value]) =>
        key.toLowerCase().includes(lowerSearch) ||
        value.toLowerCase().includes(lowerSearch) ||
        formatTimeZoneLabel(value).toLowerCase().includes(lowerSearch)
    );
  };

  const filteredPrimaryTimeZones = useMemo(
    () => filterTimeZones(searchTimeZone),
    [searchTimeZone]
  );

  const filteredSecondaryTimeZones = useMemo(
    () => filterTimeZones(searchSecondaryTz),
    [searchSecondaryTz]
  );
  const themeColor = selections.themeColor || DEFAULT_THEME_COLOR;

  const toggleView = (view: string) => {
    const next = selections.selectedViews.includes(view)
      ? selections.selectedViews.filter(v => v !== view)
      : [...selections.selectedViews, view];
    onUpdateSelections({ selectedViews: next.length === 0 ? [view] : next });
  };

  return (
    <Card
      className={cn(
        'relative z-30 border-slate-200 bg-slate-50/50 shadow-none dark:border-slate-800 dark:bg-gray-900/50',
        showControls ? 'block' : 'hidden'
      )}
    >
      <CardContent className='flex flex-col gap-3 overflow-visible p-4 pt-4'>
        {/* Row 1: Features and Views */}
        <div className='flex items-start justify-between gap-8'>
          {/* Features Column */}
          <div className='flex-1 space-y-3'>
            <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
              Features
            </h3>
            <div className='flex flex-wrap gap-x-4 gap-y-2'>
              <FeatureCheckbox
                id='sidebar'
                label='Sidebar'
                checked={features.showSidebar}
                onCheckedChange={checked =>
                  onUpdateFeatures({ showSidebar: checked })
                }
              />
              <FeatureCheckbox
                id='header'
                label='Header'
                checked={features.showHeader}
                onCheckedChange={checked =>
                  onUpdateFeatures({ showHeader: checked })
                }
              />
              <FeatureCheckbox
                id='drag'
                label='Drag'
                checked={features.enableDrag}
                onCheckedChange={checked =>
                  onUpdateFeatures({ enableDrag: checked })
                }
              />
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='shortcuts'
                  checked={features.enableShortcuts}
                  onCheckedChange={checked =>
                    onUpdateFeatures({ enableShortcuts: checked === true })
                  }
                  className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                />
                <div className='flex items-center gap-1'>
                  <Label
                    htmlFor='shortcuts'
                    className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                  >
                    Keys
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className='inline-flex cursor-help items-center'>
                        <CircleAlert className='h-3 w-3 text-slate-400' />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side='top' className='w-56 p-3'>
                      <p className='mb-2 text-sm font-semibold'>Shortcuts</p>
                      <ul className='space-y-1.5 text-xs'>
                        <li className='flex justify-between gap-4'>
                          <span>Search</span>{' '}
                          <kbd className='font-sans opacity-70'>⌘F</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>Today</span>{' '}
                          <kbd className='font-sans opacity-70'>⌘T</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>New Event</span>{' '}
                          <kbd className='font-sans opacity-70'>⌘N</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>Undo</span>{' '}
                          <kbd className='font-sans opacity-70'>⌘Z</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>Event Switch</span>{' '}
                          <kbd className='font-sans opacity-70'>⌘Tab</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>Prev/Next</span>{' '}
                          <kbd className='font-sans opacity-70'>← / →</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>Copy Event</span>{' '}
                          <kbd className='font-sans opacity-70'>⌘C</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>Paste Event</span>{' '}
                          <kbd className='font-sans opacity-70'>⌘V</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>Cut Event</span>{' '}
                          <kbd className='font-sans opacity-70'>⌘X</kbd>
                        </li>
                        <li className='flex justify-between gap-4'>
                          <span>Delete</span>{' '}
                          <kbd className='font-sans opacity-70'>⌫</kbd>
                        </li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <MiniDotsFeature
                checked={features.showEventDots}
                onUpdateFeatures={onUpdateFeatures}
              />

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='calendar-groups'
                  checked={features.showCalendarGroups}
                  onCheckedChange={checked =>
                    onUpdateFeatures({ showCalendarGroups: checked === true })
                  }
                  className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                />
                <div className='flex items-center gap-1'>
                  <Label
                    htmlFor='calendar-groups'
                    className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                  >
                    Cal Groups
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className='inline-flex cursor-help items-center'>
                        <CircleAlert className='h-3 w-3 text-slate-400' />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side='top' className='w-64 p-3'>
                      <p className='mb-2 text-sm font-semibold'>
                        Calendar Groups
                      </p>
                      <p className='mb-2 text-xs text-slate-500 dark:text-slate-400'>
                        Groups calendars by source in the sidebar. Each source
                        is shown as a collapsible section header.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <FeatureCheckbox
                id='read-only'
                label='Read Only'
                checked={features.readOnly}
                onCheckedChange={checked =>
                  onUpdateFeatures({ readOnly: checked })
                }
              />

              {features.showSidebar && (
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='collapsed-safe-area'
                    checked={features.collapsedSafeAreaLeft}
                    onCheckedChange={checked =>
                      onUpdateFeatures({
                        collapsedSafeAreaLeft: checked === true,
                      })
                    }
                    className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                  />
                  <div className='flex items-center gap-1'>
                    <Label
                      htmlFor='collapsed-safe-area'
                      className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                    >
                      Title Bar Slot
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className='inline-flex cursor-help items-center'>
                          <CircleAlert className='h-3 w-3 text-slate-400' />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side='top' className='w-64 p-3'>
                        <p className='mb-1 text-sm font-semibold'>
                          Title Bar Slot
                        </p>
                        <p className='mb-2 text-xs text-slate-500 dark:text-slate-400'>
                          <code className='text-slate-700 dark:text-slate-300'>
                            titleBarSlot
                          </code>{' '}
                          renders custom content in the top-left corner, while{' '}
                          <code className='text-slate-700 dark:text-slate-300'>
                            collapsedSafeAreaLeft
                          </code>{' '}
                          reserves that pixel width so the calendar never slides
                          under it when the sidebar collapses. Use both together
                          in frameless Mac apps.
                        </p>
                        <div className='overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'>
                          <div className='flex items-center gap-1 px-3 py-2'>
                            <div className='flex items-center gap-1.5'>
                              <div
                                className='h-3 w-3 rounded-full bg-[#ff5f57]'
                                style={{
                                  border: '0.5px solid rgba(0,0,0,0.12)',
                                }}
                              />
                              <div
                                className='h-3 w-3 rounded-full bg-[#febc2e]'
                                style={{
                                  border: '0.5px solid rgba(0,0,0,0.12)',
                                }}
                              />
                              <div
                                className='h-3 w-3 rounded-full bg-[#28c840]'
                                style={{
                                  border: '0.5px solid rgba(0,0,0,0.12)',
                                }}
                              />
                            </div>
                            <PanelRightClose
                              size={14}
                              className='ml-3 text-gray-500'
                            />
                            <Inbox size={14} className='text-gray-500' />
                            <RefreshCw
                              size={14}
                              className='ml-1 text-gray-500'
                            />
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              <MultiCalFeature
                checked={features.showMultiCalendar}
                onUpdateFeatures={onUpdateFeatures}
              />
            </div>
          </div>

          {/* Views Column */}
          <div className='space-y-3'>
            <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
              Views
            </h3>
            <div className='flex flex-wrap gap-1.5'>
              {VIEW_OPTIONS.map(opt => {
                const isSelected = selections.selectedViews.includes(opt.value);
                return (
                  <Button
                    key={opt.value}
                    size='sm'
                    variant={isSelected ? 'default' : 'ghost'}
                    className={cn(
                      'h-7 rounded-full px-2.5 text-[11px] transition-all',
                      isSelected
                        ? 'bg-black text-white hover:bg-black/90 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
                        : 'bg-transparent text-black hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    )}
                    onClick={() => toggleView(opt.value)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Localization, Timezone, Secondary TZ, Switcher Mode */}
        <div className='flex items-start gap-8 border-t border-slate-200 pt-4 dark:border-slate-800'>
          {/* Localization Column */}
          <div className='space-y-1'>
            <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
              Language
            </h3>
            <Select
              value={selections.locale}
              onValueChange={val => onUpdateSelections({ locale: val })}
            >
              <SelectTrigger className='h-7 w-35 text-xs'>
                <SelectValue placeholder='Select Locale' />
              </SelectTrigger>
              <SelectContent>
                {localesOptions.map(opt => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone Column */}
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                Timezone
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='inline-flex cursor-help items-center'>
                    <CircleAlert className='h-3 w-3 text-slate-400' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='top' className='w-60 p-3'>
                  <p className='mb-1 text-sm font-semibold'>
                    Calendar Timezone
                  </p>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>
                    Controls the primary display and editing timezone across
                    views.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={selections.timeZone || 'device-local'}
              onValueChange={val => {
                onUpdateSelections({
                  timeZone: val === 'device-local' ? undefined : val,
                });
                setSearchTimeZone('');
              }}
              onOpenChange={open => !open && setSearchTimeZone('')}
            >
              <SelectTrigger className='h-7 w-35 text-xs'>
                <SelectValue placeholder='Select TZ' />
              </SelectTrigger>
              <SelectContent className='max-h-80 w-56 overflow-hidden p-0'>
                <div className='flex items-center border-b border-slate-100 px-2 dark:border-slate-800'>
                  <input
                    placeholder='Search timezone...'
                    className='h-9 w-full bg-transparent py-2 text-xs outline-none'
                    value={searchTimeZone}
                    onChange={e => setSearchTimeZone(e.target.value)}
                    onKeyDown={e => e.key === ' ' && e.stopPropagation()}
                  />
                </div>
                <div className='max-h-60 overflow-y-auto p-1'>
                  <SelectItem
                    value='device-local'
                    className='text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                  >
                    Device local
                  </SelectItem>
                  {filteredPrimaryTimeZones.map(([key, value]) => (
                    <SelectItem
                      key={key}
                      value={value}
                      className='text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                    >
                      <span className='truncate'>
                        {formatTimeZoneLabel(value)}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                Secondary TZ
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='inline-flex cursor-help items-center'>
                    <CircleAlert className='h-3 w-3 text-slate-400' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='top' className='w-60 p-3'>
                  <p className='mb-1 text-sm font-semibold'>
                    Secondary Timeline
                  </p>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>
                    Adds a second reference timeline in Day and Week views.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={selections.secondaryTimeZone || 'none'}
              onValueChange={val => {
                onUpdateSelections({
                  secondaryTimeZone: val === 'none' ? undefined : val,
                });
                setSearchSecondaryTz('');
              }}
              onOpenChange={open => !open && setSearchSecondaryTz('')}
            >
              <SelectTrigger className='h-7 w-35 text-xs'>
                <SelectValue placeholder='Select TZ' />
              </SelectTrigger>
              <SelectContent className='max-h-80 w-56 overflow-hidden p-0'>
                <div className='flex items-center border-b border-slate-100 px-2 dark:border-slate-800'>
                  <input
                    placeholder='Search timezone...'
                    className='h-9 w-full bg-transparent py-2 text-xs outline-none'
                    value={searchSecondaryTz}
                    onChange={e => setSearchSecondaryTz(e.target.value)}
                    onKeyDown={e => e.key === ' ' && e.stopPropagation()}
                  />
                </div>
                <div className='max-h-60 overflow-y-auto p-1'>
                  <SelectItem
                    value='none'
                    className='text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                  >
                    None
                  </SelectItem>
                  {filteredSecondaryTimeZones.map(([key, value]) => (
                    <SelectItem
                      key={key}
                      value={value}
                      className='text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                    >
                      <span className='truncate'>
                        {formatTimeZoneLabel(value)}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>

          {/* New Switcher Mode Control */}
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                Switcher Mode
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='inline-flex cursor-help items-center'>
                    <CircleAlert className='h-3 w-3 text-slate-400' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='top' className='w-60 p-3'>
                  <p className='mb-1 text-sm font-semibold'>
                    View Switcher Style
                  </p>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>
                    Changes how view switching is presented in the header: as
                    individual buttons or a dropdown menu.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={selections.switcherMode}
              onValueChange={val =>
                onUpdateSelections({ switcherMode: val as SwitcherMode })
              }
            >
              <SelectTrigger className='h-7 w-35 text-xs'>
                <SelectValue placeholder='Select Mode' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value='buttons'
                  className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                >
                  Buttons
                </SelectItem>
                <SelectItem
                  value='select'
                  className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                >
                  Select
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sidebar Order Column */}
          {features.showSidebar && (
            <div className='space-y-1'>
              <div className='flex items-center gap-1'>
                <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                  Sidebar Order
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='inline-flex cursor-help items-center'>
                      <CircleAlert className='h-3 w-3 text-slate-400' />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='w-60 p-3'>
                    <p className='mb-1 text-sm font-semibold'>Sidebar Order</p>
                    <p className='text-xs text-slate-500 dark:text-slate-400'>
                      Controls the vertical order of the two sidebar sections:
                      the calendar list and the mini calendar. Use{' '}
                      <code className='text-slate-700 dark:text-slate-300'>
                        componentsOrder
                      </code>{' '}
                      in{' '}
                      <code className='text-slate-700 dark:text-slate-300'>
                        createSidebarPlugin
                      </code>{' '}
                      to configure this.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={
                  features.sidebarOrder?.[0] === 'calendarList'
                    ? 'list-first'
                    : 'mini-first'
                }
                onValueChange={val =>
                  onUpdateFeatures({
                    sidebarOrder:
                      val === 'list-first'
                        ? ['calendarList', 'miniCalendar']
                        : ['miniCalendar', 'calendarList'],
                  })
                }
              >
                <SelectTrigger className='h-7 w-35 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value='list-first'
                    className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                  >
                    List → Mini
                  </SelectItem>
                  <SelectItem
                    value='mini-first'
                    className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                  >
                    Mini → List
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year View Mode — always shown in Row 2 */}
          <div className='space-y-1'>
            <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
              Year View Mode
            </h3>
            <Select
              value={selections.yearMode}
              onValueChange={val =>
                onUpdateSelections({ yearMode: val as YearMode })
              }
            >
              <SelectTrigger className='h-7 w-35 px-2 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value='fixed-week'
                  className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                >
                  Fixed Week
                </SelectItem>
                <SelectItem
                  value='canvas'
                  className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                >
                  Canvas
                </SelectItem>
                <SelectItem
                  value='grid'
                  className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                >
                  Grid Year
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ThemeColorColumn
            themeColor={themeColor}
            onPreviewThemeColor={onPreviewThemeColor}
            onUpdateSelections={onUpdateSelections}
          />
        </div>
      </CardContent>
    </Card>
  );
}
