/**
 * EGO Layoutのパラメータスライダーコンポーネント
 * リング間隔と第1リング半径の2つのパラメータを調整可能
 */

import { useGraphStore } from '@/stores/useGraphStore';

/**
 * EgoLayoutParamsSlidersコンポーネント
 *
 * @description
 * EGO Layoutのパラメータを調整するスライダーUIを提供します。
 * - Ring Spacing: リング間の距離（100〜500px）
 * - First Ring Radius: 最初のリングの半径（100〜400px）
 *
 * パラメータ変更は即座にストアに反映されます。
 */
export function EgoLayoutParamsSliders() {
  const egoLayoutParams = useGraphStore((state) => state.egoLayoutParams);
  const setEgoLayoutParams = useGraphStore((state) => state.setEgoLayoutParams);
  const resetEgoLayoutParams = useGraphStore((state) => state.resetEgoLayoutParams);

  return (
    <div className="space-y-2">
      {/* Ring Spacingスライダー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <label htmlFor="ringSpacing">Ring Spacing</label>
          <span className="text-[10px] text-gray-500">{egoLayoutParams.ringSpacing}</span>
        </div>
        <input
          id="ringSpacing"
          type="range"
          min="100"
          max="500"
          step="10"
          value={egoLayoutParams.ringSpacing}
          onChange={(e) => setEgoLayoutParams({ ringSpacing: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* First Ring Radiusスライダー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <label htmlFor="firstRingRadius">First Ring Radius</label>
          <span className="text-[10px] text-gray-500">{egoLayoutParams.firstRingRadius}</span>
        </div>
        <input
          id="firstRingRadius"
          type="range"
          min="100"
          max="400"
          step="10"
          value={egoLayoutParams.firstRingRadius}
          onChange={(e) => setEgoLayoutParams({ firstRingRadius: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Reset to Defaultボタン */}
      <button
        onClick={resetEgoLayoutParams}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
      >
        Reset to Default
      </button>
    </div>
  );
}
