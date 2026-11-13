import {
  hexToHsl,
  lightnessToSliderValue,
} from '@dayflow/blossom-color-picker';
import {
  BlossomColorPicker,
  getCalendarColorsForHex,
  ICalendarApp,
} from '@dayflow/core';
import { useEffect, useRef } from 'preact/hooks';

interface InlineCalendarColorPickerProps {
  app: ICalendarApp;
  calendarId: string;
  color: string;
  label: string;
}

/**
 * The rainbow swatch of the calendar context menu: a Blossom picker that
 * opens its petals where it sits, inside the menu. Colors preview on the
 * calendar while picking and are saved once, when the picker or the menu
 * closes.
 */
export const InlineCalendarColorPicker = ({
  app,
  calendarId,
  color,
  label,
}: InlineCalendarColorPickerProps) => {
  const pending = useRef(false);
  const commit = () => {
    if (!pending.current) return;
    pending.current = false;
    app.updateCalendar(calendarId, {});
  };
  // Closing the menu with the petals open still keeps the picked color.
  const latestCommit = useRef(commit);
  latestCommit.current = commit;
  useEffect(() => () => latestCommit.current(), []);

  const { h, l } = hexToHsl(color);
  return (
    <div
      className='df-sidebar-context-color'
      title={label}
      aria-label={label}
      onClick={e => e.stopPropagation()}
    >
      <BlossomColorPicker
        defaultValue={{
          hue: h,
          saturation: lightnessToSliderValue(l),
          lightness: l,
          alpha: 100,
          layer: 'outer',
        }}
        coreSize={22}
        petalSize={28}
        openOnHover={false}
        adaptivePositioning
        onChange={next => {
          const { colors, darkColors } = getCalendarColorsForHex(next.hex);
          pending.current = true;
          app.updateCalendar(calendarId, { colors, darkColors }, true);
        }}
        onCollapse={commit}
      />
    </div>
  );
};
