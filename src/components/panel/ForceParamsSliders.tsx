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
    <div className="space-y-4 pt-2">
      {/* リンク距離スライダー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm font-medium">
          <label htmlFor="linkDistance">リンク距離</label>
          <span className="text-xs text-gray-500">{forceParams.linkDistance}</span>
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

      {/* リンク強度スライダー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm font-medium">
          <label htmlFor="linkStrength">リンク強度</label>
          <span className="text-xs text-gray-500">{forceParams.linkStrength}</span>
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

      {/* 反発力スライダー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm font-medium">
          <label htmlFor="chargeStrength">反発力</label>
          <span className="text-xs text-gray-500">{forceParams.chargeStrength}</span>
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

      {/* デフォルトに戻すボタン */}
      <button
        onClick={resetForceParams}
        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        デフォルトに戻す
      </button>
    </div>
  );
}
