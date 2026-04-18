/**
 * ExtractionPreviewPanel コンポーネント
 *
 * LLM 抽出結果のプレビューをフローティングパネルとして表示する。
 * ExtractionModal の ExtractionPreview コンポーネントを独立させ、
 * チャット入力バーの上部に配置されるフローティングパネルとして再設計した。
 *
 * - モーダル（オーバーレイ）ではなくインラインパネルで表示
 * - 確認後に相関図に人物・関係を追加する
 */

'use client';

import { Users, Link } from 'lucide-react';
import type { LlmExtractionResult } from '@/lib/llm-extraction-schema';

/**
 * ExtractionPreviewPanel の Props
 */
type ExtractionPreviewPanelProps = {
  /** LLM が抽出した結果 */
  result: LlmExtractionResult;
  /** 「相関図に追加」ボタンを押したときのコールバック */
  onConfirm: () => void;
  /** キャンセルボタンを押したときのコールバック */
  onCancel: () => void;
};

/**
 * LLM 抽出結果のフローティングプレビューパネル
 *
 * 入力バーの上部に表示され、抽出された人物・関係の確認を促す。
 * 確認すると useGraphStore に人物・関係が追加される。
 */
export function ExtractionPreviewPanel({
  result,
  onConfirm,
  onCancel,
}: ExtractionPreviewPanelProps) {
  return (
    <div
      className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50"
      role="dialog"
      aria-modal="false"
      aria-labelledby="extraction-preview-title"
    >
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3
          id="extraction-preview-title"
          className="text-sm font-semibold text-gray-700"
        >
          抽出結果を確認
        </h3>
      </div>

      <div className="p-4 space-y-4 max-h-72 overflow-y-auto">
        {/* 人物セクション */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              人物 ({result.persons.length} 件)
            </span>
          </div>
          {result.persons.length === 0 ? (
            <p className="text-sm text-gray-400 ml-5">なし</p>
          ) : (
            <ul className="space-y-1">
              {result.persons.map((person, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  {person.name}
                  {person.labels?.includes('物') && (
                    <span className="text-xs text-gray-400">（アイテム）</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 関係セクション */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              関係 ({result.relationships.length} 件)
            </span>
          </div>
          {result.relationships.length === 0 ? (
            <p className="text-sm text-gray-400 ml-5">なし</p>
          ) : (
            <ul className="space-y-1">
              {result.relationships.map((rel, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 flex items-center gap-1 flex-wrap ml-1"
                >
                  <span className="font-medium">{rel.sourcePersonName}</span>
                  <span className="text-gray-400 text-xs">{rel.isDirected ? '→' : '—'}</span>
                  <span className="font-medium">{rel.targetPersonName}</span>
                  {rel.forward.label && (
                    <span className="text-xs text-gray-500">（{rel.forward.label}）</span>
                  )}
                  {rel.tags.length > 0 && (
                    <span className="text-xs text-blue-500">[{rel.tags.join(', ')}]</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          相関図に追加
        </button>
      </div>
    </div>
  );
}
