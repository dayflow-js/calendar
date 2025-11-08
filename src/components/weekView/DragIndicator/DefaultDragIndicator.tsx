import { DragIndicatorRenderer } from '@/types/dragIndicator';
import { CalendarDays } from 'lucide-react';
import { eventColorBar } from '@/styles/classNames';

export const DefaultDragIndicatorRenderer: DragIndicatorRenderer = {
  renderAllDayContent: ({ title, color }) => (
    <div className="h-full flex items-center overflow-hidden pl-3 pt-1">
      <CalendarDays className="h-3 w-3 mr-1 text-white" />
      <div className="font-medium text-xs truncate pr-1 text-white">
        {title}
      </div>
    </div>
  ),

  renderRegularContent: ({
    drag,
    title,
    layout,
    formatTime,
    getLineColor,
    getDynamicPadding,
    color,
  }) => {
    return (
      <>
        <div
          className={eventColorBar}
          style={{ backgroundColor: getLineColor(color || 'blue') }}
        />
        <div
          className={`h-full flex flex-col overflow-hidden pl-3 text-white ${getDynamicPadding(drag)}`}
        >
          <div
            className="font-medium text-xs truncate pr-1 text-white"
            style={{
              lineHeight:
                drag.endHour - drag.startHour <= 0.25 ? '1.2' : 'normal',
            }}
          >
            {title}
          </div>
          {!drag.allDay && drag.endHour - drag.startHour > 0.5 && (
            <div className="text-xs truncate time-display text-white opacity-90">
              {formatTime(drag.startHour)} - {formatTime(drag.endHour)}
            </div>
          )}
        </div>
      </>
    );
  },

  renderDefaultContent: ({ drag, title, allDay }) => {
    if (allDay) {
      return (
        <div className="h-full flex items-center overflow-hidden pl-3 px-1 py-0">
          <svg
            className="h-3 w-3 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
            />
          </svg>
          <div
            className="font-medium text-xs truncate pr-1"
            style={{ lineHeight: 1.2 }}
          >
            {title}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="absolute left-0.5 top-1 bottom-1 w-0.5 rounded-full bg-blue-600" />
        <div className="h-full flex flex-col overflow-hidden pl-3 p-1">
          <div className="font-medium text-xs truncate pr-1 text-blue-900">
            {title}
          </div>
        </div>
      </>
    );
  },
};
