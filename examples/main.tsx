import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/tailwind.css';
import CalendarTypesExample from './defaultCalendarExample/defaultCalendarExample';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<CalendarTypesExample />);
}

