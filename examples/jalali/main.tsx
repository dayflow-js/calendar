import { createRoot } from 'react-dom/client';

import '@/styles/tailwind-components.css';
import '../styles/tailwind.css';
import JalaliExample from './JalaliExample';

const container = document.querySelector('#root');
if (container) createRoot(container).render(<JalaliExample />);
