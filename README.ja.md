# DayFlow

[English](README.md) | [中文](README.zh.md) | **日本語**

DayFlow は、ドラッグ&ドロップ・複数ビュー・プラグインアーキテクチャを備えた柔軟で高機能な React 向けカレンダーコンポーネントライブラリです。

[![npm](https://img.shields.io/npm/v/@dayflow/core?logo=npm&color=blue&label=version)](https://www.npmjs.com/package/@dayflow/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?logo=github)](https://github.com/dayflow-js/dayflow/pulls)
[![License](https://img.shields.io/github/license/dayflow-js/dayflow)](https://github.com/dayflow-js/dayflow/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/jc37N4xw)

## 🗓️ 主な特長

### ✨ 月/週/日など多彩なビュー

| 月ビュー                               | 週ビュー                               |
| -------------------------------------- | -------------------------------------- |
| ![image](./assets/images//MonthView.png) | ![image](./assets/images/WeekView.png) |

| 日ビュー                               | イベントスタック                       |
| -------------------------------------- | -------------------------------------- |
| ![image](./assets/images/DayView.png)  | ![image](./assets/images/stackLevel.png) |

### 🤩 デフォルトの詳細パネル（複数のカスタム構成を用意）

| ポップアップ詳細                      | ダイアログ詳細                        |
| ------------------------------------- | ------------------------------------- |
| ![image](./assets/images/popup.png)   | ![image](./assets/images/dialog.png)  |

### 🎯 スムーズなドラッグ&リサイズ

https://github.com/user-attachments/assets/726a5232-35a8-4fe3-8e7b-4de07c455353

https://github.com/user-attachments/assets/957317e5-02d8-4419-a74b-62b7d191e347

> ⚡ さらに多くの機能を体験したい場合は [ライブデモ](https://dayflow-js.github.io/dayflow/) をご覧ください。

## ✨ コア機能

- 🗓️ **複数ビュー**：日/週/月/年ビューをサポート
- 🎨 **高いカスタマイズ性**：Tailwind CSS によるテーマ拡張
- 📱 **レスポンシブ対応**：デスクトップ/タブレット/モバイルに最適化
- 🔌 **プラグインアーキテクチャ**：拡張しやすい設計
- 🎯 **ドラッグ&ドロップ**：直感的なイベント操作
- ⚡ **TypeScript サポート**：完全な型定義
- 🎨 **イベント管理**：作成/更新/削除/分類を簡単に
- 🔄 **バーチャルスクロール**：大量データでも軽快
- 🎭 **カスタムレンダラー**：イベント表示と挙動を自由に拡張

## 🚀 追加機能

### 📅 高度なカレンダー機能

- **マルチデイイベント**：複数日にまたがるイベント表示
- **終日イベント**：専用ヘッダー領域を用意
- **イベントスタック**：重複イベントをスマートに配置
- **サイドバー**：カレンダー管理用サイドバーを内蔵

### 🎨 カスタマイズ & テーマ

- **カスタムイベントレンダラー**：UI を完全にコントロール
- **カラーコーディング**：複数カレンダーと色分けに対応
- **詳細パネル**：ダイアログ/ポップアップ/カスタムパネル
- **ヘッダーのカスタマイズ**：`ViewHeader` で表示切替を制御
- **ドラッグインジケーター**：イベントタイプごとにカスタム指標

### 🎯 インタラクション

- **イベントコールバック**：`onEventCreate` / `onEventUpdate` / `onEventDelete`
- **クリックイベント**：イベントクリックにリアクション
- **ドラッグ&リサイズ**：移動と長さ調整をスムーズに
- **カラーピッカー**：組み込みの色選択 UI

### ⚡ パフォーマンス & DX

- **バーチャルスクロール**：月/年ビューの大量イベントでも高速
- **TypeScript First**：すべての API に型定義
- **プラグインシステム**：イベント/ドラッグプラグインで拡張
- **Temporal API**：モダンな Temporal で日時を管理

## 📦 インストール

```bash
npm install @dayflow/core lucide-react
# または
yarn add @dayflow/core lucide-react
# または
pnpm add @dayflow/core lucide-react
```

### Peer Dependencies

- `react` >= 18.0.0
- `react-dom` >= 18.0.0
- `lucide-react` >= 0.400.0

## 🚀 クイックスタート

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

> 📖 **[完全なドキュメントを見る →](https://dayflow-js.github.io/dayflow/)**

## 🎯 ユースケース

DayFlow は以下の用途に最適です：

- 📅 **スケジューリングアプリ**：スタッフシフト、予約管理、授業予定
- 🎫 **イベント管理**：会議、イベントカレンダー、フェスティバル
- 🏢 **プロジェクト管理**：タイムライン表示、タスクスケジューリング
- 💼 **ビジネス**：会議室やリソースの予約、可用性管理

## 🌟 ハイライト

- ✅ **TypeScript 対応**
- ✅ **ドラッグ&ドロップ**
- ✅ **バーチャルスクロール**
- ✅ **プラグインシステム**
- ✅ **最新の React Hooks (18+)**
- ✅ **Tailwind CSS による簡単スタイリング**

## 🤝 コントリビューション

Pull Request 大歓迎です。ぜひ貢献してください。

## 🐛 バグ報告

問題を見つけた場合は [GitHub Issues](https://github.com/dayflow-js/dayflow/issues) へ。

## 📮 サポート

質問があれば GitHub で Issue を立てるか Discord に参加してください。

---

Jayce Li が ❤️ を込めて開発しました。
