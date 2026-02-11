/**
 * DefaultPanelコンポーネント
 * 人物が選択されていない場合に表示されるデフォルトパネル
 */

'use client';

import { PersonList } from './PersonList';
import { ChartList } from './ChartList';

/**
 * デフォルトパネルコンポーネント
 */
export function DefaultPanel() {
  return (
    <div className="p-4 space-y-6">
      {/* チャート管理セクション */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">相関図</h2>
        <ChartList />
      </div>

      {/* 人物管理セクション */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          登録済みの人物
        </h2>
        <PersonList />
      </div>
    </div>
  );
}
