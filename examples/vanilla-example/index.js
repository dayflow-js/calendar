import { 
    CalendarApp, 
    CalendarRenderer, 
    createMonthView, 
    createWeekView, 
    createDayView, 
    createYearView,
    createDragPlugin,
    createEventsPlugin,
    ViewType
} from '../../packages/core/dist/index.esm.js';

const app = new CalendarApp({
    views: [
        createDayView(),
        createWeekView(),
        createMonthView(),
        createYearView({ mode: 'fixed-week' })
    ],
    plugins: [
        createDragPlugin(),
        createEventsPlugin()
    ],
    defaultView: ViewType.MONTH,
    events: [
        {
            id: '1',
            title: 'Vanilla JS Event',
            start: new Date(),
            end: new Date(new Date().getTime() + 3600000),
            calendarId: 'blue'
        }
    ],
    calendars: [
        { id: 'blue', name: 'Work', colors: { lineColor: '#3b82f6', eventColor: '#3b82f630', textColor: '#3b82f6', eventSelectedColor: '#3b82f6' } }
    ]
});

const container = document.getElementById('calendar-container');
const renderer = new CalendarRenderer(app);
renderer.mount(container);

console.log('DayFlow Vanilla mounted!');
