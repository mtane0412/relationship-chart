/**
 * DefaultPanelコンポーネント
 * 人物が選択されていない場合に表示されるデフォルトパネル
 */

'use client';

import { Plus } from 'lucide-react';
import { PersonList } from './PersonList';
import { ChartList } from './ChartList';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * デフォルトパネルコンポーネント
 */
export function DefaultPanel() {
  const createChart = useGraphStore((state) => state.createChart);

  /**
   * 新規チャート作成ボタンのクリック処理
   */
  const handleCreateChart = () => {
    void createChart();
  };

  return (
    <div className="p-4 space-y-6">
      {/* チャート管理セクション */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">相関図</h2>
          <button
            type="button"
            onClick={handleCreateChart}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            aria-label="新しい相関図を作成"
          >
            <Plus size={16} />
            新規作成
          </button>
        </div>
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
