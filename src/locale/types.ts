export type LocaleCode = string;

export type TranslationKey =
  | 'allDay'
  | 'noEvents'
  | 'more'
  | 'eventTitle'
  | 'dateRange'
  | 'timeRange'
  | 'note'
  | 'addNotePlaceholder'
  | 'setAsAllDay'
  | 'setAsTimed'
  | 'delete'
  | 'confirm'
  | 'cancel'
  | 'today'
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'newEvent'
  | 'newAllDayEvent'
  | 'newCalendarEvent'
  | 'newAllDayCalendarEvent'
  | 'save'
  | 'deleteCalendar'
  | 'deleteCalendarMessage'
  | 'merge'
  | 'confirmDeleteTitle'
  | 'confirmDeleteMessage'
  | 'mergeConfirmTitle'
  | 'mergeConfirmMessage'
  | 'expandSidebar'
  | 'collapseSidebar'
  | 'calendars'
  | 'createCalendar'
  | 'calendarNamePlaceholder'
  | 'customColor'
  | 'create'
  | 'calendarOptions'
  | 'untitled';

export type LocaleDict = Partial<Record<TranslationKey, string>>;
export type LocaleMessages = Partial<Record<TranslationKey, string>>;

export interface Locale {
  code: string;
  messages: LocaleDict;
}
