# DayFlow

[English](README.md) | **中文** | [日本語](README.ja.md) | [快速开始 & 贡献](CONTRIBUTING.md)

一个灵活且功能丰富的 React 日历组件库，支持拖拽、多视图和插件架构。

[![npm](https://img.shields.io/npm/v/@dayflow/core?logo=npm&color=blue&label=version)](https://www.npmjs.com/package/@dayflow/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?logo=github)](https://github.com/dayflow-js/dayflow/pulls)
[![License](https://img.shields.io/github/license/dayflow-js/dayflow)](https://github.com/dayflow-js/dayflow/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/9vdFZKJqBb)

## 🗓️ 功能特性

### ✨ 月视图、周视图、日视图及多种视图类型

| 月视图                                   | 周视图                                 |
|------------------------------------------|----------------------------------------|
| ![image](./assets/images//MonthView.png) | ![image](./assets/images/WeekView.png) |

| 日视图                                | 事件堆叠层级                             |
|---------------------------------------|------------------------------------------|
| ![image](./assets/images/DayView.png) | ![image](./assets/images/stackLevel.png) |

### 🤩 默认面板（提供多种事件详情面板选项）

| 详情弹窗                            | 详情对话框                           |
|-------------------------------------|--------------------------------------|
| ![image](./assets/images/popup.png) | ![image](./assets/images/dialog.png) |

## 快速开始

官方网站:

https://dayflow-js.github.io/calendar/

### 安装

```bash
npm install @dayflow/core lucide-react
```

整个 **DayFlow** 应用通过 `useCalendarApp` hook 创建，它返回一个 **`calendar`** 对象。

该对象随后通过 `DayFlowCalendar` UI 组件进行渲染。

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

// 本地定时事件（无时区复杂性）
const meeting = createEvent({
  id: '1',
  title: 'Team Meeting',
  start: new Date(2024, 9, 15, 10, 0), // 2024年10月15日 10:00
  end: new Date(2024, 9, 15, 11, 0), // 2024年10月15日 11:00
});

// 全天事件
const holiday = createAllDayEvent(
  '2',
  'Tech Conference',
  new Date(2024, 9, 20)
);

// 快速创建定时事件
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

- **views**: 日历视图数组。目前 DayFlow 提供四个内置工厂函数：
  `createMonthView`、`createWeekView`、`createDayView` 和 `createYearView`（开发中）。
  视图的顺序决定了标签页的顺序（年 / 月 / 周 / 日）。
- **events**: 日历的核心数据。可以使用内置助手函数
  `createEvent`、`createAllDayEvent` 和 `createTimedEvent` 创建事件，具体取决于事件类型。

---

## `useCalendarApp` 配置选项

| 选项 | 类型 | 默认值 | 描述 | 必填 |
|---|---|---|---|---|
| `views` | `CalendarView[]` | — | 注册的视图定义（如 `createMonthView()`）。至少需要一个视图 | ✅ |
| `plugins` | `CalendarPlugin[]` | `[]` | 可选插件（拖拽支持、键盘快捷键等）。每个插件在安装时都会接收 app 实例 | ❌ |
| `events` | `Event[]` | `[]` | 初始事件数据。后续使用 `addEvent` / `updateEvent` 进行修改 | ❌ |
| `callbacks` | `CalendarCallbacks` | `{}` | 视图、日期或事件变更时触发的生命周期钩子 — 适用于 API 同步 | ❌ |
| `defaultView` | `ViewType` | `ViewType.WEEK` | 加载时的初始视图；必须存在于 `views` 中 | ❌ |
| `initialDate` | `Date` | `new Date()` | 初始聚焦日期（也用于初始化可视范围计算） | ❌ |
| `switcherMode` | `'buttons' \| 'select'` | `'buttons'` | 控制头部内置视图切换器的渲染方式 | ❌ |
| `calendars` | `CalendarType[]` | `[]` | 注册日历分类（工作、个人等）及其颜色和可见性 | ❌ |
| `defaultCalendar` | `string` | 第一个可见日历 | 创建新事件时使用的日历 ID | ❌ |
| `theme` | `ThemeConfig` | `{ mode: 'light' }` | 全局主题模式和可选的 token 覆盖 | ❌ |
| `locale` | `string \| Locale` | `'en-US'` | 国际化 (i18n)。支持语言代码（如 `'zh'`）或 Locale 对象 | ❌ |
| `useSidebar` | `boolean \| SidebarConfig` | `false` | 启用内置侧边栏或自定义宽度、折叠状态及渲染器 | ❌ |
| `useEventDetailDialog` | `boolean` | `false` | 使用模态对话框代替内联面板显示事件详情 | ❌ |

## 回调函数

`callbacks` 充当 DayFlow 与后端或外部状态管理之间的桥梁。

它们通常用于数据库或 API 的 CRUD 操作。

示例包括：

- `onViewChange(view)`: 视图切换后触发（用于分析或 URL 同步）
- `onDateChange(date)`: 聚焦日期变更时触发
- `onVisibleMonthChange(date)`: 可视月份变更时触发（用于预加载数据）
- `onEventCreate / Update / Delete`: 连接事件 CRUD 与后端
- `onCalendarCreate / Update / Delete`: 同步日历列表变更
- `onCalendarMerge(sourceId, targetId)`: 合并两个日历时触发
- `onRender`: 渲染周期结束后触发，适用于性能监控

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

## 事件详情管理

DayFlow 包含一个默认的事件详情面板，支持编辑：

- 标题
- 时间范围
- 备注

您还可以传递 `meta` 对象来存储自定义字段，如 **会议链接**、**地点** 等。

<img width="536" height="323" alt="image" src="https://github.com/user-attachments/assets/7a599105-460e-4f83-8418-92bcd0ff8c2a" />

通过向 `DayFlowCalendar` 传递 `useEventDetailDialog`，可以将详情面板启用为模态对话框：

```tsx
<DayFlowCalendar calendar={calendar} useEventDetailDialog={true} />
```

<img width="1476" height="1108" alt="image" src="https://github.com/user-attachments/assets/c9f1e231-f8d1-4006-8ff1-942bb7491934" />

---

### 自定义事件详情面板 / 对话框

对于完全自定义的 UI，您可以通过以下方式提供自己的组件来替换默认详情面板或对话框：

- `customDetailPanelContent`
- `customEventDetailDialog`

```tsx
<DayFlowCalendar
  calendar={calendar}
  customEventDetailDialog={CustomDialog} // Modal dialog
  customDetailPanelContent={CustomContent} // Floating panel
/>
```

查看文档了解详情：

- **自定义事件详情对话框**
  https://dayflow-js.github.io/calendar/docs-zh/features/custom-detail-dialog
- **自定义事件详情面板**
  https://dayflow-js.github.io/calendar/docs-zh/features/custom-detail-panel

---

## 侧边栏

DayFlow 内置了强大的侧边栏。

您可以：

- 从侧边栏拖拽日历以创建事件

  ![Area](https://github.com/user-attachments/assets/938a9a8f-b995-4ea0-8fe3-fa25ca2be4b6)

- 合并、删除和重新着色日历

  <img width="540" height="423" alt="image" src="https://github.com/user-attachments/assets/257a8671-e645-43fe-861e-613030f6c46e" />

- 使用预设颜色或通过颜色选择器选择自定义颜色

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

### `useSidebar` 配置

| 属性 | 类型 | 描述 | 默认值 |
|---|---|---|---|
| `enabled` | `boolean` | 侧边栏是否启用。 | `true` |
| `width` | `number \| string` | 侧边栏宽度（如 `240` 或 `'20%'`）。 | `'240px'` |
| `initialCollapsed` | `boolean` | 侧边栏默认是否折叠。 | `false` |
| `render` | `(props: CalendarSidebarRenderProps) => React.ReactNode` | 侧边栏 UI 的完全覆盖。 | - |
| `createCalendarMode` | `'inline' \| 'modal'` | 创建新日历的模式：`inline`（列表内直接编辑）或 `modal`（弹出对话框）。 | `'inline'` |
| `renderCalendarContextMenu` | `(calendar: CalendarType, onClose: () => void) => React.ReactNode` | 日历项右键菜单的自定义渲染器。 | - |
| `renderCreateCalendarDialog` | `(props: CreateCalendarDialogProps) => React.ReactNode` | 日历创建对话框的自定义渲染器（用于 `modal` 模式）。 | - |


---

### 自定义侧边栏

如果您的项目已有侧边栏设计，可以使用 `useSidebar.render` 完全自定义它。

该渲染函数接收实时日历状态和与 DayFlow 核心交互的辅助方法。

**`CalendarSidebarRenderProps` 实现了您的自定义侧边栏与 DayFlow 核心之间的通信。**

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

## 深色模式

DayFlow Calendar 原生支持全视图、侧边栏、事件卡片和对话框的深色模式。

<img width="1103" height="729" alt="image" src="https://github.com/user-attachments/assets/03c542d4-4b1b-4b99-9590-08c7be7f85df" />

您可以在 **light**（浅色）、**dark**（深色）或 **auto**（跟随系统）之间切换。

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

## 视图切换模式

`switcherMode` 选项控制头部视图切换器的渲染方式。

DayFlow 提供两种内置模式：

- **`buttons`**: 水平按钮标签（默认，适合桌面端）

<img width="2190" height="406" alt="image" src="https://github.com/user-attachments/assets/a4be37bc-90ac-4872-afa0-589e3d1f7e9b" />

- **`select`**: 下拉菜单（节省空间，适合移动端）

<img width="2186" height="420" alt="image" src="https://github.com/user-attachments/assets/28e321ae-6c56-441a-a9fc-ddcfa504c920" />

---

## 贡献

欢迎贡献！请随意提交 Pull Request。

## Bug 反馈

如果您发现 Bug，请在 [GitHub Issues](https://github.com/dayflow-js/dayflow/issues) 上提交 issue。

## 支持

如有问题和支持需求，请在 GitHub 上打开 issue 或加入 discord。

---