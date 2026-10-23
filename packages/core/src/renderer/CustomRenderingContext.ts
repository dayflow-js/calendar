import { createContext } from 'preact';

import { CustomRenderingStore } from './CustomRenderingStore';

export const CustomRenderingContext =
  /* @__PURE__ */ createContext<CustomRenderingStore | null>(null);
