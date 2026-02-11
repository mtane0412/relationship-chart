/**
 * エラーページ
 * ランタイムエラー発生時に表示されるカスタムエラーページ
 */

'use client';

import Link from 'next/link';

/**
 * ErrorPageのProps
 */
type ErrorPageProps = {
  /** エラーオブジェクト */
  error: Error & { digest?: string };
  /** エラーからのリカバリーを試みる関数 */
  reset: () => void;
};

/**
 * エラーページコンポーネント
 * ランタイムエラーが発生した際に表示される
 */
export default function ErrorPage({ error: _error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          エラーが発生しました
        </h1>
        <p className="text-gray-600 mb-8">
          申し訳ございません。予期しないエラーが発生しました。
        </p>
        <div className="flex flex-col gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
