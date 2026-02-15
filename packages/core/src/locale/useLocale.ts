import { useContext } from 'preact/hooks';
import { LocaleContext, LocaleContextValue } from './LocaleContext';

/**
 * Hook to use the locale context in functional components.
 */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
