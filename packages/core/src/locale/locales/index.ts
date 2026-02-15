import en from './en';
import zh from './zh';
import ja from './ja';
import ko from './ko';
import fr from './fr';
import de from './de';
import es from './es';

export { en, zh, ja, ko, fr, de, es };

export const LOCALES = {
  en,
  zh,
  ja,
  ko,
  fr,
  de,
  es,
};

export type SupportedLang = keyof typeof LOCALES;
