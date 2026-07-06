import type { Metadata } from 'next';

import InteractiveCalendarComponent from '@/components/showcase/InteractiveCalendar';

export const metadata: Metadata = {
  title: 'DayFlow Interactive Demo',
  description:
    'Try the interactive DayFlow calendar demo with multi-calendar events, calendar views, drag-and-drop editing, and customization controls.',
  openGraph: {
    title: 'DayFlow Interactive Demo',
    description:
      'Try the interactive DayFlow calendar demo with multi-calendar events, calendar views, drag-and-drop editing, and customization controls.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DayFlow Interactive Demo',
    description:
      'Try the interactive DayFlow calendar demo with multi-calendar events, calendar views, drag-and-drop editing, and customization controls.',
  },
};

export default function DemoPage() {
  return (
    <main className='live-demo-container mx-auto py-8'>
      <InteractiveCalendarComponent />
    </main>
  );
}
