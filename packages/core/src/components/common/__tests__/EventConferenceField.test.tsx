import { fireEvent, render, screen } from '@testing-library/preact';
import { useState } from 'preact/hooks';

import { EventConferenceField } from '@/components/common/EventConferenceField';
import type { EventConference } from '@/types';

const Harness = ({
  initialValue,
  editable = true,
}: {
  initialValue?: EventConference;
  editable?: boolean;
}) => {
  const [value, setValue] = useState(initialValue);
  return (
    <EventConferenceField
      value={value}
      editable={editable}
      onChange={setValue}
    />
  );
};

describe('EventConferenceField', () => {
  it('recognizes a pasted meeting URL and renders a join action', () => {
    const { container } = render(<Harness />);

    fireEvent.input(screen.getByRole('textbox', { name: 'meetingUrl' }), {
      target: { value: 'meet.google.com/abc-defg-hij' },
    });
    expect(screen.queryByText('Google Meet')).not.toBeInTheDocument();
    expect(
      container.querySelector('.df-event-conference-provider-icon')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'done' }));
    expect(screen.getByText('abc-defg-hij')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'join' })).toHaveAttribute(
      'href',
      'https://meet.google.com/abc-defg-hij'
    );
  });

  it('lets an editable event replace its meeting URL', () => {
    render(
      <Harness
        initialValue={{
          provider: 'google-meet',
          joinUrl: 'https://meet.google.com/abc-defg-hij',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'editMeetingUrl' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'meetingUrl' }), {
      target: { value: 'https://us02web.zoom.us/j/123456789' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'done' }));

    expect(screen.getByText('Zoom')).toBeInTheDocument();
    expect(screen.getByText('123456789')).toBeInTheDocument();
  });

  it('does not use the provider hostname as a meeting ID', () => {
    render(
      <Harness
        initialValue={{
          provider: 'microsoft-teams',
          joinUrl: 'https://teams.microsoft.com/meet/4381204',
        }}
      />
    );

    expect(screen.getByText('Microsoft Teams')).toBeInTheDocument();
    expect(screen.queryByText('teams.microsoft.com')).not.toBeInTheDocument();
  });

  it('does not commit an edited URL until the user confirms it', () => {
    const onChange = vi.fn();
    render(
      <EventConferenceField
        editable
        value={{
          provider: 'google-meet',
          joinUrl: 'https://meet.google.com/abc-defg-hij',
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'editMeetingUrl' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'meetingUrl' }), {
      target: { value: 'https://zoom.us/j/123456789' },
    });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'meetingUrl' }), {
      key: 'Escape',
    });
    expect(screen.getByText('abc-defg-hij')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not render unsafe join links', () => {
    render(
      <Harness
        editable={false}
        initialValue={{ joinUrl: 'javascript://alert(1)' }}
      />
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the provider icon slot while editing so the row does not shift', () => {
    const { container } = render(<Harness />);

    const editor = container.querySelector('.df-event-conference-editor');
    expect(
      editor?.firstElementChild?.classList.contains(
        'df-event-conference-provider-icon'
      )
    ).toBe(true);
  });

  it('moves focus into the link field when editing starts', () => {
    render(
      <Harness
        initialValue={{
          provider: 'google-meet',
          joinUrl: 'https://meet.google.com/abc-defg-hij',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'editMeetingUrl' }));
    const input = screen.getByRole('textbox', {
      name: 'meetingUrl',
    }) as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });
});
