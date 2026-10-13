import { createFakeApp, createdRenderers, resetCoreFake } from '@test-kit';
/**
 * Slot resolution: which React function gets called for a given placeholder,
 * what it receives, and where its output lands in the DOM.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import { DayFlowCalendar } from '../DayFlowCalendar';

beforeEach(() => {
  resetCoreFake();
});

describe('slot rendering', () => {
  it('portals slot output into the placeholder the core registered', () => {
    const app = createFakeApp();
    const { container } = render(
      <DayFlowCalendar
        calendar={app as never}
        titleBarSlot={() => <span>portaled</span>}
      />
    );

    const placeholder = container.querySelector('[data-slot="titleBarSlot"]');
    expect(placeholder).toBeInTheDocument();
    // The content must live *inside* the placeholder, not next to it.
    expect(placeholder).toHaveTextContent('portaled');
  });

  it('passes the generator args through to the slot function', () => {
    const app = createFakeApp();
    const titleBarSlot = vi.fn(() => <span>args</span>);
    render(
      <DayFlowCalendar calendar={app as never} titleBarSlot={titleBarSlot} />
    );

    expect(titleBarSlot).toHaveBeenCalledWith(
      expect.objectContaining({ slot: 'titleBarSlot' })
    );
  });

  it('renders each registered slot independently', () => {
    const app = createFakeApp();
    const { container } = render(
      <DayFlowCalendar
        calendar={app as never}
        titleBarSlot={() => <span>the title</span>}
        calendarHeader={() => <span>the header</span>}
      />
    );

    expect(
      container.querySelector('[data-slot="titleBarSlot"]')
    ).toHaveTextContent('the title');
    expect(
      container.querySelector('[data-slot="calendarHeader"]')
    ).toHaveTextContent('the header');
  });

  it('renders the sidebar slots from props, like the other adapters', () => {
    const app = createFakeApp([{ name: 'sidebar', config: {} }]);
    const { container } = render(
      <DayFlowCalendar
        calendar={app as never}
        sidebar={() => <span>prop sidebar</span>}
        sidebarHeader={() => <span>prop header</span>}
        calendarContextMenu={() => <span>prop menu</span>}
      />
    );

    expect(container.querySelector('[data-slot="sidebar"]')).toHaveTextContent(
      'prop sidebar'
    );
    expect(
      container.querySelector('[data-slot="sidebarHeader"]')
    ).toHaveTextContent('prop header');
    expect(
      container.querySelector('[data-slot="calendarContextMenu"]')
    ).toHaveTextContent('prop menu');
  });

  it('prefers the sidebar prop over the plugin render option', () => {
    const app = createFakeApp([
      {
        name: 'sidebar',
        config: { render: () => <span>plugin sidebar</span> },
      },
    ]);
    const { container } = render(
      <DayFlowCalendar
        calendar={app as never}
        sidebar={() => <span>prop sidebar</span>}
      />
    );

    expect(container.querySelector('[data-slot="sidebar"]')).toHaveTextContent(
      'prop sidebar'
    );
  });

  it('falls back to the sidebar plugin config when no prop matches', () => {
    // Sidebar content is configured on the plugin, not passed as a prop, so
    // the adapter has to look in two places to resolve a generator.
    const app = createFakeApp([
      {
        name: 'sidebar',
        config: {
          render: () => <span>plugin sidebar</span>,
          renderSidebarHeader: () => <span>plugin header</span>,
        },
      },
    ]);
    const { container } = render(<DayFlowCalendar calendar={app as never} />);

    expect(container.querySelector('[data-slot="sidebar"]')).toHaveTextContent(
      'plugin sidebar'
    );
    expect(
      container.querySelector('[data-slot="sidebarHeader"]')
    ).toHaveTextContent('plugin header');
  });

  it('prefers an explicit prop over the plugin config', () => {
    const app = createFakeApp([
      {
        name: 'sidebar',
        config: { renderCreateCalendarDialog: () => <span>from plugin</span> },
      },
    ]);
    const { container } = render(
      <DayFlowCalendar
        calendar={app as never}
        createCalendarDialog={() => <span>from prop</span>}
      />
    );

    expect(
      container.querySelector('[data-slot="createCalendarDialog"]')
    ).toHaveTextContent('from prop');
  });

  it('renders nothing for a placeholder with no matching generator', () => {
    const app = createFakeApp();
    render(
      <DayFlowCalendar
        calendar={app as never}
        titleBarSlot={() => <span>only me</span>}
      />
    );

    // The core registers a slot the adapter has no generator for.
    const renderer = createdRenderers[0];
    const el = document.createElement('div');
    renderer.getCustomRenderingStore().register({
      id: 'orphan',
      containerEl: el,
      generatorName: 'gridPopupContent',
      generatorArgs: {},
    });

    expect(el).toBeEmptyDOMElement();
    expect(screen.getByText('only me')).toBeInTheDocument();
  });

  it('accepts a useCalendarApp-shaped object as well as a raw app', () => {
    const app = createFakeApp();
    const { container } = render(
      <DayFlowCalendar
        calendar={{ app } as never}
        titleBarSlot={() => <span>wrapped</span>}
      />
    );

    expect(
      container.querySelector('[data-slot="titleBarSlot"]')
    ).toHaveTextContent('wrapped');
  });

  it('re-renders slot content when the generator prop changes', () => {
    const app = createFakeApp();
    const view = render(
      <DayFlowCalendar
        calendar={app as never}
        titleBarSlot={() => <span>before</span>}
      />
    );
    expect(screen.getByText('before')).toBeInTheDocument();

    view.rerender(
      <DayFlowCalendar
        calendar={app as never}
        titleBarSlot={() => <span>after</span>}
      />
    );

    expect(screen.getByText('after')).toBeInTheDocument();
    expect(screen.queryByText('before')).not.toBeInTheDocument();
  });
});
