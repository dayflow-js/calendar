import type { CalendarAppConfig } from '@/types';
import { isDeepEqual } from '@/utils/helpers';

export type SyncableCalendarAppConfig = Pick<
  CalendarAppConfig,
  | 'allDaySortComparator'
  | 'calendars'
  | 'locale'
  | 'readOnly'
  | 'switcherMode'
  | 'theme'
  | 'timeZone'
  | 'useCalendarHeader'
  | 'useEventDetailDialog'
  | 'useEventDetailPanel'
  | 'views'
>;

export type CalendarAppConfigSyncSnapshot = {
  callbacks: CalendarAppConfig['callbacks'];
  syncableConfig: SyncableCalendarAppConfig;
};

type CalendarAppConfigUpdater = {
  updateConfig: (config: Partial<CalendarAppConfig>) => void;
};

export function pickSyncableConfig(
  config: CalendarAppConfig
): SyncableCalendarAppConfig {
  return {
    allDaySortComparator: config.allDaySortComparator,
    calendars: config.calendars,
    locale: config.locale,
    readOnly: config.readOnly,
    switcherMode: config.switcherMode,
    theme: config.theme,
    timeZone: config.timeZone,
    useCalendarHeader: config.useCalendarHeader,
    useEventDetailDialog: config.useEventDetailDialog,
    useEventDetailPanel: config.useEventDetailPanel,
    views: config.views,
  };
}

export function createConfigSyncSnapshot(
  config: CalendarAppConfig
): CalendarAppConfigSyncSnapshot {
  return {
    callbacks: config.callbacks,
    syncableConfig: pickSyncableConfig(config),
  };
}

export function getCallbackConfigUpdate(
  previous: CalendarAppConfig['callbacks'],
  next: CalendarAppConfig['callbacks']
): Pick<CalendarAppConfig, 'callbacks'> | null {
  if (previous === next) {
    return null;
  }

  return { callbacks: next };
}

export function getSyncConfigUpdates(
  previous: SyncableCalendarAppConfig,
  next: SyncableCalendarAppConfig
): Partial<CalendarAppConfig> {
  const updates: Partial<CalendarAppConfig> = {};

  if (previous.views !== next.views) updates.views = next.views;
  if (!isDeepEqual(previous.calendars, next.calendars)) {
    updates.calendars = next.calendars;
  }
  if (!isDeepEqual(previous.theme, next.theme)) updates.theme = next.theme;
  if (previous.useEventDetailDialog !== next.useEventDetailDialog) {
    updates.useEventDetailDialog = next.useEventDetailDialog;
  }
  if (previous.useEventDetailPanel !== next.useEventDetailPanel) {
    updates.useEventDetailPanel = next.useEventDetailPanel;
  }
  if (previous.useCalendarHeader !== next.useCalendarHeader) {
    updates.useCalendarHeader = next.useCalendarHeader;
  }
  if (previous.switcherMode !== next.switcherMode) {
    updates.switcherMode = next.switcherMode;
  }
  if (!isDeepEqual(previous.locale, next.locale)) updates.locale = next.locale;
  if (!isDeepEqual(previous.readOnly, next.readOnly)) {
    updates.readOnly = next.readOnly;
  }
  if (previous.allDaySortComparator !== next.allDaySortComparator) {
    updates.allDaySortComparator = next.allDaySortComparator;
  }
  if (previous.timeZone !== next.timeZone) updates.timeZone = next.timeZone;

  return updates;
}

export function syncCalendarAppConfig(
  app: CalendarAppConfigUpdater,
  previousSnapshot: CalendarAppConfigSyncSnapshot,
  config: CalendarAppConfig
): CalendarAppConfigSyncSnapshot {
  const nextSnapshot = createConfigSyncSnapshot(config);
  const callbackUpdate = getCallbackConfigUpdate(
    previousSnapshot.callbacks,
    nextSnapshot.callbacks
  );

  if (callbackUpdate) {
    app.updateConfig(callbackUpdate);
  }

  const syncUpdates = getSyncConfigUpdates(
    previousSnapshot.syncableConfig,
    nextSnapshot.syncableConfig
  );

  if (Object.keys(syncUpdates).length > 0) {
    app.updateConfig(syncUpdates);
  }

  return nextSnapshot;
}
