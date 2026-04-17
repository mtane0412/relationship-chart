/**
 * EdgeFilterPanelコンポーネント
 * タグ・述語によるエッジフィルタUI
 *
 * 相関図内で使用されているタグを自動集計し、ON/OFFトグルで表示するエッジを絞り込む。
 * また、closeness/trust/tension/secrecyの閾値フィルタとkinship有無フィルタも提供する。
 */

'use client';

import { memo, useMemo, useCallback } from 'react';
import { Panel } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import type { EdgePredicate, RelationshipV9 } from '@/types/relationship';

/**
 * パネル上部のオフセット量
 * ShareButton（top-left, 約40px 高さ）の下に配置するための固定値
 */
const EDGE_FILTER_PANEL_TOP_OFFSET = '56px';

/** 数値述語の type リテラル型 */
type NumericPredicateType = 'closeness_gte' | 'trust_gte' | 'tension_gte' | 'secrecy_gte';

/** 数値述語の設定定数 */
const NUMERIC_PREDICATE_CONFIG: { type: NumericPredicateType; label: string }[] = [
  { type: 'closeness_gte', label: '親密度' },
  { type: 'trust_gte', label: '信頼度' },
  { type: 'tension_gte', label: '緊張度' },
  { type: 'secrecy_gte', label: '秘匿性' },
];

/**
 * predicates 配列から特定 type の述語を検索する
 * ジェネリクスにより返り値の型が type に応じて絞り込まれるため型安全に参照できる
 */
function findPredicate<T extends EdgePredicate['type']>(
  predicates: EdgePredicate[],
  type: T,
): Extract<EdgePredicate, { type: T }> | undefined {
  return predicates.find((p) => p.type === type) as Extract<EdgePredicate, { type: T }> | undefined;
}

/**
 * predicates 配列に述語を追加/更新する（immutable）
 * 同じ type の述語が既にある場合は上書き、なければ末尾に追加する
 * 単一パスで処理することで効率的に配列を操作する
 */
function upsertPredicate(predicates: EdgePredicate[], pred: EdgePredicate): EdgePredicate[] {
  const idx = predicates.findIndex((p) => p.type === pred.type);
  if (idx >= 0) {
    const next = [...predicates];
    next[idx] = pred;
    return next;
  }
  return [...predicates, pred];
}

/**
 * predicates 配列から特定 type の述語を除外する（immutable）
 */
function removePredicate(predicates: EdgePredicate[], type: string): EdgePredicate[] {
  return predicates.filter((p) => p.type !== type);
}

// ---- PredicateSlider ----

type PredicateSliderProps = {
  /** 表示ラベル（「親密度」など） */
  label: string;
  /** 述語の type */
  predicateType: NumericPredicateType;
  /** チェックボックスが ON かどうか（predicates 配列に含まれるか） */
  enabled: boolean;
  /** 現在の閾値（0〜1） */
  value: number;
  /** チェックボックス変更時のコールバック */
  onToggle: (checked: boolean) => void;
  /** スライダー値変更時のコールバック */
  onValueChange: (value: number) => void;
};

/**
 * 数値述語スライダーコンポーネント
 *
 * @description
 * チェックボックスで有効/無効を切り替え、スライダーで閾値を設定する。
 * チェックが OFF の場合、スライダーは disabled になる。
 */
function PredicateSlider({ label, predicateType, enabled, value, onToggle, onValueChange }: PredicateSliderProps) {
  const checkboxId = `predicate-checkbox-${predicateType}`;
  const sliderId = `predicate-slider-${predicateType}`;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <label htmlFor={checkboxId} className="flex items-center gap-1.5 cursor-pointer">
          <input
            id={checkboxId}
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label={`${label}を有効化`}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700">{label}</span>
        </label>
        {enabled && (
          <span className="text-[10px] text-gray-500">{value.toFixed(1)}</span>
        )}
      </div>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={value}
        disabled={!enabled}
        onChange={(e) => onValueChange(Number(e.target.value))}
        aria-label={`${label}スライダー`}
        className="w-full disabled:opacity-40"
      />
    </div>
  );
}

// ---- EdgeFilterPanel ----

