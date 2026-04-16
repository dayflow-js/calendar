export type LocaleMessages = Record<string, string>;
export type LocaleNamespace = 'core' | 'scheduler' | string;

export interface DayflowLocale {
  code: string;
  messages: LocaleMessages;
  packages?: Record<string, LocaleMessages | undefined>;
}
