# 人物相関図作る君（Relationship Chart）

人物と関係性を視覚的に管理・表示するインタラクティブなWebアプリケーションです。画像のドラッグ&ドロップやペースト操作で人物を登録し、直感的なインターフェースで関係を構築できます。

## 主な機能

- **人物の登録**: 画像のドラッグ&ドロップ/ペーストによる直感的な登録
- **関係の管理**:
  - 人物間の関係をラベル付きで登録（方向性あり/なし）
  - 複数選択（Shift+クリック）による関係の一括登録
  - ノード間のエッジ接続ドラッグによる関係登録
- **自動配置レイアウト**: d3-forceによる物理シミュレーションで読みやすい配置を自動生成
- **データ永続化**: LocalStorageによる状態の自動保存
- **レスポンシブUI**: タブレット・デスクトップに最適化されたインターフェース
- **コンテキスト依存パネル**: 選択状態に応じて適切な操作UIを表示

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **UIライブラリ**: React 19
- **グラフ描画**: React Flow (@xyflow/react)
- **自動配置**: d3-force
- **状態管理**: Zustand (persistミドルウェアでLocalStorage永続化)
- **スタイリング**: Tailwind CSS v4
- **テスト**: Vitest + Testing Library
- **Lint**: ESLint 9 (TypeScript ESLint)

## セットアップ

### 前提条件

- Node.js 18以上
- npm 9以上

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で起動します。

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm start

# Lint実行
npm run lint

# 型チェック
npm run type-check

# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage
```

## ライセンス

ISC
