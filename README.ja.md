# DayFlow

[English](README.md) | [中文](README.zh.md) | **日本語** | [はじめに & コントリビューション](CONTRIBUTING.md)

ドラッグ＆ドロップ、マルチビュー、プラグインアーキテクチャをサポートする、柔軟で機能豊富なReactカレンダーコンポーネントライブラリ。

[![npm](https://img.shields.io/npm/v/@dayflow/core?logo=npm&color=blue&label=version)](https://www.npmjs.com/package/@dayflow/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?logo=github)](https://github.com/dayflow-js/dayflow/pulls)
[![License](https://img.shields.io/github/license/dayflow-js/dayflow)](https://github.com/dayflow-js/dayflow/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/9vdFZKJqBb)

## 🗓️ 機能

### ✨ 月次、週次、日次、その他のビュータイプ

| 月次                                     | 週次                                   |
|------------------------------------------|----------------------------------------|
| ![image](./assets/images//MonthView.png) | ![image](./assets/images/WeekView.png) |

| 日次                                  | イベントスタックレベル                              |
|---------------------------------------|------------------------------------------|
| ![image](./assets/images/DayView.png) | ![image](./assets/images/stackLevel.png) |

### 🤩 デフォルトパネル（複数のイベント詳細パネルオプションが利用可能）

| 詳細ポップアップ                          | 詳細ダイアログ                            |
|-------------------------------------|--------------------------------------|
| ![image](./assets/images/popup.png) | ![image](./assets/images/dialog.png) |

## クイックスタート

公式サイト:

https://dayflow-js.github.io/calendar/

### インストール

```bash
npm install @dayflow/core lucide-react
```

**DayFlow** アプリ全体は `useCalendarApp` フックを通じて作成され、**`calendar`** オブジェクトを返します。

このオブジェクトは、`DayFlowCalendar` UI コンポーネントを使用してレンダリングされます。

```tsx
'use client';

import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createEvent,
  createAllDayEvent,
  createTimedEvent,
} from '@dayflow/core';
import '@dayflow/core/dist/styles.css';

// ローカル時間指定イベント（タイムゾーンの複雑さなし）
const meeting = createEvent({
  id: '1',
  title: 'Team Meeting',
  start: new Date(2024, 9, 15, 10, 0), // 2024年10月15日 10:00
  end: new Date(2024, 9, 15, 11, 0), // 2024年10月15日 11:00
});

// 終日イベント
const holiday = createAllDayEvent(
  '2',
  'Tech Conference',
  new Date(2024, 9, 20)
);

// 時間指定イベントのクイック作成
const lunch = createTimedEvent(
  '3',
  'Lunch Break',
  new Date(2024, 9, 15, 12, 0), // 12:00
  new Date(2024, 9, 15, 13, 0) // 13:00
);

export default function MyCalendar() {
  const calendar = useCalendarApp({
    views: [createMonthView()],
    events: [],
    calendars: [],
    defaultView: 'month',
    initialDate: new Date(),
  });

  return <DayFlowCalendar calendar={calendar} />;
}
```

- **views**: カレンダービューの配列。現在、DayFlow は4つの組み込みファクトリ関数を提供しています：
  `createMonthView`、`createWeekView`、`createDayView`、および `createYearView`（開発中）。
  ビューの順序によってタブの順序が決まります（年 / 月 / 週 / 日）。
- **events**: カレンダーのコアデータ。イベントタイプに応じて、組み込みヘルパー
  `createEvent`、`createAllDayEvent`、および `createTimedEvent` を使用して作成できます。

---

## `useCalendarApp` 設定オプション

| オプション                  | 型                         | デフォルト               | 説明                                                                     | 必須 |
|------------------------|----------------------------|---------------------|--------------------------------------------------------------------------|------|
| `views`                | `CalendarView[]`           | —                   | 登録されたビュー定義（例：`createMonthView()`）。少なくとも1つのビューが必要です               | ✅    |
| `plugins`              | `CalendarPlugin[]`         | `[]`                | オプションのプラグイン（ドラッグサポート、キーボードショートカットなど）。各プラグインはインストール中にアプリインスタンスを受け取ります | ❌    |
| `events`               | `Event[]`                  | `[]`                | 初期のイベントデータ。後で `addEvent` / `updateEvent` を使用して変更します               | ❌    |
| `callbacks`            | `CalendarCallbacks`        | `{}`                | ビュー、日付、またはイベントの変更時にトリガーされるライフサイクルフック — API 同期に最適です              | ❌    |
| `defaultView`          | `ViewType`                 | `ViewType.WEEK`     | ロード時の初期ビュー。`views` に存在する必要があります                                   | ❌    |
| `initialDate`          | `Date`                     | `new Date()`        | 初期のフォーカス日付（可視範囲の計算も初期化します）                                  | ❌    |
| `switcherMode`         | `'buttons' \| 'select'`    | `'buttons'`         | ヘッダー内の組み込みビュースイッチャーのレンダリング方法を制御します                                | ❌    |
| `calendars`            | `CalendarType[]`           | `[]`                | カレンダーカテゴリ（仕事、個人など）を色と表示設定とともに登録します                            | ❌    |
| `defaultCalendar`      | `string`                   | 最初の可視カレンダー      | 新しいイベントを作成するときに使用されるカレンダー ID                                        | ❌    |
| `theme`                | `ThemeConfig`              | `{ mode: 'light' }` | グローバルテーマモードとオプションのトークンオーバーライド                                            | ❌    |
| `locale`               | `string \| Locale`         | `'en-US'`           | 国際化 (i18n)。言語コード（例：`'ja'`）または Locale オブジェクトをサポートします                | ❌    |
| `useSidebar`           | `boolean \| SidebarConfig` | `false`             | 組み込みサイドバーを有効にするか、幅、折りたたみ状態、およびレンダラーをカスタマイズします                    | ❌    |
| `useEventDetailDialog` | `boolean`                  | `false`             | イベント詳細にインラインパネルではなくモーダルダイアログを使用します                                   | ❌    |

## コールバック関数

`callbacks` は、DayFlow とバックエンドまたは外部状態管理の間のブリッジとして機能します。

これらは通常、データベースまたは API との CRUD 操作に使用されます。

例：

- `onViewChange(view)`: ビューの切り替え後にトリガーされます（分析や URL 同期に便利）
- `onDateChange(date)`: フォーカスされた日付が変更されたときに発火します
- `onVisibleMonthChange(date)`: 表示されている月が変更されたときにトリガーされます（データのプリロードに便利）
- `onEventCreate / Update / Delete`: イベント CRUD をバックエンドに接続します
- `onCalendarCreate / Update / Delete`: カレンダーリストの変更を同期します
- `onCalendarMerge(sourceId, targetId)`: 2つのカレンダーをマージするときにトリガーされます
- `onRender`: レンダリングサイクル後に発火し、パフォーマンス監視に適しています

```tsx
const calendar = useCalendarApp({
  views: [createDayView(), createWeekView(), createMonthView()],
  events,
  calendars: customCalendarTypes,
  defaultCalendar: 'work',
  plugins: [dragPlugin],
  theme: { mode: 'auto' },
  useSidebar: sidebarConfig,
  callbacks: {
    onCalendarUpdate: async calendar => {
      console.log('update calendar:', calendar);
    },
    onCalendarDelete: async calendar => {
      console.log('delete calendar:', calendar);
    },
    onCalendarCreate: async calendar => {
      // await server API call
      console.log('create calendar:', calendar);
    },
    onCalendarMerge: async (sourceId, targetId) => {
      console.log('merge calendar:', sourceId, targetId);
    },
  },
});
```

---

## イベント詳細管理

DayFlow には、以下の編集をサポートするデフォルトのイベント詳細パネルが含まれています：

- タイトル
- 時間範囲
- メモ

`meta` オブジェクトを渡して、**会議リンク**、**場所** などのカスタムフィールドを保存することもできます。

<img width="536" height="323" alt="image" src="https://github.com/user-attachments/assets/7a599105-460e-4f83-8418-92bcd0ff8c2a" />

`useEventDetailDialog` を `DayFlowCalendar` に渡すことで、詳細パネルをモーダルダイアログとして有効にできます：

```tsx
<DayFlowCalendar calendar={calendar} useEventDetailDialog={true} />
```

<img width="1476" height="1108" alt="image" src="https://github.com/user-attachments/assets/c9f1e231-f8d1-4006-8ff1-942bb7491934" />

---

### カスタムイベント詳細パネル / ダイアログ

完全にカスタマイズされた UI の場合、以下を提供することで、デフォルトの詳細パネルまたはダイアログを独自のコンポーネントに置き換えることができます：

- `customDetailPanelContent`
- `customEventDetailDialog`

```tsx
<DayFlowCalendar
  calendar={calendar}
  customEventDetailDialog={CustomDialog} // Modal dialog
  customDetailPanelContent={CustomContent} // Floating panel
/>
```

詳細はドキュメントをご覧ください：

- **カスタムイベント詳細ダイアログ**
  https://dayflow-js.github.io/calendar/docs-ja/features/custom-detail-dialog
- **カスタムイベント詳細パネル**
  https://dayflow-js.github.io/calendar/docs-ja/features/custom-detail-panel

---

## サイドバー

DayFlow には強力な組み込みサイドバーが搭載されています。

以下のことができます：

- サイドバーからカレンダーをドラッグしてイベントを作成

  ![Area](https://github.com/user-attachments/assets/938a9a8f-b995-4ea0-8fe3-fa25ca2be4b6)

- カレンダーの統合、削除、色の変更

  <img width="540" height="423" alt="image" src="https://github.com/user-attachments/assets/257a8671-e645-43fe-861e-613030f6c46e" />

- プリセットカラーの使用、またはカラーピッカーによるカスタムカラーの選択

  <img width="872" height="708" alt="image" src="https://github.com/user-attachments/assets/bfda7cde-281e-4c23-86d6-910b13e7bc63" />

```tsx
const calendar = useCalendarApp({
  views: [createMonthView(), createWeekView(), createDayView()],
  plugins: [createDragPlugin()],
  events,
  calendars,
  defaultView: ViewType.WEEK,
  useSidebar: {
    enabled: true,
    width: 280,
  },
});
```

---

### `useSidebar` 設定

| プロパティ                        | 型                                                                 | 説明                                                                  | デフォルト      |
|------------------------------|--------------------------------------------------------------------|-----------------------------------------------------------------------|------------|
| `enabled`                    | `boolean`                                                          | サイドバーが有効かどうか。                                                       | `true`     |
| `width`                      | `number \| string`                                                 | サイドバーの幅（例：`240` または `'20%'`）。                                       | `'240px'`  |
| `initialCollapsed`           | `boolean`                                                          | サイドバーがデフォルトで折りたたまれているかどうか。                                           | `false`    |
| `render`                     | `(props: CalendarSidebarRenderProps) => React.ReactNode`           | サイドバー UI の完全なオーバーライド。                                               | -          |
| `createCalendarMode`         | `'inline' \| 'modal'`                                              | 新しいカレンダーを作成するモード：`inline`（リスト内で直接編集）または `modal`（ポップアップダイアログ）。 | `'inline'` |
| `renderCalendarContextMenu`  | `(calendar: CalendarType, onClose: () => void) => React.ReactNode` | カレンダーアイテムの右クリックコンテキストメニューのカスタムレンダラー。                                 | -          |
| `renderCreateCalendarDialog` | `(props: CreateCalendarDialogProps) => React.ReactNode`            | カレンダー作成ダイアログのカスタムレンダラー（`modal` モードで使用）。                           | -          |


---

### カスタムサイドバー

プロジェクトに独自のサイドバーデザインがすでにある場合は、`useSidebar.render` を使用して完全にカスタマイズできます。

このレンダリング関数は、リアルタイムのカレンダー状態と、DayFlow コアと対話するためのヘルパーメソッドを受け取ります。

**`CalendarSidebarRenderProps` は、カスタムサイドバーと DayFlow コア間の通信を可能にします。**

```tsx
import type { CalendarSidebarRenderProps } from '@dayflow/core';

const CustomSidebar = ({
  app,
  calendars,
  toggleCalendarVisibility,
  toggleAll,
  isCollapsed,
  setCollapsed,
}: CalendarSidebarRenderProps) => {
  if (isCollapsed) {
    return <button onClick={() => setCollapsed(false)}>Expand Sidebar</button>;
  }

  return (
    <aside className="flex h-full flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Calendars</h3>
        <div className="space-x-2">
          <button onClick={() => toggleAll(true)}>Show All</button>
          <button onClick={() => toggleAll(false)}>Hide All</button>
        </div>
      </header>
      <ul className="space-y-2">
        {calendars.map(calendar => (
          <li key={calendar.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={calendar.isVisible}
              onChange={() =>
                toggleCalendarVisibility(calendar.id, !calendar.isVisible)
              }
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: calendar.colors.eventColor }}
            />
            {calendar.name}
          </li>
        ))}
      </ul>
      <section className="rounded-xl border border-slate-200 p-3 text-xs">
        <p>Current date: {app.getCurrentDate().toDateString()}</p>
        <p>Total events: {app.getEvents().length}</p>
      </section>
    </aside>
  );
};

const calendar = useCalendarApp({
  /* ... */
  useSidebar: {
    enabled: true,
    width: 320,
    render: props => <CustomSidebar {...props} />,
  },
});
```

---

## ダークモード

DayFlow Calendar は、ビュー、サイドバー、イベントカード、ダイアログ全体で完全なダークモードをネイティブにサポートしています。

<img width="1103" height="729" alt="image" src="https://github.com/user-attachments/assets/03c542d4-4b1b-4b99-9590-08c7be7f85df" />

**light**（ライト）、**dark**（ダーク）、または **auto**（システム設定に従う）を切り替えることができます。

```tsx
import { DayFlowCalendar, useCalendarApp } from '@dayflow/core';

function MyCalendar() {
  const calendar = useCalendarApp({
    theme: {
      mode: 'dark', // 'light' | 'dark' | 'auto'
    },
  });

  return <DayFlowCalendar calendar={calendar} />;
}
```

---

## ビュースイッチャーモード

`switcherMode` オプションは、ヘッダーのビュースイッチャーのレンダリング方法を制御します。

DayFlow は2つの組み込みモードを提供します：

- **`buttons`**: 水平ボタンタブ（デフォルト、デスクトップに最適）

<img width="2190" height="406" alt="image" src="https://github.com/user-attachments/assets/a4be37bc-90ac-4872-afa0-589e3d1f7e9b" />

- **`select`**: ドロップダウンメニュー（省スペース、モバイルフレンドリー）

<img width="2186" height="420" alt="image" src="https://github.com/user-attachments/assets/28e321ae-6c56-441a-a9fc-ddcfa504c920" />

---

## コントリビューション

コントリビューションは大歓迎です！お気軽に Pull Request を送信してください。

## バグ報告

バグを見つけた場合は、[GitHub Issues](https://github.com/dayflow-js/dayflow/issues) で問題を報告してください。

## サポート

質問やサポートについては、GitHub で Issue を開くか、Discord に参加してください。

---