/**
 * ForceLayoutPanelコンポーネント
 * キャンバス右上に表示されるForce Layoutの設定パネル
 */

'use client';

import { Panel } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { ForceParamsSliders } from '@/components/panel/ForceParamsSliders';

/**
 * ForceLayoutPanelコンポーネント
 *
 * @description
 * React Flowのキャンバス右上に配置される、force-directedレイアウトの設定パネルです。
 * Force LayoutのON/OFF切り替えと、パラメータ調整スライダーを提供します。
 * - 半透明カードで視覚的に浮いたデザイン
 * - 小さなトグルスイッチとコンパクトなスライダー
 * - (Experimental)表記で機能の性質を明示
 */
export function ForceLayoutPanel() {
  const forceEnabled = useGraphStore((state) => state.forceEnabled);
  const setForceEnabled = useGraphStore((state) => state.setForceEnabled);

  return (
    <Panel position="top-right" className="m-2">
      <div className="w-64">
        {/* ヘッダー: Force Layoutラベル + トグル */}
        <div className="flex items-center justify-end gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-700">Force Layout</span>
            <span className="text-[10px] text-amber-600">(Experimental)</span>
          </div>

          {/* トグルスイッチ */}
          <button
            type="button"
            role="switch"
            aria-checked={forceEnabled}
            aria-label="Force Layoutの切り替え"
            onClick={() => setForceEnabled(!forceEnabled)}
            className={`
              relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              ${forceEnabled ? 'bg-blue-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                ${forceEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'}
              `}
            />
          </button>
        </div>

        {/* スライダー（forceEnabled時のみ表示） */}
        {forceEnabled && (
          <div className="mt-2">
            <ForceParamsSliders />
          </div>
        )}
      </div>
    </Panel>
  );
}
