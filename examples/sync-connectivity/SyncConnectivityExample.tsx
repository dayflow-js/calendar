import {
  attachCalDAVToDayFlow,
  createCalDAVAdapter,
  createCalDAVSync,
} from '@dayflow/caldav';
import type {
  CalDAVDayFlowController,
  CalDAVSyncStatus,
} from '@dayflow/caldav';
import type { CalendarType, Event } from '@dayflow/core';
import {
  attachGoogleSyncToDayFlow,
  createGoogleSync,
  createGoogleSyncAdapter,
} from '@dayflow/google-sync';
import type {
  GoogleDayFlowController,
  GoogleSyncStatus,
} from '@dayflow/google-sync';
import {
  DayFlowCalendar,
  ViewType,
  createDayView,
  createMonthView,
  createWeekView,
  useCalendarApp,
} from '@dayflow/react';
import { createDragPlugin } from '@drag/plugin';
import { createSidebarPlugin } from '@sidebar/plugin';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { createLocalStorage } from '../caldav-proxy/storage';

type ProviderState = {
  state: 'idle' | 'connecting' | 'connected' | 'error';
  message: string;
};

const apiBase =
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_SYNC_PROXY_URL as string | undefined) ?? 'http://localhost:3002';

function providerBadge({ state }: ProviderState) {
  if (state === 'connected') return 'bg-emerald-100 text-emerald-700';
  if (state === 'connecting') return 'bg-blue-100 text-blue-700';
  if (state === 'error') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `${response.status} ${response.statusText}`);
  }
  return data as T;
}

function toGoogleStatus(status: GoogleSyncStatus): ProviderState {
  if (status.state === 'syncing') {
    return { state: 'connecting', message: 'Syncing Google Calendar...' };
  }
  if (status.state === 'error') {
    return {
      state: 'error',
      message: status.error?.message ?? 'Google sync failed',
    };
  }
  return {
    state: 'connected',
    message: status.lastSyncedAt
      ? `Connected. Last sync ${new Date(status.lastSyncedAt).toLocaleTimeString()}`
      : 'Connected.',
  };
}

function toCalDAVStatus(status: CalDAVSyncStatus): ProviderState {
  if (status.state === 'syncing') {
    return { state: 'connecting', message: 'Syncing iCloud Calendar...' };
  }
  if (status.state === 'error') {
    return { state: 'error', message: 'iCloud CalDAV sync failed' };
  }
  return {
    state: 'connected',
    message: status.lastSyncedAt
      ? `Connected. Last sync ${status.lastSyncedAt.toLocaleTimeString()}`
      : 'Connected.',
  };
}

function countRemoteItems(calendars: CalendarType[], events: Event[]) {
  const googleCalendars = calendars.filter(c => c.source === 'Google').length;
  const icloudCalendars = calendars.filter(c => c.source === 'CalDAV').length;
  const googleEvents = events.filter(e => Boolean(e.meta?.google)).length;
  const icloudEvents = events.filter(e => Boolean(e.meta?.caldav)).length;
  return { googleCalendars, icloudCalendars, googleEvents, icloudEvents };
}

