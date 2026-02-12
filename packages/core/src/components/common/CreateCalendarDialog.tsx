import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { PhotoshopPicker, ColorResult } from 'react-color';
import { getCalendarColorsForHex } from '../../core/calendarRegistry';
import { generateUniKey } from '../../utils/helpers';
import { CalendarType, CreateCalendarDialogProps } from '../../types';
import { BlossomColorPicker, DEFAULT_COLORS, hslToHex, lightnessToSliderValue } from '@dayflow/blossom-color-picker-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocale } from '@/locale';

// Colors for default mode (react-color)
const PICKER_DEFAULT_COLORS = [
  '#ea426b',
  '#f19a38',
  '#f7cf46',
  '#83d754',
  '#51aaf2',
  '#b672d0',
  '#957e5e',
];

export const CreateCalendarDialog = ({
  onClose,
  onCreate,
  colorPickerMode = 'default',
}: CreateCalendarDialogProps) => {
  const { t } = useLocale();
  const { effectiveTheme } = useTheme();
  const [name, setName] = useState('');

  // State for default mode (react-color)
  const [defaultSelectedColor, setDefaultSelectedColor] = useState(
    PICKER_DEFAULT_COLORS[Math.floor(Math.random() * PICKER_DEFAULT_COLORS.length)]
  );
  const [showPicker, setShowPicker] = useState(false);
  const [previousColor, setPreviousColor] = useState('');

  // Pick a random initial color from all colors for blossom mode
  const initialColorData = useMemo(() => {
    const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];

    // Default to 'outer' as the simplified DEFAULT_COLORS might not have layer info
    const layer = (randomColor as any).layer || 'outer';

    // Calculate slider position from the petal's lightness
    const sliderValue = lightnessToSliderValue(randomColor.l);

    return {
      hue: randomColor.h,
      saturation: sliderValue, // This is now the slider position
      lightness: randomColor.l,
      alpha: 100,
      layer: layer as 'inner' | 'outer'
    };
  }, []);

  // State for blossom mode
  const [blossomSelectedColor, setBlossomSelectedColor] = useState<{
    hex: string;
    hue: number;
    saturation: number;
    lightness?: number;
    alpha: number;
    layer: 'inner' | 'outer';
  } | null>(null);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!name.trim()) return;

    let hex: string;
    if (colorPickerMode === 'blossom') {
      hex = blossomSelectedColor?.hex ?? hslToHex(initialColorData.hue, initialColorData.saturation, initialColorData.lightness);
    } else {
      hex = defaultSelectedColor;
    }

    const { colors, darkColors } = getCalendarColorsForHex(hex);

    const newCalendar: CalendarType = {
      id: generateUniKey(),
      name: name.trim(),
      colors,
      darkColors,
      isVisible: true,
      isDefault: false,
    };

    onCreate(newCalendar);
    onClose();
  };

  const handleColorChange = (color: ColorResult) => {
    setDefaultSelectedColor(color.hex);
  };

  const handleOpenPicker = () => {
    setPreviousColor(defaultSelectedColor);
    setShowPicker(true);
  };

  const handleAccept = () => {
    setShowPicker(false);
  };

  const handleCancel = () => {
    setDefaultSelectedColor(previousColor);
    setShowPicker(false);
  };

  const isDark = effectiveTheme === 'dark';
  const pickerStyles = {
    default: {
      picker: {
        background: isDark ? '#1e293b' : '#ffffff',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        borderRadius: '0.5rem',
        border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb',
      },
      head: {
        background: isDark ? '#1e293b' : '#ffffff',
        borderBottom: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb',
        boxShadow: 'none',
      },
      body: {
        background: isDark ? '#1e293b' : '#ffffff',
      },
      controls: {
        border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb',
      },
      input: {
        background: isDark ? '#374151' : '#ffffff',
        color: isDark ? '#f3f4f6' : '#1f2937',
        border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb',
        boxShadow: 'none',
      },
      previews: {
        border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb',
      },
      actions: {
        borderTop: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb',
      }
    },
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg p-6 shadow-xl bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-lg font-semibold text-gray-900 dark:text-white ${colorPickerMode === 'blossom' ? 'mb-6' : 'mb-4'}`}>
          {t('createCalendar')}
        </h2>

        <form onSubmit={handleSubmit}>
          {colorPickerMode === 'blossom' ? (
            // Blossom mode UI
            <div className="mb-8 flex items-center gap-4">
              <div className="flex-1">
                <input
                  id="blossom-calendar-name"
                  name="calendar-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName((e.target as HTMLInputElement).value)}
                  className="w-full border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder={t('calendarNamePlaceholder')}
                  autoFocus
                />
              </div>

              <div className="w-9 h-9 relative shrink-0">
                <div className="absolute inset-0 flex items-center justify-center">
                  <BlossomColorPicker
                    defaultValue={initialColorData}
                    coreSize={36}
                    petalSize={32}
                    openOnHover={false}
                    onChange={(color) => setBlossomSelectedColor(color)}
                    onCollapse={(color) => setBlossomSelectedColor(color)}
                    className="z-50"
                  />
                </div>
              </div>
            </div>
          ) : (
            // Default mode UI (react-color)
            <>
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-md border border-gray-200 shadow-sm dark:border-gray-600"
                    style={{ backgroundColor: defaultSelectedColor }}
                  />
                  <input
                    id="default-calendar-name"
                    name="calendar-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName((e.target as HTMLInputElement).value)}
                    className="w-full flex-1 border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder={t('calendarNamePlaceholder')}
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="grid grid-cols-7 gap-6">
                  {PICKER_DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-gray-600 dark:focus:ring-offset-slate-800 ${defaultSelectedColor === color
                        ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-800' : ''
                        }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setDefaultSelectedColor(color)}
                    />
                  ))}
                </div>

                <div className="mt-2 relative">
                  <button
                    type="button"
                    onClick={handleOpenPicker}
                    className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
                  >
                    {t('customColor')}
                  </button>

                  {showPicker && (
                    <div className="absolute left-0 top-full z-10001 mt-2">
                      {h(PhotoshopPicker as any, {
                        color: defaultSelectedColor,
                        onChange: handleColorChange,
                        onAccept: handleAccept,
                        onCancel: handleCancel,
                        styles: pickerStyles as any,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 border border-slate-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-xs font-medium transition disabled:opacity-50"
            >
              {t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
