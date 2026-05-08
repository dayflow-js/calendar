// import 'preact/debug';
import { createRoot } from 'react-dom/client';

// Local example shell utilities live in examples/styles/tailwind.css.
// DayFlow component styles stay on the library side.
import '@/styles/tailwind-components.css';
import './styles/tailwind.css';
import CalendarExample from './defaultCalendarExample/defaultCalendarExample';
import SyncConnectivityExample from './sync-connectivity/SyncConnectivityExample';

const container = document.querySelector('#root');
if (container) {
  const root = createRoot(container);
  const showSyncConnectivity =
    window.location.pathname.includes('sync-connectivity') ||
    new URLSearchParams(window.location.search).get('example') ===
      'sync-connectivity';

  root.render(
    showSyncConnectivity ? <SyncConnectivityExample /> : <CalendarExample />
  );
}
