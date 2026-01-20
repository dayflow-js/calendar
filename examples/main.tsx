import React from 'react';
import { createRoot } from 'react-dom/client';
import CalendarTypesExample from './calendar-types/calendar-types-example';
import '../src/styles/tailwind.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<CalendarTypesExample />);
}

