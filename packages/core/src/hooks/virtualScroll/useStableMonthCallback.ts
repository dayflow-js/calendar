import { RefObject } from 'preact';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';

// Construct both the callback and its memo factory outside the render frame:
// Preact retains useMemo factories, so neither may capture a previous render.
const createCallbackFactory =
  <Args extends unknown[], Result>(
    ref: RefObject<((...args: Args) => Result) | null>
  ) =>
  () =>
    ((...args: Args) => ref.current?.(...args)) as (...args: Args) => Result;

const createCleanup = (ref: RefObject<unknown>) => () => () => {
  ref.current = null;
};

/** Keep month callbacks stable without retaining their previous render inputs. */
export const useStableMonthCallback = <Args extends unknown[], Result>(
  callback: (...args: Args) => Result
) => {
  const ref = useRef<typeof callback | null>(callback);
  ref.current = callback;
  const stableCallback = useMemo(createCallbackFactory(ref), []);
  useLayoutEffect(createCleanup(ref), []);
  return stableCallback;
};
