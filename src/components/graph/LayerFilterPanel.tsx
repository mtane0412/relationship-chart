/**
 * LayerFilterPanelコンポーネント
 * レイヤーごとの表示/非表示を切り替えるフィルターパネル
 * React FlowのPanelコンポーネントとして配置される
 */

'use client';

import { memo } from 'react';
import { Panel } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { RELATIONSHIP_LAYERS } from '@/types/relationship';

/**
 * レイヤーフィルターパネルコンポーネント
 * キャンバス左上（共有ボタンの下）に配置され、レイヤーのON/OFFを切り替えられる
 */
export const LayerFilterPanel = memo(() => {
  const visibleLayers = useGraphStore((state) => state.visibleLayers);
  const toggleLayerVisibility = useGraphStore((state) => state.toggleLayerVisibility);

  return (
    <Panel position="top-left" className="flex flex-col gap-1 mt-14">
      {RELATIONSHIP_LAYERS.map((layer) => {
        const isVisible = visibleLayers.has(layer.value);
        return (
          <button
            key={layer.value}
            type="button"
            onClick={() => toggleLayerVisibility(layer.value)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border ${
              isVisible
                ? 'bg-white border-gray-200 shadow-sm hover:shadow-md opacity-100'
                : 'bg-gray-50 border-gray-100 opacity-40 hover:opacity-60'
            }`}
            aria-label={`${layer.label}レイヤーを${isVisible ? '非表示' : '表示'}にする`}
            aria-pressed={isVisible}
          >
            {/* レイヤー色インジケーター */}
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: layer.color }}
            />
            <span className="text-gray-700">{layer.label}</span>
          </button>
        );
      })}
    </Panel>
  );
});

LayerFilterPanel.displayName = 'LayerFilterPanel';
