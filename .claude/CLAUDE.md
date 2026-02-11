# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## プロジェクト概要

人物相関図を作成・可視化するNext.jsアプリケーションです。

詳細はREADME.mdを参照してください。主要な技術スタックはNext.js 16、React 19、React Flow、d3-force、Zustand、Tailwind CSS v4です。

### アイコンライブラリ

- **lucide-react** - 汎用アイコン（ArrowRight, ArrowLeftRight, Minusなど）※dual-directedな矢印は `ArrowLeftRight` を使用
- **カスタムアイコン** - `src/components/icons/` - lucide-reactにないアイコン（BidirectionalArrow）
- **重要**: モーダルとパネル間でアイコンを統一すること

---

## コマンド

### 品質チェック

```bash
# Lint実行（警告も含めてすべて解消すること）
npm run lint

# 型チェック
npm run type-check

# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage
```

**⚠️ コミット前の必須チェック**:

```bash
npm run lint && npm run type-check && npm test
```

---

## アーキテクチャ

### 状態管理の中心: Zustand Store

すべてのデータは`src/stores/useGraphStore.ts`で一元管理されています：

- **人物（Person）**: 名前、画像、ID、作成日時を保持
- **関係（Relationship）**: 人物間の関係（ラベル、方向性）を保持
- **UI状態**: force-directedレイアウトの有効/無効、選択中の人物IDリスト（複数選択対応）
- **永続化**: Zustandのpersistミドルウェアで自動的にLocalStorage（キー: `relationship-chart-storage`）に保存
- **バージョン管理**: v0（`selectedPersonId: string | null`）からv1（`selectedPersonIds: string[]`）へのマイグレーションを自動実行

### コンポーネント構成

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ホームページ（ReactFlowProviderでラップ）
├── components/
│   ├── graph/             # グラフ描画コンポーネント
│   │   ├── RelationshipGraph.tsx             # メインコンテナ
│   │   ├── PersonNode.tsx                    # 人物ノード（カスタムノード）
│   │   ├── RelationshipEdge.tsx              # 関係エッジ（カスタムエッジ）
│   │   ├── useForceLayout.ts                 # d3-forceフック
│   │   ├── useGraphDataSync.ts               # グラフデータ同期フック
│   │   ├── useGraphInteractions.ts           # インタラクション処理フック
│   │   ├── useGraphContextMenuActions.ts     # コンテキストメニュー構築フック
│   │   ├── PersonRegistrationModal.tsx       # 人物登録モーダル
│   │   └── RelationshipRegistrationModal.tsx # 関係登録モーダル（エッジ接続時）
│   ├── panel/             # サイドパネルコンポーネント
│   │   ├── SidePanel.tsx                # パネル全体のコンテナ
│   │   ├── DefaultPanel.tsx             # 未選択時パネル
│   │   ├── SingleSelectionPanel.tsx     # 1人選択時パネル
│   │   ├── PairSelectionPanel.tsx       # 2人選択時パネル
│   │   ├── MultipleSelectionInfo.tsx    # 3人以上選択時の案内
│   │   ├── PersonEditForm.tsx           # 人物編集フォーム
│   │   ├── PersonList.tsx               # 人物一覧
│   │   └── RelationshipForm.tsx         # 関係追加フォーム（未使用）
│   ├── dnd/               # D&Dコンポーネント
│   │   └── ImageDropZone.tsx        # 画像ドロップゾーン
│   └── ui/                # 汎用UIコンポーネント
├── stores/
│   └── useGraphStore.ts   # グローバルストア（⚠️ 状態管理の中心）
├── types/
│   ├── person.ts          # Personの型定義
│   ├── relationship.ts    # Relationshipの型定義
│   └── graph.ts           # React Flow用の型定義
└── lib/
    ├── graph-utils.ts        # Person/Relationship → Node/Edge変換
    ├── image-utils.ts        # 画像リサイズ処理（200x200px WebP）
    └── node-intersection.ts  # ノード境界との交点計算
