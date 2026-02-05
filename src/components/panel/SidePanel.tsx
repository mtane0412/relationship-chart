/**
 * SidePanelコンポーネント
 * 人物登録フォームと人物一覧を表示するサイドパネル
 */

'use client';

import { PersonForm } from './PersonForm';
import { PersonList } from './PersonList';
import { RelationshipForm } from './RelationshipForm';

/**
 * サイドパネルコンポーネント
 */
export function SidePanel() {
  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">人物相関図</h1>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto">
        {/* 人物登録フォーム */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            人物を追加
          </h2>
          <PersonForm />
        </div>

        {/* 関係登録フォーム */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            関係を追加
          </h2>
          <RelationshipForm />
        </div>

        {/* 人物一覧 */}
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            登録済みの人物
          </h2>
          <PersonList />
        </div>
      </div>
    </div>
  );
}
