# DayFlow

[English](README.md) | **中文** | [日本語](README.ja.md)

一个灵活且功能丰富的 React 日历组件库，内置拖拽、多个视图类型以及插件化架构。

[![npm](https://img.shields.io/npm/v/@dayflow/core?logo=npm&color=blue&label=version)](https://www.npmjs.com/package/@dayflow/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?logo=github)](https://github.com/dayflow-js/dayflow/pulls)
[![License](https://img.shields.io/github/license/dayflow-js/dayflow)](https://github.com/dayflow-js/dayflow/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/jc37N4xw)

## 🗓️ 功能亮点

### ✨ 月/周/日等多种视图

| 月视图                                  | 周视图                                 |
| --------------------------------------- | -------------------------------------- |
| ![image](./assets/images//MonthView.png) | ![image](./assets/images/WeekView.png) |

| 日视图                                 | 事件堆叠层级                            |
| -------------------------------------- | -------------------------------------- |
| ![image](./assets/images/DayView.png) | ![image](./assets/images/stackLevel.png) |

### 🤩 默认详情面板（也可替换为多个自定义方案）

| 弹出层详情                           | 对话框详情                           |
| ------------------------------------ | ------------------------------------ |
| ![image](./assets/images/popup.png)  | ![image](./assets/images/dialog.png) |

### 🎯 事件拖拽/缩放顺滑

https://github.com/user-attachments/assets/726a5232-35a8-4fe3-8e7b-4de07c455353

https://github.com/user-attachments/assets/957317e5-02d8-4419-a74b-62b7d191e347

> ⚡ 想要更多交互体验，请访问我们的 [在线 Demo](https://dayflow-js.github.io/dayflow/)。

## ✨ 核心特性

- 🗓️ **多视图**：日/周/月/年视图自由切换
- 🎨 **高度自定义**：基于 Tailwind CSS，易于主题扩展
- 📱 **响应式设计**：桌面、平板、移动端一致体验
- 🔌 **插件架构**：通过插件拓展业务能力
- 🎯 **拖拽支持**：事件拖拽与缩放体验流畅
- ⚡ **TypeScript**：提供完整类型提示
- 🎨 **事件管理**：创建、更新、删除、分类事件
- 🔄 **虚拟滚动**：大数据场景依旧流畅
- 🎭 **自定义渲染**：自定义事件外观与行为

## 🚀 进阶能力

### 📅 高级日历能力

- **跨天事件**：自然衔接的多日事件渲染
- **全天区域**：专属全天事件栏
- **事件堆叠**：智能调度堆叠层级
- **侧边栏**：自带日历管理侧栏

### 🎨 自定义与主题

- **自定义事件渲染器**：完全掌控 UI
- **颜色编码**：内置多类型日历与颜色
- **详情面板模式**：对话框、弹层或自定义面板
- **可定制头部**：`ViewHeader` 提供按钮/标签/下拉等模式
- **拖拽指示器**：为不同事件展示不同拖拽提示

### 🎯 交互体验

- **事件回调**：`onEventCreate`、`onEventUpdate`、`onEventDelete`
- **点击事件**：随时获取事件点击反馈
- **拖拽缩放**：移动与调整长度一气呵成
- **颜色选择器**：内置颜色选择 UI

### ⚡ 性能与 DX

- **虚拟滚动**：月份/年视图的大量事件仍高性能
- **TypeScript First**：所有 API 提供类型定义
- **插件体系**：事件插件与拖拽插件可扩展
- **Temporal API**：使用 Modern Temporal 处理时间

## 📦 安装

```bash
npm install @dayflow/core lucide-react
# 或
yarn add @dayflow/core lucide-react
# 或
pnpm add @dayflow/core lucide-react
```

### Peer Dependencies

- `react` >= 18.0.0
- `react-dom` >= 18.0.0
- `lucide-react` >= 0.400.0

## 🚀 快速上手

```tsx
import { useCalendarApp, DayFlowCalendar } from '@dayflow/core';
import { createMonthView, createWeekView, createDayView } from '@dayflow/core';
import '@dayflow/core/dist/styles.css';

function App() {
  const calendar = useCalendarApp({
    views: [createMonthView(), createWeekView(), createDayView()],
    initialDate: new Date(),
  });

  return <DayFlowCalendar calendar={calendar} />;
}
```

> 📖 **[查看完整文档 →](https://dayflow-js.github.io/dayflow/)**

## 🎯 适用场景

DayFlow 适合用于：

- 📅 **排班与预约**：员工排班、预约管理、课程表
- 🎫 **活动管理**：会议日程、活动日历、展会安排
- 🏢 **项目排期**：任务规划、时间线视图
- 💼 **企业应用**：会议室、资源预约、可用性管理

## 🌟 亮点总结

- ✅ **TypeScript 支持**
- ✅ **拖拽缩放**
- ✅ **虚拟滚动**
- ✅ **插件体系**
- ✅ **React 18+ Hooks 架构**
- ✅ **Tailwind CSS 友好**

## 🤝 贡献指南

欢迎通过 Pull Request 的方式贡献代码与文档。

## 🐛 问题反馈

若发现问题，请前往 [GitHub Issues](https://github.com/dayflow-js/dayflow/issues)。

## 📮 支持

如需交流，请在 GitHub 提 issue 或加入 Discord。

---

由 Jayce Li 倾情打造 ❤️
