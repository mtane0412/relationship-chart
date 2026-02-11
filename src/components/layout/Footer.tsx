/**
 * フッターコンポーネント
 *
 * データの保存場所に関する案内メッセージと、
 * プライバシーポリシー・免責事項へのリンクを表示します。
 * サイドパネル最下部に固定表示されます。
 */

'use client';

import LegalLinks from './LegalLinks';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 p-3 text-xs text-gray-500">
      {/* データ保存に関する案内メッセージ */}
      <p className="mb-2">データはお使いのブラウザにのみ保存されます</p>

      {/* 法的ドキュメントへのリンク */}
      <nav className="flex items-center gap-2">
        <LegalLinks />
      </nav>
    </footer>
  );
}
