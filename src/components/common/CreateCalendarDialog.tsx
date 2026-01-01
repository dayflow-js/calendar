import React, { useState } from 'react';
import { PhotoshopPicker, ColorResult } from 'react-color';
import { getCalendarColorsForHex } from '../../core/calendarRegistry';
import { generateUniKey } from '../../utils/helpers';
import { CalendarType, CreateCalendarDialogProps } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { cancelButton } from '@/styles/classNames';

const COLORS = [
  '#ea426b',
  '#f19a38',
  '#f7cf46',
  '#83d754',
  '#51aaf2',
  '#b672d0',
  '#957e5e',
];

export const CreateCalendarDialog: React.FC<CreateCalendarDialogProps> = ({
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(
    COLORS[Math.floor(Math.random() * COLORS.length)]
  );
  const [showPicker, setShowPicker] = useState(false);
  const [previousColor, setPreviousColor] = useState('');
  const { effectiveTheme } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { colors, darkColors } = getCalendarColorsForHex(selectedColor);

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
    setSelectedColor(color.hex);
  };

  const handleOpenPicker = () => {
    setPreviousColor(selectedColor);
    setShowPicker(true);
  };

  const handleAccept = () => {
    setShowPicker(false);
  };

  const handleCancel = () => {
    setSelectedColor(previousColor);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg p-6 shadow-xl bg-background">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Create New Calendar
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-md border border-gray-200 shadow-sm dark:border-gray-600"
                style={{ backgroundColor: selectedColor }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-primary dark:focus:ring-primary"
                placeholder="e.g. Work"
                autoFocus
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-7 gap-6">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-6 w-6 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-gray-600 dark:focus:ring-offset-slate-800 ${selectedColor === color
                    ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-800' : ''
                    }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>

            <div className="mt-2 relative">
              <button
                type="button"
                onClick={handleOpenPicker}
                className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
              >
                Custom Color...
              </button>

              {showPicker && (
                <div className="absolute left-0 top-full z-50 mt-2">
                  <PhotoshopPicker
                    color={selectedColor}
                    onChange={handleColorChange}
                    onAccept={handleAccept}
                    onCancel={handleCancel}
                    styles={pickerStyles}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className={cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
