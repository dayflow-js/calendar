import type { FunctionComponent } from 'preact';
import { memo } from 'preact/compat';

/** Keep memoization and its debug name inside one removable initialization. */
export function memoWithDisplayName<P>(
  displayName: string,
  component: FunctionComponent<P>,
  comparer?: (previous: P, next: P) => boolean
): FunctionComponent<P> {
  const memoized = memo(component, comparer);
  memoized.displayName = displayName;
  return memoized;
}
