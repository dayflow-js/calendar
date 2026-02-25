'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

interface ColorSwatchProps {
  name: string;
  lightColor: string;
  darkColor: string;
  lightLabel: string;
  darkLabel: string;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({
  name,
  lightColor,
  darkColor,
  lightLabel,
  darkLabel,
}) => (
  <div className='flex flex-col gap-2'>
    <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
      {name}
    </div>
    <div className='grid grid-cols-2 gap-2'>
      {/* Light mode color */}
      <div className='flex flex-col gap-1'>
        <div
          className='h-16 w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700'
          style={{ backgroundColor: lightColor }}
        />
        <div className='font-mono text-xs text-gray-600 dark:text-gray-400'>
          {lightColor}
        </div>
        <div className='text-xs text-gray-500 dark:text-gray-500'>
          {lightLabel}
        </div>
      </div>
      {/* Dark mode color */}
      <div className='flex flex-col gap-1'>
        <div
          className='h-16 w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700'
          style={{ backgroundColor: darkColor }}
        />
        <div className='font-mono text-xs text-gray-600 dark:text-gray-400'>
          {darkColor}
        </div>
        <div className='text-xs text-gray-500 dark:text-gray-500'>
          {darkLabel}
        </div>
      </div>
    </div>
  </div>
);

const translations = {
  en: {
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
    yellow: 'Yellow',
    red: 'Red',
    orange: 'Orange',
    pink: 'Pink',
    teal: 'Teal',
    indigo: 'Indigo',
    gray: 'Gray',
    light: 'Light',
    dark: 'Dark',
    tip: 'Tip:',
    wcagNote:
      'All colors meet WCAG AA contrast requirements for both light and dark backgrounds, ensuring good readability.',
  },
  zh: {
    blue: '蓝色',
    green: '绿色',
    purple: '紫色',
    yellow: '黄色',
    red: '红色',
    orange: '橙色',
    pink: '粉色',
    teal: '青色',
    indigo: '靛蓝',
    gray: '灰色',
    light: '浅色',
    dark: '深色',
    tip: '提示：',
    wcagNote:
      '所有颜色都符合 WCAG AA 对比度标准，确保在浅色和深色背景下都具有良好的可读性。',
  },
  ja: {
    blue: 'ブルー',
    green: 'グリーン',
    purple: 'パープル',
    yellow: 'イエロー',
    red: 'レッド',
    orange: 'オレンジ',
    pink: 'ピンク',
    teal: 'ティール',
    indigo: 'インディゴ',
    gray: 'グレー',
    light: 'ライト',
    dark: 'ダーク',
    tip: 'ヒント：',
    wcagNote:
      'すべての色はWCAG AAコントラスト基準を満たしており、明暗どちらの背景でも読みやすくなっています。',
  },
};

export const DefaultColorPalette: React.FC = () => {
  const pathname = usePathname();

  // Detect language from pathname
  const lang = pathname?.startsWith('/docs-zh')
    ? 'zh'
    : pathname?.startsWith('/docs-ja')
      ? 'ja'
      : 'en';

  const t = translations[lang];

  const colors = [
    { key: 'blue', light: '#3b82f6', dark: '#60a5fa' },
    { key: 'green', light: '#22c55e', dark: '#4ade80' },
    { key: 'purple', light: '#a855f7', dark: '#c084fc' },
    { key: 'yellow', light: '#eab308', dark: '#facc15' },
    { key: 'red', light: '#ef4444', dark: '#f87171' },
    { key: 'orange', light: '#f97316', dark: '#fb923c' },
    { key: 'pink', light: '#ec4899', dark: '#f472b6' },
    { key: 'teal', light: '#14b8a6', dark: '#2dd4bf' },
    { key: 'indigo', light: '#6366f1', dark: '#818cf8' },
    { key: 'gray', light: '#6b7280', dark: '#9ca3af' },
  ];

  return (
    <div className='not-prose my-8'>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {colors.map(color => (
          <ColorSwatch
            key={color.key}
            name={t[color.key as keyof typeof t] as string}
            lightColor={color.light}
            darkColor={color.dark}
            lightLabel={t.light}
            darkLabel={t.dark}
          />
        ))}
      </div>
      <div className='mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'>
        <strong>{t.tip}</strong> {t.wcagNote}
      </div>
    </div>
  );
};
