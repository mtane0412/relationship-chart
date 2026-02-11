/**
 * ルートレイアウトコンポーネント
 * アプリケーション全体の共通レイアウトとメタデータを定義
 */

import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: '人物相関図作る君',
  description: '画像をD&Dして人物間の関係を視覚化するWebアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
