# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## プロジェクト概要

人物相関図を作成・可視化するNext.jsアプリケーションです。React Flowによるグラフ表示、d3-forceによる自動配置、Zustandによる状態管理を組み合わせています。

### 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **UIライブラリ**: React 19
- **グラフ描画**: React Flow (@xyflow/react)
- **自動配置**: d3-force
- **状態管理**: Zustand (persistミドルウェアでLocalStorage永続化)
- **スタイリング**: Tailwind CSS v4
- **テスト**: Vitest + Testing Library
- **Lint**: ESLint 9 (TypeScript ESLint)

---

## コマンド

### 開発

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm start
```

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
- **UI状態**: force-directedレイアウトの有効/無効、選択中の人物ID
- **永続化**: Zustandのpersistミドルウェアで自動的にLocalStorage（キー: `relationship-chart-storage`）に保存

### コンポーネント構成

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ホームページ（ReactFlowProviderでラップ）
├── components/
│   ├── graph/             # グラフ描画コンポーネント
│   │   ├── RelationshipGraph.tsx    # メインコンテナ（D&D/ペースト処理含む）
│   │   ├── PersonNode.tsx           # 人物ノード（カスタムノード）
│   │   ├── RelationshipEdge.tsx     # 関係エッジ（カスタムエッジ）
│   │   ├── useForceLayout.ts        # d3-forceフック
│   │   └── PersonRegistrationModal.tsx  # 人物登録モーダル
│   ├── panel/             # サイドパネルコンポーネント
│   │   ├── SidePanel.tsx           # パネル全体のコンテナ
│   │   ├── PersonForm.tsx          # 人物追加フォーム
│   │   ├── PersonEditForm.tsx      # 人物編集フォーム
│   │   ├── PersonList.tsx          # 人物一覧
│   │   └── RelationshipForm.tsx    # 関係追加フォーム
│   ├── dnd/               # D&Dコンポーネント
│   └── ui/                # 汎用UIコンポーネント
├── stores/
│   └── useGraphStore.ts   # グローバルストア（⚠️ 状態管理の中心）
├── types/
│   ├── person.ts          # Personの型定義
│   ├── relationship.ts    # Relationshipの型定義
│   └── graph.ts           # React Flow用の型定義
└── lib/
    ├── graph-utils.ts     # Person/Relationship → Node/Edge変換
    └── image-utils.ts     # 画像リサイズ処理（200x200px JPEG）
```

### データフロー

1. **入力**: ユーザーがサイドパネルまたはキャンバスD&D/ペーストで人物・関係を追加
2. **ストア更新**: `useGraphStore`のアクションで状態を更新（自動でLocalStorageに保存）
3. **変換**: `graph-utils.ts`が`Person[]`と`Relationship[]`を`Node[]`と`Edge[]`に変換
4. **描画**: React Flowが受け取ったノードとエッジをキャンバスに描画
5. **自動配置**: `useForceLayout`がd3-forceで物理シミュレーションを実行し、ノード位置を更新

---

## 重要な設計原則

### 1. 画像処理

画像はすべて**200x200px**にリサイズされ、**JPEG形式のData URL**としてストアに保存されます（`src/lib/image-utils.ts`）。これによりLocalStorageの容量制限に対応しています。

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

### 注意点

Canvas APIが必要な画像リサイズテストは`it.skip`でスキップされています。実際の画像処理は手動テストまたは統合テストで確認してください。

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
- **処理フロー**: 画像取得 → `processImage`でリサイズ → モーダル表示 → 名前入力 → ストアに追加

### ノードクリック編集

ノードクリックで`selectedPersonId`が設定され、サイドパネルの`PersonEditForm`が表示されます。背景クリックで選択解除されます。

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

### force-directedレイアウトが動かない

`useGraphStore`の`forceEnabled`が`false`になっている可能性があります。初期値は`true`ですが、ユーザーが無効化できる設計になっています。

### 型エラーが発生する

`tsconfig.json`で`paths`エイリアス（`@/*`）を設定しています。IDEが認識しない場合は、TypeScript Language Serverを再起動してください。

---

## 参考リンク

- [React Flow Documentation](https://reactflow.dev/)
- [d3-force Documentation](https://github.com/d3/d3-force)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
