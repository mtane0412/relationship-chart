/**
 * DefaultPanelコンポーネント
 * 人物が選択されていない場合に表示されるデフォルトパネル
 */

'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PersonList } from './PersonList';
import { ActiveChartHeader } from './ActiveChartHeader';
import { ExtractionModal } from './ExtractionModal';

/**
 * デフォルトパネルコンポーネント
 */
export function DefaultPanel() {
  const [showExtractionModal, setShowExtractionModal] = useState(false);

  return (
    <div className="p-4 space-y-6">
      {/* チャート管理セクション */}
      <div>
        <ActiveChartHeader />
      </div>

      {/* AI 抽出セクション */}
      <div>
        <button
          type="button"
          onClick={() => setShowExtractionModal(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <Sparkles size={16} />
          AI でテキストから関係を抽出
        </button>
      </div>

      {/* 人物管理セクション */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          登録済みの人物
        </h2>
        <PersonList />
      </div>

      {/* AI 抽出モーダル */}
      <ExtractionModal
        isOpen={showExtractionModal}
        onClose={() => setShowExtractionModal(false)}
      />
    </div>
  );
}
