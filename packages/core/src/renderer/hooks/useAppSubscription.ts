import { useState, useEffect } from 'preact/hooks';
import { ICalendarApp } from '../../types';

export interface AppSubscriptionResult {
  tick: number;
  selectedEventId: string | null;
}

/**
 * Subscribes to the app instance, drives re-renders on state changes,
 * and keeps selectedEventId in sync with app.state.
 *
 * The two setState calls inside a single subscriber let React/Preact
 * batch them into one render automatically.
 */
export function useAppSubscription(app: ICalendarApp): AppSubscriptionResult {
  const [tick, setTick] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    return app.subscribe(appInstance => {
      setTick(t => t + 1);
      setSelectedEventId(prev => {
        const next = appInstance.state.selectedEventId ?? null;
        return prev !== next ? next : prev;
      });
    });
  }, [app]);

  return { tick, selectedEventId };
}
