# @dayflow/plugin-drag

Drag-and-drop plugin for DayFlow calendar. Enables moving, resizing, and creating events via mouse or touch interactions.

[![npm](https://img.shields.io/npm/v/@dayflow/plugin-drag?logo=npm&color=blue&label=version)](https://www.npmjs.com/package/@dayflow/plugin-drag)
[![License](https://img.shields.io/github/license/dayflow-js/dayflow)](https://github.com/dayflow-js/dayflow/blob/main/LICENSE)

## Installation

```bash
npm install @dayflow/plugin-drag
# or
pnpm add @dayflow/plugin-drag
# or
yarn add @dayflow/plugin-drag
```

## Usage

```typescript
import { createDragPlugin } from '@dayflow/plugin-drag';

const dragPlugin = createDragPlugin({
  enableDrag: true,
  enableResize: true,
  enableCreate: true,
  enableAllDayCreate: true,
  onEventDrop: (updatedEvent, originalEvent) => {
    console.log('Event dropped:', updatedEvent);
  },
  onEventResize: (updatedEvent, originalEvent) => {
    console.log('Event resized:', updatedEvent);
  },
});

// Pass to your DayFlow instance
```

## Configuration

| Parameter            | Type         | Default     | Description                                           |
| -------------------- | ------------ | ----------- | ----------------------------------------------------- |
| `enableDrag`         | `boolean`    | `true`      | Enable/disable event dragging (moving).               |
| `enableResize`       | `boolean`    | `true`      | Enable/disable event resizing.                        |
| `enableCreate`       | `boolean`    | `true`      | Enable/disable creating events via drag.              |
| `enableAllDayCreate` | `boolean`    | `true`      | Enable/disable creating all-day events via drag.      |
| `supportedViews`     | `ViewType[]` | All views   | Views that support drag operations.                   |
| `onEventDrop`        | `Function`   | `undefined` | Callback fired when an event is dropped after moving. |
| `onEventResize`      | `Function`   | `undefined` | Callback fired when an event is finished resizing.    |

## Features

- **Event Moving**: Drag events to different times or days.
- **Event Resizing**: Resize events from top or bottom (or left/right in month view).
- **Quick Create**: Drag on empty grid space to create a new event.
- **Multi-Day Support**: Drag and resize across day boundaries.
- **Touch Support**: Fully compatible with touch devices.

## License

MIT
