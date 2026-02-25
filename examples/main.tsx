// import 'preact/debug';
import { createRoot } from 'react-dom/client';

// import '@dayflow/core/dist/styles.css';
import '@/styles/tailwind.css';
import CalendarExample from './defaultCalendarExample/defaultCalendarExample';

const container = document.querySelector('#root');
if (container) {
  const root = createRoot(container);
  root.render(<CalendarExample />);
}
