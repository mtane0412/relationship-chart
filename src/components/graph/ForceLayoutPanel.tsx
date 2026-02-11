/**
 * ForceLayoutPanelコンポーネント
 * キャンバス右上に表示されるForce Layoutの設定パネル
 */

'use client';

import { Panel } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { ForceParamsSliders } from '@/components/panel/ForceParamsSliders';
import { EgoLayoutParamsSliders } from '@/components/panel/EgoLayoutParamsSliders';
import { useEgoLayout } from './useEgoLayout';

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
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const persons = useGraphStore((state) => state.persons);

  const { applyEgoLayout } = useEgoLayout();

  // 選択中の人物名を取得（1人選択時のみ）
  const selectedPerson =
    selectedPersonIds.length === 1
      ? persons.find((p) => p.id === selectedPersonIds[0])
      : undefined;

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

        {/* 単一ノード選択時のみEGO Layoutセクションを表示 */}
        {selectedPersonIds.length === 1 && selectedPerson && (
          <>
            {/* 区切り線 */}
            <div className="my-4 border-t border-gray-200" />

            {/* EGO Layoutセクション */}
            <div>
              {/* ヘッダー: EGO Layoutラベル + Applyボタン */}
              <div className="flex items-center justify-end gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-700">EGO Layout</span>
                  <span className="text-[10px] text-amber-600">(Experimental)</span>
                </div>

                {/* Applyボタン */}
                <button
                  type="button"
                  onClick={() => applyEgoLayout(selectedPerson.id)}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                >
                  Apply
                </button>
              </div>

              {/* パラメータスライダー */}
              <div className="mt-2">
                <EgoLayoutParamsSliders />
              </div>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
