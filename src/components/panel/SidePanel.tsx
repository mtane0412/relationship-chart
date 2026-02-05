/**
 * SidePanelコンポーネント
 * 人物登録フォームと人物一覧を表示するサイドパネル
 */

'use client';

import { PersonForm } from './PersonForm';
import { PersonList } from './PersonList';
import { RelationshipForm } from './RelationshipForm';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * サイドパネルコンポーネント
 */
export function SidePanel() {
  const forceEnabled = useGraphStore((state) => state.forceEnabled);
  const setForceEnabled = useGraphStore((state) => state.setForceEnabled);

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">人物相関図</h1>

        {/* Force-directedレイアウトトグル */}
        <div className="mt-3 flex items-center justify-between">
          <label
            htmlFor="forceToggle"
            className="text-sm font-medium text-gray-700"
          >
            自動配置
          </label>
          <button
            id="forceToggle"
            type="button"
            role="switch"
            aria-checked={forceEnabled}
            onClick={() => setForceEnabled(!forceEnabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${forceEnabled ? 'bg-blue-600' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${forceEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
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
