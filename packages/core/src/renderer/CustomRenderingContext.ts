import { createContext } from 'preact';
import { CustomRenderingStore } from './CustomRenderingStore';

export const CustomRenderingContext = createContext<CustomRenderingStore | null>(null);
