/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  useCalendarApp,
  DayFlowCalendar,
  createDayView,
  createWeekView,
  createMonthView,
  ViewType,
  createYearView,
} from '@dayflow/react';
import { createDragPlugin } from '@dayflow/plugin-drag';
import { createSidebarPlugin } from '@dayflow/plugin-sidebar';
import { createKeyboardShortcutsPlugin } from '@dayflow/plugin-keyboard-shortcuts';
import {
  createLocalizationPlugin,
  zh,
  ja,
  ko,
  fr,
  de,
  es,
} from '@dayflow/plugin-localization';

import { getWebsiteCalendars } from '@/utils/palette';
import { generateSampleEvents } from '@/utils/sampleData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CircleAlert } from 'lucide-react';

const calendarTypes = getWebsiteCalendars();

const LOCALES_OPTIONS = [
  { label: 'English', value: 'en', data: null },
  { label: 'Chinese', value: 'zh', data: zh },
  { label: 'Japanese', value: 'ja', data: ja },
  { label: 'Korean', value: 'ko', data: ko },
  { label: 'French', value: 'fr', data: fr },
  { label: 'German', value: 'de', data: de },
  { label: 'Spanish', value: 'es', data: es },
];

const VIEW_OPTIONS = [
  { label: 'Day', value: ViewType.DAY },
  { label: 'Week', value: ViewType.WEEK },
  { label: 'Month', value: ViewType.MONTH },
  { label: 'Year', value: ViewType.YEAR },
];

/**
 * Sub-component to handle the calendar instance.
 * Using a key on this component forces useCalendarApp to create a fresh instance
 * when critical config (like locale) changes.
 */
function CalendarViewer({ config }: { config: any }) {
  const calendar = useCalendarApp(config);
  return <DayFlowCalendar calendar={calendar} />;
}

