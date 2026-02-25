import { EventLayout, Event } from '@/types';

import {
  groupOverlappingEvents,
  analyzeParallelGroups,
} from './calculate/grouping';
import { calculateLayoutFromStructure } from './calculate/layout';
import { buildNestedStructure } from './calculate/structure';
import { LAYOUT_CONFIG } from './constants';
import { LayoutCalculationParams } from './types';
import { toLayoutEvent } from './utils';

export const EventLayoutCalculator = {
  /**
   * Calculate layout for all events in a day
   * @param dayEvents Array of events for the day
   * @param params Layout calculation parameters
   */
  calculateDayEventLayouts(
    dayEvents: Event[],
    params: LayoutCalculationParams = {}
  ): Map<string, EventLayout> {
    // 1. Convert to layout events
    const layoutEvents = dayEvents.map(toLayoutEvent);

    // Clear parent-child relationships (ensure clean start)
    for (const event of layoutEvents) {
      event.parentId = undefined;
      event.children = [];
    }

    const layoutMap = new Map<string, EventLayout>();
    const regularEvents = layoutEvents.filter(e => !e.allDay);

    if (regularEvents.length === 0) {
      return layoutMap;
    }

    // 2. Group overlapping events
    const overlappingGroups = groupOverlappingEvents(regularEvents);

    // 3. Calculate layout for each group
    for (const group of overlappingGroups) {
      if (group.length === 1) {
        const edgeMargin =
          params.viewType === 'day' ? 0 : LAYOUT_CONFIG.EDGE_MARGIN_PERCENT;
        layoutMap.set(group[0].id, {
          id: group[0].id,
          left: 0,
          width: 100 - edgeMargin,
          zIndex: 0,
          level: 0,
          isPrimary: true,
          indentOffset: 0,
          importance: Math.max(
            0.1,
            Math.min(1.0, (group[0]._endHour! - group[0]._startHour!) / 4)
          ),
        });
      } else {
        // Complex layout
        const sortedEvents = [...group].toSorted((a, b) => {
          if (a._startHour! !== b._startHour!)
            return a._startHour! - b._startHour!;
          return b._endHour! - b._startHour! - (a._endHour! - a._startHour!);
        });

        const parallelGroups = analyzeParallelGroups(sortedEvents);
        const rootNodes = buildNestedStructure(parallelGroups, group);
        calculateLayoutFromStructure(rootNodes, layoutMap, params);
      }
    }

    return layoutMap;
  },
};