function ProviderPanel({
  title,
  configured,
  state,
  counts,
  onStart,
  onStop,
}: {
  title: string;
  configured?: boolean;
  state: ProviderState;
  counts: string;
  onStart: () => void | Promise<void>;
  onStop: () => void;
}) {
  const busy = state.state === 'connecting';
  return (
    <section className='rounded-lg border border-slate-200 bg-white p-3 shadow-sm'>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <h2 className='text-base font-semibold'>{title}</h2>
          <div className='mt-1 text-xs text-slate-500'>
            {configured === undefined
              ? 'Checking proxy config...'
              : configured
                ? counts
                : 'Missing server env vars'}
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${providerBadge(state)}`}
        >
          {state.state}
        </span>
      </div>
      <p className='mt-3 min-h-5 text-sm text-slate-600'>{state.message}</p>
      <div className='mt-3 flex gap-2'>
        <button
          type='button'
          disabled={busy || configured === false}
          onClick={onStart}
          className='rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300'
        >
          {state.state === 'connected' ? 'Refresh' : 'Connect'}
        </button>
        <button
          type='button'
          onClick={onStop}
          className='rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700'
        >
          Stop
        </button>
      </div>
    </section>
  );
}

export default function SyncConnectivityExample() {
  const views = useMemo(
    () => [
      createDayView({ showEventDots: true }),
      createWeekView({ showEventDots: true }),
      createMonthView({ showEventDots: true }),
    ],
    []
  );
  const calendar = useCalendarApp({
    views,
    calendars: [
      {
        id: 'team',
        name: 'Product Team',
        source: 'Google',
        // readOnly: true,
        colors: {
          eventColor: 'rgba(37, 99, 235, 0.12)',
          eventSelectedColor: '#2563eb',
          lineColor: '#2563eb',
          textColor: '#1d4ed8',
        },
        darkColors: {
          eventColor: 'rgba(59, 130, 246, 0.25)',
          eventSelectedColor: '#3b82f6',
          lineColor: '#60a5fa',
          textColor: '#dbeafe',
        },
      },
    ],
    events: [],
    plugins: [createDragPlugin(), createSidebarPlugin()],
    defaultView: ViewType.MONTH,
    // readOnly: {
    //   events: false,
    // },
  });

  const googleRef = useRef<GoogleDayFlowController | null>(null);
  const icloudRef = useRef<CalDAVDayFlowController | null>(null);
  const [google, setGoogle] = useState<ProviderState>({
    state: 'idle',
    message: 'Not connected.',
  });
  const [icloud, setICloud] = useState<ProviderState>({
    state: 'idle',
    message: 'Not connected.',
  });
  const [config, setConfig] = useState<{
    google: boolean;
    icloud: boolean;
  } | null>(null);

  useEffect(() => {
    fetchJson<{ google: boolean; icloud: boolean }>(
      `${apiBase}/api/sync-connectivity/config`
    )
      .then(setConfig)
      .catch(error => {
        setConfig({ google: false, icloud: false });
        setGoogle({ state: 'error', message: error.message });
        setICloud({ state: 'error', message: error.message });
      });

    return () => {
      googleRef.current?.stop();
      icloudRef.current?.stop();
    };
  }, []);

  async function startGoogle() {
    if (googleRef.current) {
      await googleRef.current.refresh();
      setGoogle(toGoogleStatus(googleRef.current.getStatus()));
      return;
    }

    setGoogle({
      state: 'connecting',
      message: 'Connecting to Google Calendar...',
    });
    try {
      const adapter = createGoogleSyncAdapter({
        baseUrl: `${apiBase}/api/google-calendar`,
        fetch: (url, init) => fetch(url, init),
      });
      const sync = createGoogleSync(adapter);
      const controller = attachGoogleSyncToDayFlow(calendar.app, sync, {
        writable: true,
        onStatusChange: status => setGoogle(toGoogleStatus(status)),
        onWriteError: error =>
          setGoogle({ state: 'error', message: error.message }),
      });
      googleRef.current = controller;
      await controller.start();
      setGoogle(toGoogleStatus(controller.getStatus()));
    } catch (error) {
      setGoogle({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function startICloud() {
    if (icloudRef.current) {
      await icloudRef.current.refresh();
      setICloud(toCalDAVStatus(icloudRef.current.getStatus()));
      return;
    }

    setICloud({
      state: 'connecting',
      message: 'Discovering iCloud calendar home...',
    });
    try {
      const { calendarHomeUrl } = await fetchJson<{ calendarHomeUrl: string }>(
        `${apiBase}/api/icloud/discover`
      );

      const adapter = createCalDAVAdapter({
        calendarHomeUrl,
        fetch: (url, init) =>
          fetch(`${apiBase}/api/icloud-caldav`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, init }),
          }),
      });
      const sync = createCalDAVSync({
        adapter,
        storage: createLocalStorage(),
      });
      const controller = attachCalDAVToDayFlow(calendar.app, sync, {
        writable: true,
        refreshOnVisibleRangeChange: true,
        eventMode: { recurring: 'read-only' },
        onError: error =>
          setICloud({
            state: 'error',
            message: error instanceof Error ? error.message : String(error),
          }),
      });
      icloudRef.current = controller;
      await controller.start();
      setICloud(toCalDAVStatus(controller.getStatus()));
    } catch (error) {
      setICloud({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function stopGoogle() {
    googleRef.current?.stop();
    googleRef.current = null;
    setGoogle({ state: 'idle', message: 'Stopped.' });
  }

  function stopICloud() {
    icloudRef.current?.stop();
    icloudRef.current = null;
    setICloud({ state: 'idle', message: 'Stopped.' });
  }

  const counts = countRemoteItems(
    calendar.getCalendars(),
    calendar.getAllEvents()
  );

  return (
    <div className='min-h-screen bg-slate-50 p-4 text-slate-900'>
      <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold tracking-normal'>
            Sync Connectivity Test
          </h1>
          <p className='mt-1 max-w-3xl text-sm text-slate-600'>
            Local-only test surface for Google Calendar and iCloud CalDAV. The
            browser talks to the local proxy; credentials stay in environment
            variables on the Node process.
          </p>
        </div>
        <div className='rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm'>
          Proxy: <span className='font-mono'>{apiBase}</span>
        </div>
      </div>

      <div className='mb-4 grid gap-3 md:grid-cols-2'>
        <ProviderPanel
          title='Google Calendar'
          configured={config?.google}
          state={google}
          counts={`${counts.googleCalendars} calendars / ${counts.googleEvents} events`}
          onStart={startGoogle}
          onStop={stopGoogle}
        />
        <ProviderPanel
          title='iCloud Calendar'
          configured={config?.icloud}
          state={icloud}
          counts={`${counts.icloudCalendars} calendars / ${counts.icloudEvents} events`}
          onStart={startICloud}
          onStop={stopICloud}
        />
      </div>

      <DayFlowCalendar calendar={calendar} />
    </div>
  );
}
