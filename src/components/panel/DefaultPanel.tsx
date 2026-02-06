/**
 * DefaultPanelコンポーネント
 * 人物が選択されていない場合に表示されるデフォルトパネル
 */

'use client';

import { PersonList } from './PersonList';

/**
 * デフォルトパネルコンポーネント
 */
export function DefaultPanel() {
  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        登録済みの人物
      </h2>
      <PersonList />
    </div>
  );
}
