/**
 * 免責事項ページ
 *
 * 利用上の注意、第三者の権利、データ消失リスク、
 * サービス変更・終了、免責に関する事項を記載します。
 */

import Link from 'next/link';

/**
 * 免責事項ページコンポーネント
 *
 * 自己責任での利用、肖像権・著作権への配慮、
 * データ消失リスク、サービス変更・終了、免責を明記します。
 */
export default function TermsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">免責事項</h1>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-8 space-y-6">
          {/* 利用上の注意 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. 利用上の注意
            </h2>
            <p className="text-gray-700 leading-relaxed">
              このアプリケーションは、ユーザーの自己責任において利用されるものとします。私たちは、本アプリケーションの利用により生じたいかなる損害についても責任を負いません。
            </p>
          </section>

          {/* 第三者の権利 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. 第三者の権利
            </h2>
            <p className="text-gray-700 leading-relaxed">
              ユーザーは、本アプリケーションに登録する情報（人物の名前、画像を含む）が第三者の肖像権、著作権、その他の権利を侵害しないよう、自己の責任において配慮する必要があります。第三者の権利を侵害したことにより生じた損害について、私たちは一切の責任を負いません。
            </p>
          </section>

          {/* データ消失のリスク */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. データ消失のリスク
            </h2>
            <p className="text-gray-700 leading-relaxed">
              すべてのデータはブラウザのLocalStorageに保存されているため、ブラウザの設定変更、データクリア、ブラウザの再インストール、デバイスの故障などにより、データが消失する可能性があります。私たちは、データの消失により生じた損害について一切の責任を負いません。重要なデータは、定期的にバックアップを取ることを推奨します。
            </p>
          </section>

          {/* サービスの変更・終了 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. サービスの変更・終了
            </h2>
            <p className="text-gray-700 leading-relaxed">
              私たちは、予告なく本アプリケーションの内容を変更、または提供を終了する場合があります。これにより生じた損害について、私たちは一切の責任を負いません。
            </p>
          </section>

          {/* 免責 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. 免責
            </h2>
            <p className="text-gray-700 leading-relaxed">
              私たちは、本アプリケーションの利用により生じた直接的または間接的な損害（データの消失、ビジネス機会の損失、利益の喪失を含むがこれに限らない）について、いかなる場合においても責任を負いません。
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