```

### データフロー

1. **入力**: ユーザーがサイドパネルまたはキャンバスD&D/ペーストで人物・関係を追加
2. **ストア更新**: `useGraphStore`のアクションで状態を更新（自動でLocalStorageに保存）
3. **変換**: `graph-utils.ts`が`Person[]`と`Relationship[]`を`Node[]`と`Edge[]`に変換
4. **描画**: React Flowが受け取ったノードとエッジをキャンバスに描画
5. **Force Layout**: `useForceLayout`がd3-forceで物理シミュレーションを実行し、ノード位置を更新（デフォルト: オフ）

---

## 重要な設計原則

### 1. 画像処理

新規に保存される画像は**200x200px**にリサイズされ、**WebP形式のData URL**としてストアに保存されます（`src/lib/image-utils.ts`）。既存データにはJPEGのData URLが残っている場合もあり、それらも表示対象として扱います。これによりLocalStorageの容量制限に対応しています。

### 2. IDの生成

人物と関係のIDは`nanoid`で生成されます。一意性が保証されているため、衝突を心配せずに使用できます。

### 3. force-directedレイアウト

`useForceLayout`は以下の3つの力を使ってノードを配置します：

- **forceLink**: 関係（エッジ）に基づく引力
- **forceManyBody**: ノード間の反発力
- **forceCenter**: 中心への引力

ドラッグ中はノードを固定（`fx`, `fy`）し、ドラッグ終了後は固定を解除して自然な動きを実現しています。

### 4. 型安全性

すべての型は`src/types/`で定義されています。特に`graph.ts`はReact Flowの`Node`と`Edge`に型パラメータを適用してカスタムデータ型を定義しています。

### 5. ノード境界との交点計算

エッジの端点はノードの中心ではなく、境界との交点に配置されます（`src/lib/node-intersection.ts`）。これにより、画像がエッジに覆われず、視覚的に整理された表示を実現しています。

### 6. コンテキスト依存UI

サイドパネルは選択状態に応じて動的に切り替わります：
- **未選択時**: 人物一覧を表示
- **1人選択時**: 人物編集フォームを表示
- **2人選択時**: 関係登録フォームを表示
- **3人以上選択時**: 案内メッセージを表示

### 7. 選択状態の一方向同期

Zustandストア（`selectedPersonIds`）からReact Flowの選択状態への一方向同期を実装しています。ユーザーのノードクリック操作は`onNodeClick`で直接Zustandストアを更新します。この設計により、`onSelectionChange`との循環参照による無限ループを回避しています。

### 8. UI一貫性

モーダル、パネル、フォームなど、同じ機能を持つUI要素は同じアイコンとスタイルを使用すること：
- 関係タイプ選択アイコン（片方向、双方向、片方向×2、無方向）
- カスタムアイコンコンポーネントは `src/components/icons/` に配置

---

## テスト

### テスト構成

- **設定ファイル**: `vitest.config.ts`
- **セットアップ**: `src/test/setup.ts`（Testing Library拡張マッチャー）
- **環境**: jsdom（ブラウザAPIをエミュレート）

### テスト対象

- `src/stores/useGraphStore.test.ts`: Zustandストアのアクション検証
- `src/lib/graph-utils.test.ts`: データ変換ロジックの検証
- `src/lib/image-utils.test.ts`: 画像処理のエラーハンドリング検証
- `src/lib/node-intersection.test.ts`: ノード境界との交点計算の検証
- `src/components/graph/RelationshipRegistrationModal.test.tsx`: 関係登録モーダルのUI検証

### 注意点

Canvas APIが必要な画像リサイズテストは`it.skip`でスキップされています。実際の画像処理は手動テストまたは統合テストで確認してください。

---

## React Flow統合の注意点

### 選択状態の管理

- **無限ループの罠**: `onSelectionChange`とZustandストアの双方向同期は無限ループを引き起こす
- **推奨パターン**: 選択状態の同期は一方向（Zustand → React Flow）のみにする
- **ユーザー操作**: `onNodeClick`で直接Zustandストアを更新する
- **フォーム初期値**: 原則として`useState`の初期化関数で設定し、依存ループを避ける
  - **注意**: `useState`初期化は初回マウント時のみ実行される
  - ソースデータ変更にフォームを追従させる必要がある場合は、依存配列付きかつガード付きの`useEffect`でソース→フォーム状態を同期する
- **コンポーネントリセット**: フォーム初期値を`useState`初期化にのみ依存する場合は、選択ペアが変わるたびに`key`プロップで必ずremountすること
- **デバッグ手法**: 問題箇所を一時的に無効化（早期return）して原因を特定

---

## Lint・型チェック

### ESLint設定（`eslint.config.mjs`）

- `@typescript-eslint/no-explicit-any`: エラー（`any`型の使用禁止）
- `@typescript-eslint/no-unused-vars`: エラー（`_`プレフィックスは許可）

### 除外パターン

- `node_modules/`
- `.next/`
- `out/`
- `dist/`
- `build/`

---

## UI仕様

### レスポンシブ対応

- **タブレット以上（md以上）**: サイドパネル（幅320px）+ グラフキャンバス
- **モバイル（md未満）**: グラフキャンバスのみ + 案内メッセージ

Tailwind CSS v4のレスポンシブクラス（`md:`プレフィックス）を使用しています。

### 画像D&D/ペースト

- **D&D**: `RelationshipGraph`コンポーネント全体がドロップゾーン
- **ペースト**: `window`レベルで`paste`イベントをリッスン
- **処理フロー**: 画像取得 → `readFileAsDataUrl`でData URL変換 → `cropImage`でクロップ＆リサイズ → モーダル表示 → 名前入力 → ストアに追加

### 複数選択とコンテキスト依存パネル

- **単一選択**: クリックで1人を選択、サイドパネルに編集フォームを表示
- **複数選択**: Shift+クリックで複数人を選択、2人選択時は関係登録フォームを表示
- **選択解除**: 背景クリックまたはEscキーで選択解除

### エッジ接続による関係登録

- ノードのエッジハンドルをドラッグして別のノードに接続すると、関係登録モーダルが表示されます
- モーダルでラベルと方向性を入力後、関係が登録されます
- エッジは`node-intersection.ts`で計算された境界上の交点から描画されます

---

## 開発ワークフロー

### ブランチ戦略

- **mainブランチへの直接コミット禁止**
- featureブランチで作業し、PRでマージ

### コミットメッセージ規約

過去のコミットログから判断すると、以下のフォーマットを推奨します：

```
feat: <変更内容の簡潔な説明>
fix: <バグ修正の説明>
docs: <ドキュメント更新の説明>
refactor: <リファクタリングの説明>
test: <テスト追加・修正の説明>
```

例:
- `feat: キャンバスD&D/ペーストによる人物登録とノードクリック編集機能を追加`
- `fix: Tailwind CSS v4へ移行してレスポンシブクラスを修正`

---

## トラブルシューティング

### LocalStorageのデータをクリアする

開発中にデータが壊れた場合は、ブラウザの開発者ツールで以下を実行：

```javascript
localStorage.removeItem('relationship-chart-storage');
```

### Force Layoutが動かない

`useGraphStore`の`forceEnabled`が`false`になっている可能性があります。初期値は`false`（デフォルト: オフ）です。キャンバス右上のトグルスイッチで有効化できます。

### 型エラーが発生する

`tsconfig.json`で`paths`エイリアス（`@/*`）を設定しています。IDEが認識しない場合は、TypeScript Language Serverを再起動してください。

---

