import type { CalendarType, ICalendarApp } from '@dayflow/core';
import { LocaleProvider } from '@dayflow/core';
import DefaultCalendarSidebar from '@sidebar/DefaultCalendarSidebar';
import {
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/preact';

const colors = {
  eventColor: '#dbeafe',
  eventSelectedColor: '#bfdbfe',
  lineColor: '#3b82f6',
  textColor: '#1e3a8a',
};

const calendars: CalendarType[] = [
  {
    id: 'work',
    name: 'Work',
    source: 'Google',
    colors,
    isVisible: true,
  },
  {
    id: 'personal',
    name: 'Personal',
    source: 'Google',
    colors,
    isVisible: true,
  },
  {
    id: 'family',
    name: 'Family',
    source: 'iCloud',
    colors,
    isVisible: true,
  },
];

const renderSidebar = (groups?: string[]) => {
  const updateCalendar = vi.fn();
  const deleteCalendar = vi.fn(() => Promise.resolve());
  const onCreateCalendar = vi.fn();
  const onGroupCreate = vi.fn(() => Promise.resolve());
  const onGroupRename = vi.fn(() => Promise.resolve());
  const onGroupDelete = vi.fn(() => Promise.resolve());
  const onGroupReorder = vi.fn(() => Promise.resolve());
  const app = {
    state: { overrides: [] },
    canMutateFromUI: vi.fn(() => true),
    getReadOnlyConfig: vi.fn(() => ({})),
    updateCalendar,
    deleteCalendar,
  } as unknown as ICalendarApp;

  const { container } = render(
    <LocaleProvider>
      <DefaultCalendarSidebar
        app={app}
        calendars={calendars}
        toggleCalendarVisibility={vi.fn()}
        toggleAll={vi.fn()}
        isCollapsed={false}
        setCollapsed={vi.fn()}
        editingCalendarId={null}
        setEditingCalendarId={vi.fn()}
        onCreateCalendar={onCreateCalendar}
        onGroupCreate={onGroupCreate}
        onGroupRename={onGroupRename}
        onGroupDelete={onGroupDelete}
        onGroupReorder={onGroupReorder}
        groups={groups}
        componentsOrder={['calendarList']}
      />
    </LocaleProvider>
  );

  return {
    container,
    updateCalendar,
    deleteCalendar,
    onCreateCalendar,
    onGroupCreate,
    onGroupRename,
    onGroupDelete,
    onGroupReorder,
  };
};

const openGoogleGroupMenu = () => {
  fireEvent.contextMenu(screen.getByRole('button', { name: 'Google' }), {
    clientX: 40,
    clientY: 60,
  });
};

describe('DefaultCalendarSidebar group actions', () => {
  it('renders persisted empty groups from configuration', () => {
    renderSidebar(['Saved group']);

    expect(screen.getByRole('button', { name: 'Saved group' })).toBeTruthy();
  });

  it('reorders groups and emits the complete ordered group list', async () => {
    const { container, onGroupReorder } = renderSidebar();
    let resolveReorder: (() => void) | undefined;
    onGroupReorder.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveReorder = resolve;
        })
    );
    const iCloudGroup = screen.getByRole('button', { name: 'iCloud' });

    fireEvent.dragStart(iCloudGroup);
    const iCloudGroupContainer = iCloudGroup.closest(
      '.df-sidebar-source-group'
    ) as HTMLElement;
    expect(iCloudGroupContainer.dataset.dragging).toBe('true');
    const googleGroup = screen.getByRole('button', { name: 'Google' });
    vi.spyOn(googleGroup, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 200,
      left: 0,
      right: 200,
      width: 200,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });
    const dragOverEvent = createEvent.dragOver(googleGroup);
    Object.defineProperty(dragOverEvent, 'clientY', { value: 110 });
    fireEvent(googleGroup, dragOverEvent);
    const dropIndicator = googleGroup
      .closest('.df-sidebar-source-group')
      ?.querySelector('.df-sidebar-group-drop-indicator') as HTMLElement;
    expect(dropIndicator.dataset.position).toBe('top');
    fireEvent.drop(googleGroup);

    await waitFor(() =>
      expect(onGroupReorder).toHaveBeenCalledWith(['iCloud', 'Google'])
    );
    expect(
      Array.from(
        container.querySelectorAll('.df-sidebar-source-label'),
        element => element.textContent
      )
    ).toEqual(['Google', 'iCloud']);
    resolveReorder?.();
    await waitFor(() =>
      expect(
        Array.from(
          container.querySelectorAll('.df-sidebar-source-label'),
          element => element.textContent
        )
      ).toEqual(['iCloud', 'Google'])
    );
  });

  it('creates an empty group from the sidebar context menu', async () => {
    const { container, onCreateCalendar, onGroupCreate } = renderSidebar();
    const sidebar = container.querySelector('.df-sidebar');

    expect(sidebar).not.toBeNull();
    fireEvent.contextMenu(sidebar!, { clientX: 40, clientY: 60 });
    fireEvent.click(screen.getByRole('menuitem', { name: 'New Group' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Group name' }), {
      target: { value: 'Projects' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(onGroupCreate).toHaveBeenCalledWith('Projects'));
    const group = screen.getByRole('button', { name: 'Projects' });
    expect(group).toBeTruthy();

    fireEvent.contextMenu(group, { clientX: 40, clientY: 60 });
    fireEvent.click(screen.getByRole('menuitem', { name: 'New Calendar' }));
    expect(onCreateCalendar).toHaveBeenCalledWith('Projects');
  });

  it('waits for the group callback before applying the change', async () => {
    const { container, onGroupCreate } = renderSidebar();
    let resolveCreate: (() => void) | undefined;
    onGroupCreate.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveCreate = resolve;
        })
    );

    fireEvent.contextMenu(container.querySelector('.df-sidebar')!, {
      clientX: 40,
      clientY: 60,
    });
    fireEvent.click(screen.getByRole('menuitem', { name: 'New Group' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Group name' }), {
      target: { value: 'Projects' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.queryByRole('button', { name: 'Projects' })).toBeNull();
    resolveCreate?.();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Projects' })).toBeTruthy()
    );
  });

  it('creates a calendar in the selected group', () => {
    const { onCreateCalendar } = renderSidebar();

    openGoogleGroupMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'New Calendar' }));

    expect(onCreateCalendar).toHaveBeenCalledWith('Google');
  });

  it('renames every calendar in the selected group', async () => {
    const { updateCalendar, onGroupRename } = renderSidebar();

    openGoogleGroupMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename Group' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Group name' }), {
      target: { value: 'Work account' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateCalendar).toHaveBeenCalledTimes(2));
    expect(onGroupRename).toHaveBeenCalledWith(
      'Google',
      'Work account',
      calendars.slice(0, 2)
    );
    expect(updateCalendar).toHaveBeenCalledWith('work', {
      source: 'Work account',
    });
    expect(updateCalendar).toHaveBeenCalledWith('personal', {
      source: 'Work account',
    });
  });

  it('prevents renaming a group to an existing group name', () => {
    const { updateCalendar } = renderSidebar();

    openGoogleGroupMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename Group' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Group name' }), {
      target: { value: 'icloud' },
    });

    expect(screen.getByRole('alert').textContent).toContain(
      'A group with this name already exists.'
    );
    expect(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(updateCalendar).not.toHaveBeenCalled();
  });

  it('requires confirmation before deleting every calendar in a group', async () => {
    const { deleteCalendar, onGroupDelete } = renderSidebar();

    openGoogleGroupMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete Group' }));

    expect(
      screen.getByRole('heading', { name: 'Delete Google?' })
    ).toBeTruthy();
    expect(screen.getByText(/2 total/)).toBeTruthy();
    expect(deleteCalendar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteCalendar).toHaveBeenCalledTimes(2));
    expect(onGroupDelete).toHaveBeenCalledWith('Google', calendars.slice(0, 2));
    expect(deleteCalendar).toHaveBeenNthCalledWith(1, 'work');
    expect(deleteCalendar).toHaveBeenNthCalledWith(2, 'personal');
  });

  it('renders df-sidebar-list-shell even when calendars list is empty', () => {
    const app = {
      state: { overrides: [], currentView: 'month' },
      canMutateFromUI: vi.fn(() => true),
      getReadOnlyConfig: vi.fn(() => ({})),
      getVisibleMonth: vi.fn(() => new Date(2026, 8, 1)),
      getCurrentDate: vi.fn(() => new Date(2026, 8, 22)),
      getEvents: vi.fn(() => []),
      getCalendarRegistry: vi.fn(() => ({
        getCalendar: vi.fn(),
      })),
      getViewConfig: vi.fn(() => ({})),
      updateCalendar: vi.fn(),
      deleteCalendar: vi.fn(() => Promise.resolve()),
    } as unknown as ICalendarApp;

    const { container } = render(
      <LocaleProvider>
        <DefaultCalendarSidebar
          app={app}
          calendars={[]}
          toggleCalendarVisibility={vi.fn()}
          toggleAll={vi.fn()}
          isCollapsed={false}
          setCollapsed={vi.fn()}
          editingCalendarId={null}
          setEditingCalendarId={vi.fn()}
          componentsOrder={['calendarList', 'miniCalendar']}
        />
      </LocaleProvider>
    );

    const listShell = container.querySelector('.df-sidebar-list-shell');
    expect(listShell).toBeTruthy();
    const miniCalendar = container.querySelector('.df-sidebar-mini-calendar');
    expect(miniCalendar).toBeTruthy();
  });
});
