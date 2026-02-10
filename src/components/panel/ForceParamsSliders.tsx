/**
 * force-directedレイアウトのパラメータスライダーコンポーネント
 * リンク距離、リンク強度、反発力の3つのパラメータをリアルタイムに調整可能
 */

import { useGraphStore } from '@/stores/useGraphStore';

/**
 * ForceParamsSlidersコンポーネント
 *
 * @description
 * force-directedレイアウトのパラメータを調整するスライダーUIを提供します。
 * - リンク距離: ノード間の目標距離（50〜500）
 * - リンク強度: エッジによる引力の強さ（0〜1）
 * - 反発力: ノード間の反発力（-1000〜0）
 *
 * パラメータ変更は即座にストアに反映され、useForceLayoutで動的に更新されます。
 */
export function ForceParamsSliders() {
  const forceParams = useGraphStore((state) => state.forceParams);
  const setForceParams = useGraphStore((state) => state.setForceParams);
  const resetForceParams = useGraphStore((state) => state.resetForceParams);

  return (
    <div className="space-y-2">
      {/* Link Distanceスライダー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <label htmlFor="linkDistance">Link Distance</label>
          <span className="text-[10px] text-gray-500">{forceParams.linkDistance}</span>
        </div>
        <input
          id="linkDistance"
          type="range"
          min="50"
          max="500"
          step="10"
          value={forceParams.linkDistance}
          onChange={(e) => setForceParams({ linkDistance: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Link Strengthスライダー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <label htmlFor="linkStrength">Link Strength</label>
          <span className="text-[10px] text-gray-500">{forceParams.linkStrength}</span>
        </div>
        <input
          id="linkStrength"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={forceParams.linkStrength}
          onChange={(e) => setForceParams({ linkStrength: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Charge Strengthスライダー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <label htmlFor="chargeStrength">Charge Strength</label>
          <span className="text-[10px] text-gray-500">{forceParams.chargeStrength}</span>
        </div>
        <input
          id="chargeStrength"
          type="range"
          min="-1000"
          max="0"
          step="10"
          value={forceParams.chargeStrength}
          onChange={(e) => setForceParams({ chargeStrength: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Reset to Defaultボタン */}
      <button
        onClick={resetForceParams}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
      >
        Reset to Default
      </button>
    </div>
  );
}
