/**
 * ExtractionModal コンポーネント
 *
 * LLM テキスト→関係抽出のマルチステップモーダル。
 *
 * ステップ:
 *   1. input   — テキスト入力
 *   2. loading — LLM 処理中（useExtractRelationships の isLoading）
 *   3. preview — 抽出結果プレビュー（人物・関係の確認）
 *   4. （確認後 onClose で閉じる）
 *
 * エラー発生時は input ステップにエラーメッセージを表示する。
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, Users, Link } from 'lucide-react';
import { useExtractRelationships } from '@/hooks/useExtractRelationships';
import { useGraphStore } from '@/stores/useGraphStore';
import { resolveExtractionResult } from '@/lib/person-matching';
import type { LlmExtractionResult } from '@/lib/llm-extraction-schema';

/** テキスト入力の最大文字数 */
const MAX_TEXT_LENGTH = 10000;

/**
 * ExtractionModal の Props
 */
type ExtractionModalProps = {
  /** モーダルが開いているか */
  isOpen: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
};

/**
 * 抽出結果プレビューコンポーネント
 */
function ExtractionPreview({
  result,
  onConfirm,
  onCancel,
}: {
  result: LlmExtractionResult;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* 人物セクション */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">
            抽出された人物 （{result.persons.length} 件）
          </h3>
        </div>
        {result.persons.length === 0 ? (
          <p className="text-sm text-gray-400">なし</p>
        ) : (
          <ul className="space-y-1">
            {result.persons.map((person, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                {person.name}
                {person.kind === 'item' && (
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
          <Link size={16} className="text-green-600" />
          <h3 className="text-sm font-semibold text-gray-700">
            抽出された関係 （{result.relationships.length} 件）
          </h3>
        </div>
        {result.relationships.length === 0 ? (
          <p className="text-sm text-gray-400">なし</p>
        ) : (
          <ul className="space-y-1">
            {result.relationships.map((rel, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-center gap-1 flex-wrap">
                <span className="font-medium">{rel.sourcePersonName}</span>
                <span className="text-gray-400">{rel.isDirected ? '→' : '—'}</span>
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

      {/* ボタン */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          相関図に追加
        </button>
      </div>
    </div>
  );
}

/**
 * LLM テキスト→関係抽出モーダル
 */
export function ExtractionModal({ isOpen, onClose }: ExtractionModalProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { extract, isLoading, error, extractionResult, reset } = useExtractRelationships();

  const persons = useGraphStore((s) => s.persons);
  const addPerson = useGraphStore((s) => s.addPerson);
  const addRelationship = useGraphStore((s) => s.addRelationship);

  // モーダルが開いた時にリセット
  useEffect(() => {
    if (isOpen) {
      setText('');
      reset();
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, reset]);

  // Escape キーで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * 抽出ボタンをクリックした時の処理
   */
  const handleExtract = () => {
    if (!text.trim()) return;
    void extract(text.trim());
  };

  /**
   * 確認ボタンをクリックした時の処理
   * 抽出結果を resolveExtractionResult でストア投入用データに変換してから追加する。
   */
  const handleConfirm = () => {
    if (!extractionResult) return;

    const { newPersons, relationships } = resolveExtractionResult(
      extractionResult,
      persons,
      new Map()
    );

    for (const person of newPersons) {
      addPerson({ name: person.name, kind: person.kind });
    }
    for (const rel of relationships) {
      addRelationship(rel);
    }

    onClose();
  };

  if (!isOpen) return null;

  /** 現在のステップを判定 */
  const step: 'input' | 'loading' | 'preview' =
    isLoading ? 'loading' : extractionResult ? 'preview' : 'input';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="extraction-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-blue-600" />
            <h2
              id="extraction-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              AI で関係を抽出
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* ステップ: input */}
        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="extraction-text"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                テキストを入力
              </label>
              <p className="text-xs text-gray-500 mb-2">
                人物の関係が書かれた文章を入力してください。AI が人物と関係を自動で抽出します。
              </p>
              <textarea
                ref={textareaRef}
                id="extraction-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_TEXT_LENGTH}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                placeholder="例: 田中と山田は幼なじみで、田中は山田のことが好きだが山田は気づいていない。鈴木は田中の上司で厳しい指導をしている。"
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {text.length} / {MAX_TEXT_LENGTH.toLocaleString()}
              </p>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleExtract}
                disabled={!text.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                抽出する
              </button>
            </div>
          </div>
        )}

        {/* ステップ: loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={40} className="text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600">テキストを解析中...</p>
          </div>
        )}

        {/* ステップ: preview */}
        {step === 'preview' && extractionResult && (
          <ExtractionPreview
            result={extractionResult}
            onConfirm={handleConfirm}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}
