import { observePanelInViewport } from '@/components/calendarEvent/utils';

const panelOfHeight = (height: number) => {
  const panel = document.createElement('div');
  panel.getBoundingClientRect = () => ({ height }) as DOMRect;
  return panel;
};

describe('observePanelInViewport', () => {
  let notify: () => void;

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(callback: () => void) {
          notify = callback;
        }
      }
    );
    vi.stubGlobal('innerHeight', 800);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const topAfterResize = (panelHeight: number, top: number) => {
    let result = top;
    observePanelInViewport(panelOfHeight(panelHeight), update => {
      result = update(result);
    });
    notify();
    return result;
  };

  it('keeps a panel that still fits where it is', () => {
    expect(topAfterResize(400, 300)).toBe(300);
  });

  it('moves a grown panel up so its bottom stays in the viewport', () => {
    expect(topAfterResize(500, 400)).toBe(292);
  });

  it('never moves the panel above the top margin', () => {
    expect(topAfterResize(784, 400)).toBe(8);
  });
});