/**
 * エッジフィルターパネルコンポーネント
 *
 * @description
 * 相関図内の全関係からタグを集計し、チェックボックス形式で表示する。
 * チェックしたタグに一致する関係のみエッジとして表示される（ANY モード）。
 * また述語フィルタ（数値閾値・血縁有無）も提供する。
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
      // rel.tags が undefined の場合は空配列にフォールバックする（型の不整合への防御）
      for (const tag of rel.tags ?? []) {
        tagSet.add(tag);
      }
    }
    // アルファベット・辞書順でソート
    return [...tagSet].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [relationships]);

  // フィルタが適用されているかどうか
  const isFiltered = edgeFilter.tags.values.length > 0 || edgeFilter.predicates.length > 0;

  /**
   * タグチェックボックスの変更ハンドラ
   * チェック時は tags.values にタグを追加、解除時は削除する
   */
  const handleTagToggle = useCallback((tag: string, checked: boolean) => {
    const newValues = checked
      // 重複排除して追加
      ? [...new Set([...edgeFilter.tags.values, tag])]
      : edgeFilter.tags.values.filter((v) => v !== tag);
    updateEdgeFilter({
      tags: { mode: edgeFilter.tags.mode, values: newValues },
    });
  }, [edgeFilter.tags, updateEdgeFilter]);

  /**
   * 数値述語チェックボックスの変更ハンドラ
   * ON: predicates 配列に述語を追加（デフォルト閾値 0）
   * OFF: predicates 配列から述語を除外
   */
  const handlePredicateToggle = useCallback((type: NumericPredicateType, checked: boolean) => {
    const current = edgeFilter.predicates;
    const next = checked
      ? upsertPredicate(current, { type, value: 0 })
      : removePredicate(current, type);
    updateEdgeFilter({ predicates: next });
  }, [edgeFilter.predicates, updateEdgeFilter]);

  /**
   * 数値述語スライダーの変更ハンドラ
   * predicates 配列内の対象述語の value を更新する
   */
  const handlePredicateValueChange = useCallback((type: NumericPredicateType, value: number) => {
    const next = upsertPredicate(edgeFilter.predicates, { type, value });
    updateEdgeFilter({ predicates: next });
  }, [edgeFilter.predicates, updateEdgeFilter]);

  /**
   * 血縁ありチェックボックスの変更ハンドラ
   * ON: predicates に has_kinship を追加
   * OFF: predicates から has_kinship を除外
   */
  const handleHasKinshipToggle = useCallback((checked: boolean) => {
    const current = edgeFilter.predicates;
    // upsertPredicate を使って重複追加を防ぐ
    const next = checked
      ? upsertPredicate(current, { type: 'has_kinship' })
      : removePredicate(current, 'has_kinship');
    updateEdgeFilter({ predicates: next });
  }, [edgeFilter.predicates, updateEdgeFilter]);

  /**
   * フィルター解除ハンドラ
   * edgeFilter を初期値（全エッジ表示）にリセットする
   */
  const handleReset = () => {
    updateEdgeFilter({
      tags: { mode: 'any', values: [] },
      predicates: [],
    });
  };

  // 関係が1件もない場合はパネル自体を非表示にする
  // タグ0件でも関係が存在すれば述語フィルタセクションを表示する
  if (relationships.length === 0) {
    return null;
  }

  const hasKinship = !!findPredicate(edgeFilter.predicates, 'has_kinship');

  return (
    // ShareButton（top-left, 約40px高さ）の下に配置するため top オフセットを指定
    <Panel position="top-left" style={{ top: EDGE_FILTER_PANEL_TOP_OFFSET }}>
      <div className="bg-white rounded-lg shadow-md px-3 py-2 min-w-[160px] max-w-[220px]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            エッジフィルター
          </span>
          {isFiltered && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-2"
            >
              解除
            </button>
          )}
        </div>

        {/* タグセクション（タグが存在する場合のみ表示） */}
        {allTags.length > 0 && (
          <details open className="mb-2">
            <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none mb-1">
              タグ
            </summary>
            {/* タグチェックボックス一覧（タグが多い場合はスクロール可能） */}
            <div className="space-y-1 max-h-48 overflow-y-auto mt-1">
              {allTags.map((tag) => {
                const checked = edgeFilter.tags.values.includes(tag);
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
                    />
                    <span className="text-xs text-gray-700 group-hover:text-gray-900 truncate">
                      {tag}
                    </span>
                  </label>
                );
              })}
            </div>
          </details>
        )}

        {/* 述語フィルタセクション */}
        <details>
          <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none mb-1">
            条件
          </summary>
          <div className="space-y-2 mt-1">
            {/* 数値述語スライダー */}
            {NUMERIC_PREDICATE_CONFIG.map(({ type, label }) => {
              const pred = findPredicate(edgeFilter.predicates, type);
              const enabled = pred !== undefined;
              // type が数値述語の場合のみ value を参照する
              const value = (pred && 'value' in pred) ? pred.value : 0;
              return (
                <PredicateSlider
                  key={type}
                  label={label}
                  predicateType={type}
                  enabled={enabled}
                  value={value}
                  onToggle={(checked) => handlePredicateToggle(type, checked)}
                  onValueChange={(v) => handlePredicateValueChange(type, v)}
                />
              );
            })}

            {/* 血縁ありチェックボックス */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasKinship}
                onChange={(e) => handleHasKinshipToggle(e.target.checked)}
                aria-label="血縁あり"
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">血縁あり</span>
            </label>
          </div>
        </details>
      </div>
    </Panel>
  );
});

EdgeFilterPanel.displayName = 'EdgeFilterPanel';
