/**
 * MultipleSelectionInfoコンポーネント
 * 3人以上の人物が選択されている場合に表示される案内
 */

'use client';

import { useGraphStore } from '@/stores/useGraphStore';

/**
 * MultipleSelectionInfoのプロパティ
 */
type MultipleSelectionInfoProps = {
  /** 選択されている人物の数 */
  count: number;
};

/**
 * 複数選択案内コンポーネント
 */
export function MultipleSelectionInfo({ count }: MultipleSelectionInfoProps) {
  const clearSelection = useGraphStore((state) => state.clearSelection);

  return (
    <div className="p-4 text-center">
      <div className="mb-4">
        <svg
          className="w-16 h-16 mx-auto text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-2">
        {count}人を選択中
      </h2>

      <p className="text-sm text-gray-600 mb-4">
        2人を選択すると関係を登録できます
      </p>

      <button
        onClick={() => clearSelection()}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        選択を解除
      </button>
    </div>
  );
}
