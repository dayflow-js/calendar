import {
  DEFAULT_COLORS,
  hslToHex,
  lightnessToSliderValue,
} from '@dayflow/blossom-color-picker';
import { createPortal } from 'preact/compat';
import { useState, useMemo } from 'preact/hooks';

import { useTheme } from '@/contexts/ThemeContext';
import { getCalendarColorsForHex } from '@/core/calendarRegistry';
import { useLocale } from '@/locale';
import { ContentSlot } from '@/renderer/ContentSlot';
import { CalendarType, CreateCalendarDialogProps } from '@/types';
import { generateUniKey } from '@/utils/helpers';

import { BlossomColorPicker } from './BlossomColorPicker';
import { DefaultColorPicker } from './DefaultColorPicker';

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
  app,
}: CreateCalendarDialogProps) => {
  const { t } = useLocale();
  const { effectiveTheme } = useTheme();
  const [name, setName] = useState('');

  // Detect if custom color picker slot is provided
  const hasCustomPicker = app.state.overrides.includes(
    'createCalendarDialogColorPicker'
  );

  // State for custom mode
  const [customSelectedColor, setCustomSelectedColor] = useState(
    PICKER_DEFAULT_COLORS[
      Math.floor(Math.random() * PICKER_DEFAULT_COLORS.length)
    ]
  );
  const [showPicker, setShowPicker] = useState(false);
  const [previousColor, setPreviousColor] = useState('');

  // Pick a random initial color from all colors for blossom mode
  const initialColorData = useMemo(() => {
    const randomColor =
      DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];

    // Default to 'outer' as the simplified DEFAULT_COLORS might not have layer info
    const layer = (randomColor as { layer?: string }).layer || 'outer';

    // Calculate slider position from the petal's lightness
    const sliderValue = lightnessToSliderValue(randomColor.l);

    return {
      hue: randomColor.h,
      saturation: sliderValue, // This is now the slider position
      lightness: randomColor.l,
      alpha: 100,
      layer: layer as 'inner' | 'outer',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let hex: string;
    if (hasCustomPicker) {
      hex = customSelectedColor;
    } else {
      hex =
        blossomSelectedColor?.hex ??
        hslToHex(
          initialColorData.hue,
          initialColorData.saturation,
          initialColorData.lightness
        );
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

  const handleColorChange = (color: { hex: string }) => {
    setCustomSelectedColor(color.hex);
  };

  const handleOpenPicker = () => {
    setPreviousColor(customSelectedColor);
    setShowPicker(true);
  };

  const handleAccept = () => {
    setShowPicker(false);
  };

  const handleCancel = () => {
    setCustomSelectedColor(previousColor);
    setShowPicker(false);
  };

  const isDark = effectiveTheme === 'dark';
  const pickerStyles = {
    default: {
      picker: {
        background: isDark ? '#1e293b' : '#ffffff',
        boxShadow:
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
      },
    },
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className='fixed inset-0 z-10000 flex items-center justify-center bg-black/50'>
      <div
        className='df-animate-in df-fade-in df-zoom-in-95 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900'
        onClick={e => e.stopPropagation()}
      >
        <h2
          className={`text-lg font-semibold text-gray-900 dark:text-white ${hasCustomPicker ? 'mb-4' : 'mb-6'}`}
        >
          {t('createCalendar')}
        </h2>

        <form onSubmit={handleSubmit}>
          {hasCustomPicker ? (
            // 3-line layout (Automatically triggered when createCalendarDialogColorPicker slot is provided)
            <>
              <div className='mb-4'>
                <div className='flex items-center gap-3'>
                  <div
                    className='h-9 w-9 rounded-md border border-gray-200 shadow-sm dark:border-gray-600'
                    style={{ backgroundColor: customSelectedColor }}
                  />
                  <input
                    id='custom-calendar-name'
                    name='calendar-name'
                    type='text'
                    value={name}
                    onChange={e =>
                      setName((e.target as HTMLInputElement).value)
                    }
                    className='w-full flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-gray-900 shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                    placeholder={t('calendarNamePlaceholder')}
                    autoFocus
                  />
                </div>
              </div>

              <div className='mb-6'>
                <div className='mb-4 grid grid-cols-7 gap-4'>
                  {PICKER_DEFAULT_COLORS.map(color => (
                    <button
                      key={color}
                      type='button'
                      className={`h-7 w-7 rounded-full border border-gray-200 transition-transform hover:scale-110 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:focus:ring-offset-slate-800 ${
                        customSelectedColor === color
                          ? 'scale-110 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-800'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCustomSelectedColor(color)}
                    />
                  ))}
                </div>

                <div className='relative'>
                  <button
                    type='button'
                    onClick={handleOpenPicker}
                    className='flex w-full items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                  >
                    {t('customColor')}
                  </button>

                  {showPicker && (
                    <div
                      className='fixed inset-0 z-10001 flex items-center justify-center bg-black/40 backdrop-blur-sm'
                      onClick={handleCancel}
                    >
                      <div
                        className='df-animate-in df-fade-in df-zoom-in-95 relative'
                        onClick={e => e.stopPropagation()}
                      >
                        <ContentSlot
                          generatorName='createCalendarDialogColorPicker'
                          generatorArgs={{
                            color: customSelectedColor,
                            onChange: handleColorChange,
                            onAccept: handleAccept,
                            onCancel: handleCancel,
                            styles: pickerStyles,
                          }}
                          defaultContent={
                            <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-gray-900'>
                              <DefaultColorPicker
                                color={customSelectedColor}
                                onChange={handleColorChange}
                              />
                              <div className='mt-4 flex justify-end gap-2 border-t pt-3 dark:border-slate-700'>
                                <button
                                  type='button'
                                  onClick={handleCancel}
                                  className='rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-gray-100 dark:border-gray-600 dark:text-slate-300 dark:hover:bg-gray-800'
                                >
                                  {t('cancel')}
                                </button>
                                <button
                                  type='button'
                                  onClick={handleAccept}
                                  className='rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90'
                                >
                                  OK
                                </button>
                              </div>
                            </div>
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Blossom mode UI (Default when no slot provided)
            <div className='mb-8 flex items-center gap-4'>
              <div className='flex-1'>
                <input
                  id='blossom-calendar-name'
                  name='calendar-name'
                  type='text'
                  value={name}
                  onChange={e => setName((e.target as HTMLInputElement).value)}
                  className='w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-gray-900 shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                  placeholder={t('calendarNamePlaceholder')}
                  autoFocus
                />
              </div>

              <div className='relative h-9 w-9 shrink-0'>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <BlossomColorPicker
                    defaultValue={initialColorData}
                    coreSize={36}
                    petalSize={32}
                    openOnHover={false}
                    onChange={color => setBlossomSelectedColor(color)}
                    onCollapse={color => setBlossomSelectedColor(color)}
                    className='z-50'
                  />
                </div>
              </div>
            </div>
          )}

          <div className='flex justify-end space-x-2'>
            <button
              type='button'
              onClick={onClose}
              className='rounded border border-slate-200 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
            >
              {t('cancel')}
            </button>
            <button
              type='submit'
              disabled={!name.trim()}
              className='rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50'
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
