import React, { useState } from 'react';
import { SketchPicker, ColorResult } from 'react-color';
import { getCalendarColorsForHex } from '../../core/calendarRegistry';
import { generateUniKey } from '../../utils/helpers';
import { CalendarType, CreateCalendarDialogProps } from '../../types';

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#64748b', // slate
  '#71717a', // zinc
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Create New Calendar
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-300">
              Calendar Name
            </label>
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full border border-gray-200 shadow-sm dark:border-gray-600"
                style={{ backgroundColor: selectedColor }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                placeholder="e.g. Work"
                autoFocus
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs text-gray-600 dark:text-gray-300">
              Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-6 w-6 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:focus:ring-offset-slate-800 ${
                    selectedColor === color
                      ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
            
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Custom Color
              </button>
            </div>

            {showPicker && (
              <div className="absolute left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-black/20">
                <div className="rounded-lg bg-white p-4 shadow-xl dark:bg-slate-800">
                  <SketchPicker
                    color={selectedColor}
                    onChange={handleColorChange}
                    disableAlpha
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPicker(false)}
                      className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
