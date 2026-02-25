import '@testing-library/jest-dom';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line class-methods-use-this
  observe() {
    /* noop */
  }
  // eslint-disable-next-line class-methods-use-this
  unobserve() {
    /* noop */
  }
  // eslint-disable-next-line class-methods-use-this
  disconnect() {
    /* noop */
  }
};
