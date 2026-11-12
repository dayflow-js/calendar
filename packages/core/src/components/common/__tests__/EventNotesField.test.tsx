import { fireEvent, render, screen } from '@testing-library/preact';

import { EventNotesField } from '@/components/common/EventNotesField';
import { LocaleProvider } from '@/locale';

const renderNotes = (value: string, onChange = vi.fn()) =>
  render(
    <LocaleProvider locale='en-US'>
      <div className='df-event-detail-panel'>
        <EventNotesField
          id='note'
          value={value}
          editable
          disabled={false}
          rows={3}
          onChange={onChange}
        />
      </div>
    </LocaleProvider>
  );

describe('EventNotesField', () => {
  it('renders mixed Outlook notes as readable links and dividers', () => {
    const notes =
      '__________\nMicrosoft Teams meeting\nJoin: https://teams.microsoft.com/meet/436605223744481?p=abc\nNeed help?<https://aka.ms/JoinTeamsMeeting?omkt=en-AU>\n__________\nConfidential note';
    const { container } = renderNotes(notes);

    expect(container.querySelectorAll('hr')).toHaveLength(2);
    expect(container.querySelectorAll('a')).toHaveLength(2);
    expect(screen.getByText('Confidential note')).toBeTruthy();
  });

  it('renders HTML safely and edits a readable text projection', () => {
    const notes =
      'Join: https://meet.google.com/zfc-scqu-jrz\n<a href="https://example.com/reschedule">Reschedule</a>';
    const onChange = vi.fn();
    renderNotes(notes, onChange);

    expect(
      screen.getByText('Reschedule').closest('a')?.getAttribute('href')
    ).toBe('https://example.com/reschedule');
    fireEvent.focus(screen.getByRole('textbox', { name: 'Note' }));
    const readable =
      'Join: https://meet.google.com/zfc-scqu-jrz\nReschedule <https://example.com/reschedule>';
    const editor = screen.getByRole('textbox', {
      name: 'Note',
    }) as HTMLTextAreaElement;
    expect(editor.tagName).toBe('TEXTAREA');
    expect(editor.value).toBe(readable);
    fireEvent.input(editor, {
      target: { value: `${readable}\nAgenda` },
    });
    expect(onChange).toHaveBeenCalledWith(`${readable}\nAgenda`);
  });

  it('formats line breaks, emphasis and lists without exposing markup', () => {
    const notes =
      'Itinerary: Jayce L<br /><strong>Interview Information</strong><ul><li>Google Meet</li><li><em>Hiring Manager Interview</em></li></ul><script>alert(1)</script>';
    const { container } = renderNotes(notes);

    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('strong')?.textContent).toBe(
      'Interview Information'
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('<br');
    expect(container.textContent).not.toContain('alert(1)');
  });

  it('switches between the formatted note and the editor on focus', () => {
    const onChange = vi.fn();
    renderNotes('Bring comfortable shoes.', onChange);

    expect(screen.queryByRole('button')).toBeNull();
    const preview = screen.getByRole('textbox', { name: 'Note' });
    expect(preview.tagName).toBe('DIV');
    expect(preview.tabIndex).toBe(0);

    fireEvent.focus(preview);
    const editor = screen.getByRole('textbox', { name: 'Note' });
    expect(editor.tagName).toBe('TEXTAREA');
    expect(document.activeElement).toBe(editor);

    // Typing a link stays in the editor until it loses focus.
    fireEvent.input(editor, { target: { value: 'See https://example.com' } });
    expect(onChange).toHaveBeenCalledWith('See https://example.com');
    expect(screen.getByRole('textbox', { name: 'Note' })).toBe(editor);

    fireEvent.blur(editor);
    expect(screen.getByRole('textbox', { name: 'Note' }).tagName).toBe('DIV');
  });

  it('opens links in the note instead of starting to edit', () => {
    renderNotes('Join: https://meet.google.com/abc-defg-hij');

    const link = screen.getByRole('link');
    expect(fireEvent.mouseDown(link)).toBe(false);
    expect(screen.getByRole('textbox', { name: 'Note' }).tagName).toBe('DIV');
  });

  it('keeps read-only notes out of the tab order', () => {
    render(
      <LocaleProvider locale='en-US'>
        <div className='df-event-detail-panel'>
          <EventNotesField
            id='note'
            value='Read only'
            editable={false}
            disabled={false}
            rows={3}
            onChange={vi.fn()}
          />
        </div>
      </LocaleProvider>
    );

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('note').tabIndex).toBe(-1);
  });

  it('clears the wide-layout flag when the field unmounts', () => {
    const { container, unmount } = renderNotes('Plain note');
    const surface = container.querySelector<HTMLElement>(
      '.df-event-detail-panel'
    )!;
    surface.dataset.notesWide = 'true';
    unmount();
    expect(surface.dataset.notesWide).toBeUndefined();
  });
});