export function InteractiveCalendar() {
  const { resolvedTheme } = useTheme();

  // States for checkboxes
  const [showSidebar, setShowSidebar] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [enableDrag, setEnableDrag] = useState(true);
  const [enableShortcuts, setEnableShortcuts] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setShowSidebar(true);
      setShowControls(true);
    }
  }, []);

  // States for selections
  const [locale, setLocale] = useState('en');
  const [selectedViews, setSelectedViews] = useState<string[]>([
    ViewType.DAY,
    ViewType.WEEK,
    ViewType.MONTH,
    ViewType.YEAR,
  ]);
  const [activeView, setActiveView] = useState<ViewType>(ViewType.MONTH);
  const [yearMode, setYearMode] = useState<'fixed-week' | 'canvas'>(
    'fixed-week'
  );

  const events = useMemo(() => generateSampleEvents(), []);

  const themeMode = useMemo(() => {
    if (resolvedTheme === 'dark') return 'dark';
    if (resolvedTheme === 'light') return 'light';
    return 'auto';
  }, [resolvedTheme]);

  const config = useMemo(() => {
    const p = [];
    if (enableDrag) p.push(createDragPlugin());
    if (showSidebar) {
      p.push(
        createSidebarPlugin({
          createCalendarMode: 'modal',
          colorPickerMode: 'blossom',
        })
      );
    }
    if (enableShortcuts) p.push(createKeyboardShortcutsPlugin());

    // Localization
    const selectedLocaleData = LOCALES_OPTIONS.find(
      l => l.value === locale
    )?.data;
    if (selectedLocaleData) {
      p.push(createLocalizationPlugin({ locales: [selectedLocaleData] }));
    }

    const v = [];
    if (selectedViews.includes(ViewType.DAY)) v.push(createDayView());
    if (selectedViews.includes(ViewType.WEEK)) v.push(createWeekView());
    if (selectedViews.includes(ViewType.MONTH)) v.push(createMonthView());
    if (selectedViews.includes(ViewType.YEAR)) {
      v.push(createYearView({ mode: yearMode as never }));
    }

    const currentView = selectedViews.includes(activeView)
      ? activeView
      : selectedViews.includes(ViewType.MONTH)
        ? ViewType.MONTH
        : (selectedViews[0] as ViewType);

    return {
      views: v,
      plugins: p,
      initialDate: new Date(),
      defaultView: currentView,
      callbacks: {
        onViewChange: (view: ViewType) => setActiveView(view),
      },
      events,
      locale: locale,
      calendars: calendarTypes,
      useCalendarHeader: showHeader,
      switcherMode: 'buttons',
      theme: { mode: themeMode },
    };
  }, [
    enableDrag,
    showSidebar,
    enableShortcuts,
    locale,
    showHeader,
    selectedViews,
    yearMode,
    themeMode,
    events,
    activeView,
  ]);

  const toggleView = (view: string) => {
    setSelectedViews(prev => {
      const next = prev.includes(view)
        ? prev.filter(v => v !== view)
        : [...prev, view];
      return next.length === 0 ? [view] : next;
    });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-6 w-full">
        {/* Controls Panel */}
        <Card
          className={`hidden lg:block border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 shadow-none ${showControls ? 'block' : ''}`}
        >
          <CardContent className="flex justify-between items-center p-4">
            {/* Features Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Features
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sidebar"
                    checked={showSidebar}
                    onCheckedChange={checked =>
                      setShowSidebar(checked === true)
                    }
                  />
                  <Label
                    htmlFor="sidebar"
                    className="cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400"
                  >
                    Sidebar
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="header"
                    checked={showHeader}
                    onCheckedChange={checked => setShowHeader(checked === true)}
                  />
                  <Label
                    htmlFor="header"
                    className="cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400"
                  >
                    Header
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="drag"
                    checked={enableDrag}
                    onCheckedChange={checked => setEnableDrag(checked === true)}
                  />
                  <Label
                    htmlFor="drag"
                    className="cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400"
                  >
                    Drag
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shortcuts"
                    checked={enableShortcuts}
                    onCheckedChange={checked =>
                      setEnableShortcuts(checked === true)
                    }
                  />
                  <div className="flex items-center gap-1">
                    <Label
                      htmlFor="shortcuts"
                      className="cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400"
                    >
                      Keys
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center cursor-help">
                          <CircleAlert className="h-3 w-3 text-slate-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-3 max-w-50">
                        <p className="font-semibold mb-2 text-xs">Shortcuts</p>
                        <ul className="text-[10px] space-y-1">
                          <li className="flex justify-between gap-4">
                            <span>Search</span>{' '}
                            <kbd className="font-sans opacity-70">⌘F</kbd>
                          </li>
                          <li className="flex justify-between gap-4">
                            <span>Today</span>{' '}
                            <kbd className="font-sans opacity-70">⌘T</kbd>
                          </li>
                          <li className="flex justify-between gap-4">
                            <span>New Event</span>{' '}
                            <kbd className="font-sans opacity-70">⌘N</kbd>
                          </li>
                          <li className="flex justify-between gap-4">
                            <span>Undo</span>{' '}
                            <kbd className="font-sans opacity-70">⌘Z</kbd>
                          </li>
                          <li className="flex justify-between gap-4">
                            <span>Event Switch</span>{' '}
                            <kbd className="font-sans opacity-70">⌘Tab</kbd>
                          </li>
                          <li className="flex justify-between gap-4">
                            <span>Prev/Next</span>{' '}
                            <kbd className="font-sans opacity-70">← / →</kbd>
                          </li>
                          <li className="flex justify-between gap-4">
                            <span>Delete</span>{' '}
                            <kbd className="font-sans opacity-70">⌫</kbd>
                          </li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* Views Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Views
              </h3>
              <div className="flex gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {VIEW_OPTIONS.map(opt => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={
                        selectedViews.includes(opt.value) ? 'default' : 'link'
                      }
                      className="rounded-full h-7 px-2.5 text-[11px]"
                      onClick={() => toggleView(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>

                {/* Year Mode Selection */}
                {selectedViews.includes(ViewType.YEAR) && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      Year:
                    </span>
                    <Select
                      value={yearMode}
                      onValueChange={val => setYearMode(val as never)}
                    >
                      <SelectTrigger className="h-7 text-xs px-2 w-35">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed-week">Fixed Week</SelectItem>
                        <SelectItem value="canvas">Canvas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Localization Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Language
              </h3>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger className="w-35 h-7 text-xs">
                  <SelectValue placeholder="Select Locale" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="w-full min-h-150">
          {/* 
          Using locale and features in the key to force a total re-mount of the calendar application.
          This ensures all internal translated strings and plugin states are reset correctly.
        */}
          <CalendarViewer
            key={`${locale}-${showSidebar}-${enableDrag}-${enableShortcuts}-${showHeader}-${selectedViews.join(',')}-${yearMode}`}
            config={config}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default InteractiveCalendar;
