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
import { LoadingButton } from './LoadingButton';

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
  const [isLoading, setIsLoading] = useState(false);

  const hasCustomPicker = app.state.overrides.includes(
    'createCalendarDialogColorPicker'
  );

  const [customSelectedColor, setCustomSelectedColor] = useState(
    PICKER_DEFAULT_COLORS[
      Math.floor(Math.random() * PICKER_DEFAULT_COLORS.length)
    ]
  );
  const [showPicker, setShowPicker] = useState(false);
  const [previousColor, setPreviousColor] = useState('');

  const initialColorData = useMemo(() => {
    const randomColor =
      DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
    const layer = (randomColor as { layer?: string }).layer || 'outer';
    const sliderValue = lightnessToSliderValue(randomColor.l);
    return {
      hue: randomColor.h,
      saturation: sliderValue,
      lightness: randomColor.l,
      alpha: 100,
      layer: layer as 'inner' | 'outer',
    };
  }, []);

  const [blossomSelectedColor, setBlossomSelectedColor] = useState<{
    hex: string;
    hue: number;
    saturation: number;
    lightness?: number;
    alpha: number;
    layer: 'inner' | 'outer';
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;

    setIsLoading(true);
    try {
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

      await onCreate(newCalendar);
      onClose();
    } finally {
      setIsLoading(false);
    }
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
      body: { background: isDark ? '#1e293b' : '#ffffff' },
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
    <div className='df-portal df-create-calendar-dialog__backdrop'>
      <div
        className='df-animate-in df-fade-in df-zoom-in-95 df-create-calendar-dialog__panel'
        onClick={e => e.stopPropagation()}
      >
        <h2
          className={`df-create-calendar-dialog__title ${
            hasCustomPicker ? 'df-create-calendar-dialog__title--compact' : ''
          }`}
        >
          {t('createCalendar')}
        </h2>

        <form onSubmit={handleSubmit}>
          {hasCustomPicker ? (
            <>
              <div className='df-create-calendar-dialog__color-row'>
                <div
                  className='df-create-calendar-dialog__color-preview'
                  style={{ backgroundColor: customSelectedColor }}
                />
                <input
                  id='custom-calendar-name'
                  name='calendar-name'
                  type='text'
                  value={name}
                  onChange={e => setName((e.target as HTMLInputElement).value)}
                  className='df-form-input'
                  style={{ flex: 1 }}
                  placeholder={t('calendarNamePlaceholder')}
                  autoFocus
                />
              </div>

              <div className='df-create-calendar-dialog__color-section'>
                <div className='df-create-calendar-dialog__color-grid'>
                  {PICKER_DEFAULT_COLORS.map(color => (
                    <button
                      key={color}
                      type='button'
                      className='df-create-calendar-dialog__color-btn'
                      data-selected={
                        customSelectedColor === color ? 'true' : 'false'
                      }
                      style={{ backgroundColor: color }}
                      onClick={() => setCustomSelectedColor(color)}
                    />
                  ))}
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    type='button'
                    onClick={handleOpenPicker}
                    className='df-create-calendar-dialog__custom-color-btn'
                  >
                    {t('customColor')}
                  </button>

                  {showPicker && (
                    <div
                      className='df-create-calendar-dialog__picker-overlay'
                      onClick={handleCancel}
                    >
                      <div
                        className='df-animate-in df-fade-in df-zoom-in-95 df-create-calendar-dialog__picker-inner'
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
                            <div className='df-create-calendar-dialog__picker-card'>
                              <DefaultColorPicker
                                color={customSelectedColor}
                                onChange={handleColorChange}
                              />
                              <div className='df-create-calendar-dialog__picker-actions'>
                                <button
                                  type='button'
                                  onClick={handleCancel}
                                  className='df-btn-sm df-btn-sm--ghost'
                                >
                                  {t('cancel')}
                                </button>
                                <button
                                  type='button'
                                  onClick={handleAccept}
                                  className='df-fill-primary df-btn-sm'
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
            <div className='df-create-calendar-dialog__blossom-row'>
              <div className='df-create-calendar-dialog__blossom-input-area'>
                <input
                  id='blossom-calendar-name'
                  name='calendar-name'
                  type='text'
                  value={name}
                  onChange={e => setName((e.target as HTMLInputElement).value)}
                  className='df-form-input'
                  placeholder={t('calendarNamePlaceholder')}
                  autoFocus
                />
              </div>

              <div className='df-create-calendar-dialog__blossom-picker-wrap'>
                <div className='df-create-calendar-dialog__blossom-picker-inner'>
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

          <div className='df-create-calendar-dialog__actions'>
            <button
              type='button'
              onClick={onClose}
              disabled={isLoading}
              className='df-btn-sm df-btn-sm--ghost'
            >
              {t('cancel')}
            </button>
            <LoadingButton
              type='submit'
              disabled={!name.trim()}
              loading={isLoading}
              className='df-fill-primary df-hover-primary-solid df-btn-sm'
            >
              {t('create')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
