import dynamic from 'next/dynamic';

// Dynamically import the InteractiveCalendar component with no SSR
const InteractiveCalendar = dynamic(
  () => import('./InteractiveCalendar').then(mod => mod.InteractiveCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-gray-500">Loading calendar...</p>
      </div>
    ),
  }
);

export function InteractiveCalendarWrapper() {
  return <InteractiveCalendar />;
}

export default InteractiveCalendarWrapper;
