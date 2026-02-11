/**
 * 法的ドキュメントへのリンクコンポーネント
 *
 * プライバシーポリシーと免責事項へのリンクを表示します。
 * Footer と モバイルフッターで共通利用されます。
 */

import Link from 'next/link';

/**
 * 法的ドキュメントへのリンクコンポーネント
 *
 * プライバシーポリシーと免責事項へのリンクを表示します。
 */
export default function LegalLinks() {
  return (
    <>
      <Link
        href="/privacy"
        className="hover:text-gray-700 hover:underline transition-colors"
      >
        プライバシーポリシー
      </Link>
      <span className="text-gray-300">|</span>
      <Link
        href="/terms"
        className="hover:text-gray-700 hover:underline transition-colors"
      >
        免責事項
      </Link>
    </>
  );
}
