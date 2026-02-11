/**
 * プライバシーポリシーページ
 *
 * データの保存場所、画像の取り扱い、X共有機能、
 * アナリティクス、データ削除に関するポリシーを記載します。
 */

import Link from 'next/link';

/**
 * プライバシーポリシーページコンポーネント
 *
 * LocalStorageへのデータ保存、画像のクライアント側処理、
 * トラッキングツール不使用などのポリシーを明記します。
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          プライバシーポリシー
        </h1>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-8 space-y-6">
          {/* データの保存 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. データの保存
            </h2>
            <p className="text-gray-700 leading-relaxed">
              このアプリケーションで作成されたすべてのデータ（人物情報、関係情報、画像を含む）は、お使いのブラウザのLocalStorageにのみ保存されます。私たちのサーバーや外部サーバーへのデータ送信は一切行われません。データは完全にお使いのデバイス内で管理されます。
            </p>
          </section>

          {/* 画像の取り扱い */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. 画像の取り扱い
            </h2>
            <p className="text-gray-700 leading-relaxed">
              アップロードされた画像は、クライアント側（お使いのブラウザ内）で自動的に200×200ピクセルにリサイズされ、WebP形式に変換されます。変換後の画像はData
              URLとしてLocalStorageに保存されます。画像データが外部に送信されることは一切ありません。
            </p>
          </section>

          {/* X共有機能 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. X（旧Twitter）共有機能
            </h2>
            <p className="text-gray-700 leading-relaxed">
              X共有ボタンをクリックすると、`window.open`によってX（旧Twitter）の投稿画面が新しいウィンドウで開かれます。この機能は、お使いのブラウザがX投稿画面を表示するのみであり、私たちのアプリケーションが自動的にデータを送信することはありません。
            </p>
          </section>

          {/* アナリティクス */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. アナリティクスとトラッキング
            </h2>
            <p className="text-gray-700 leading-relaxed">
              このアプリケーションは、Google
              Analyticsをはじめとするトラッキングツールを一切使用していません。私たちは、あなたの利用状況やアクセスログを収集・分析することはありません。
            </p>
          </section>

          {/* データの削除 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. データの削除
            </h2>
            <p className="text-gray-700 leading-relaxed">
              すべてのデータはお使いのブラウザのLocalStorageに保存されているため、ブラウザの設定からLocalStorageをクリアすることで、完全に削除することができます。データはサーバーに保存されていないため、ブラウザからデータを削除すれば、復元することはできません。
            </p>
          </section>

          {/* ポリシーの変更 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. プライバシーポリシーの変更
            </h2>
            <p className="text-gray-700 leading-relaxed">
              このプライバシーポリシーは、予告なく変更される場合があります。変更後のポリシーは、このページに掲載された時点で効力を生じます。
            </p>
          </section>
        </div>

        {/* ホームに戻るリンク */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
