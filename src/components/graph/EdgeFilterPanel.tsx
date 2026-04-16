/**
 * EdgeFilterPanelコンポーネント
 * タグ・述語によるエッジフィルタUI
 *
 * 相関図内で使用されているタグを自動集計し、ON/OFFトグルで表示するエッジを絞り込む。
 * Phase 4 で LayerFilterPanel を置き換えるコンポーネント。
 */

'use client';

import { memo, useMemo } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';
import type { RelationshipV9 } from '@/types/relationship';

/**
 * エッジフィルターパネルコンポーネント
 *
 * @description
 * 相関図内の全関係からタグを集計し、チェックボックス形式で表示する。
 * チェックしたタグに一致する関係のみエッジとして表示される（ANY モード）。
 * フィルタが適用されている場合は「フィルター解除」ボタンを表示する。
 */
export const EdgeFilterPanel = memo(() => {
  const relationships = useGraphStore((state) => state.relationships);
  const edgeFilter = useGraphStore((state) => state.edgeFilter);
  const updateEdgeFilter = useGraphStore((state) => state.updateEdgeFilter);

  // 相関図全体で使用されているユニークなタグを集計する
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const rel of relationships as unknown as RelationshipV9[]) {
      for (const tag of rel.tags) {
        tagSet.add(tag);
      }
    }
    // アルファベット・辞書順でソート
    return [...tagSet].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [relationships]);

  // フィルタが適用されているかどうか
  const isFiltered = edgeFilter.tags.values.size > 0 || edgeFilter.predicates.length > 0;

  /**
   * タグチェックボックスの変更ハンドラ
   * チェック時は tags.values にタグを追加、解除時は削除する
   */
  const handleTagToggle = (tag: string, checked: boolean) => {
    const newValues = new Set(edgeFilter.tags.values);
    if (checked) {
      newValues.add(tag);
    } else {
      newValues.delete(tag);
    }
    updateEdgeFilter({
      tags: { mode: edgeFilter.tags.mode, values: newValues },
    });
  };

  /**
   * フィルター解除ハンドラ
   * edgeFilter を初期値（全エッジ表示）にリセットする
   */
  const handleReset = () => {
    updateEdgeFilter({
      tags: { mode: 'any', values: new Set() },
      predicates: [],
    });
  };

  return (
    <div className="px-3 py-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          エッジフィルター
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            フィルター解除
          </button>
        )}
      </div>

      {/* タグチェックボックス一覧 */}
      {allTags.length > 0 && (
        <div className="space-y-1">
          {allTags.map((tag) => {
            const checked = edgeFilter.tags.values.has(tag);
            return (
              <label
                key={tag}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => handleTagToggle(tag, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={tag}
                />
                <span className="text-xs text-gray-700 group-hover:text-gray-900 truncate">
                  {tag}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
});

EdgeFilterPanel.displayName = 'EdgeFilterPanel';
