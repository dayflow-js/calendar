import { CalendarType, CalendarColors } from '../../src';

interface PaletteCalendar extends Pick<CalendarType, 'id' | 'name' | 'icon'> {
  color: string;
  colors: CalendarColors;
  darkColors: CalendarColors;
}

export const CALENDAR_SIDE_PANEL: PaletteCalendar[] = [
  {
    id: 'team',
    name: 'Product Team',
    color: '#2563eb',
    // icon: '👩‍💻',
    colors: {
      eventColor: 'rgba(37, 99, 235, 0.12)',
      eventSelectedColor: '#2563eb',
      lineColor: '#2563eb',
      textColor: '#1d4ed8',
    },
    darkColors: {
      eventColor: 'rgba(59, 130, 246, 0.25)',
      eventSelectedColor: '#3b82f6',
      lineColor: '#60a5fa',
      textColor: '#dbeafe',
    },
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#0ea5e9',
    // icon: '❤️',
    colors: {
      eventColor: 'rgba(14, 165, 233, 0.12)',
      eventSelectedColor: '#0ea5e9',
      lineColor: '#0ea5e9',
      textColor: '#0369a1',
    },
    darkColors: {
      eventColor: 'rgba(14, 165, 233, 0.24)',
      eventSelectedColor: '#38bdf8',
      lineColor: '#7dd3fc',
      textColor: '#e0f2fe',
    },
  },
  {
    id: 'learning',
    name: 'Learning',
    color: '#8b5cf6',
    // icon: '📚',
    colors: {
      eventColor: 'rgba(139, 92, 246, 0.15)',
      eventSelectedColor: '#8b5cf6',
      lineColor: '#8b5cf6',
      textColor: '#5b21b6',
    },
    darkColors: {
      eventColor: 'rgba(167, 139, 250, 0.28)',
      eventSelectedColor: '#a855f7',
      lineColor: '#c084fc',
      textColor: '#ede9fe',
    },
  },
  {
    id: 'travel',
    name: 'Travel',
    color: '#f97316',
    // icon: '✈️',
    colors: {
      eventColor: 'rgba(249, 115, 22, 0.15)',
      eventSelectedColor: '#f97316',
      lineColor: '#f97316',
      textColor: '#7c2d12',
    },
    darkColors: {
      eventColor: 'rgba(251, 146, 60, 0.3)',
      eventSelectedColor: '#fb923c',
      lineColor: '#fdba74',
      textColor: '#ffedd5',
    },
  },
  {
    id: 'wellness',
    name: 'Wellness',
    color: '#10b981',
    // icon: '🧘',
    colors: {
      eventColor: 'rgba(16, 185, 129, 0.15)',
      eventSelectedColor: '#10b981',
      lineColor: '#10b981',
      textColor: '#065f46',
    },
    darkColors: {
      eventColor: 'rgba(52, 211, 153, 0.25)',
      eventSelectedColor: '#34d399',
      lineColor: '#6ee7b7',
      textColor: '#ecfdf5',
    },
  },
  {
    id: 'marketing',
    name: 'Marketing',
    color: '#ec4899',
    // icon: '📣',
    colors: {
      eventColor: 'rgba(236, 72, 153, 0.15)',
      eventSelectedColor: '#ec4899',
      lineColor: '#ec4899',
      textColor: '#831843',
    },
    darkColors: {
      eventColor: 'rgba(244, 114, 182, 0.28)',
      eventSelectedColor: '#f472b6',
      lineColor: '#f9a8d4',
      textColor: '#fce7f3',
    },
  },
  {
    id: 'support',
    name: 'Support',
    color: '#14b8a6',
    // icon: '🎧',
    colors: {
      eventColor: 'rgba(20, 184, 166, 0.15)',
      eventSelectedColor: '#14b8a6',
      lineColor: '#14b8a6',
      textColor: '#115e59',
    },
    darkColors: {
      eventColor: 'rgba(45, 212, 191, 0.25)',
      eventSelectedColor: '#5eead4',
      lineColor: '#99f6e4',
      textColor: '#ccfbf1',
    },
  },
];

export const getWebsiteCalendars = (): CalendarType[] =>
  CALENDAR_SIDE_PANEL.map(item => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    colors: {
      eventColor: `${item.color}30`,
      eventSelectedColor: `${item.color}`,
      lineColor: item.color,
      textColor: item.color,
    },
    isVisible: true,
  }));
