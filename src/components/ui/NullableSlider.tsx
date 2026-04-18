/**
 * NullableSlider コンポーネント
 * null 値を持てる数値スライダー
 * 「未設定」チェックボックスで null ⇔ 数値を切り替える
 */

'use client';

import { useId } from 'react';

/**
 * NullableSlider のプロパティ
 */
export type NullableSliderProps = {
  /** スライダーのラベル（aria-label としても使用） */
  label: string;
  /** 現在の数値（未設定の場合は null） */
  value: number | null;
  /** スライダーの最小値 */
  min: number;
  /** スライダーの最大値 */
  max: number;
  /** スライダーのステップ */
  step: number;
  /** null のときのスライダーデフォルト値 */
  defaultValue: number;
  /**
   * 値変更時に呼ばれる単一コールバック
   * - スライダー操作時: 数値を渡す
   * - 未設定チェックをONにしたとき: null を渡す
   * - 未設定チェックをOFFにしたとき: defaultValue を渡す
   */
  onChange: (value: number | null) => void;
};

/**
 * null 値を持てる数値スライダーコンポーネント
 * 「未設定」チェックボックスで null ⇔ 数値を切り替える
 */
export function NullableSlider({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
}: NullableSliderProps) {
  const isNull = value === null;
  // useId() でインスタンス固有の ID を生成し、ラベル文字列による重複 ID を防ぐ
  const baseId = useId();
  const sliderId = `${baseId}-slider`;
  const checkboxId = `${baseId}-nullable`;
  // 未設定時にスライダーが表示する内部値（デフォルト値か現在値）
  const displayValue = value ?? defaultValue;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-medium text-gray-700">
        <label htmlFor={sliderId}>{label}</label>
        <div className="flex items-center gap-1.5">
          {!isNull && (
            <span className="text-[10px] text-gray-500">{displayValue.toFixed(2)}</span>
          )}
          <label htmlFor={checkboxId} className="flex items-center gap-0.5 text-[10px] text-gray-500 cursor-pointer">
            <input
              id={checkboxId}
              type="checkbox"
              checked={isNull}
              onChange={(e) => onChange(e.target.checked ? null : defaultValue)}
              aria-label={`${label}を未設定`}
              className="w-3 h-3"
            />
            未設定
          </label>
        </div>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        disabled={isNull}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full disabled:opacity-40"
      />
    </div>
  );
}
