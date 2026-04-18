/**
 * TagChipInput コンポーネント
 * タグをchip形式で表示・追加・削除する入力コンポーネント
 * SUGGESTED_TAGS 等を datalist として提供し、候補補完をサポートする
 */

'use client';

import { useState, useId } from 'react';

/**
 * TagChipInput のプロパティ
 */
export type TagChipInputProps = {
  /** 現在のタグ一覧 */
  value: string[];
  /** タグ変更時に呼ばれるコールバック */
  onChange: (tags: string[]) => void;
  /** datalist に表示する候補タグ */
  suggestions: readonly string[];
  /** datalist 要素の ID（省略時は useId() で生成） */
  datalistId?: string;
};

/**
 * タグ chip 入力コンポーネント
 * suggestions を datalist として提供し、chip形式でタグを表示・削除する
 */
export function TagChipInput({ value, onChange, suggestions, datalistId: datalistIdProp }: TagChipInputProps) {
  const [inputValue, setInputValue] = useState('');
  // 呼び出し元から ID が渡されていれば使い、なければ useId() で一意な ID を生成する
  const generatedId = useId();
  const datalistId = datalistIdProp ?? `${generatedId}-tag-suggestions`;

  const addTag = (raw: string) => {
    const tag = raw.trim();
    // 大文字・小文字を区別せず重複チェックし、元のケースを保持して追加する
    if (!tag || value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // IME変換中のEnterは無視（日本語入力の変換確定時の誤動作を防ぐ）
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      addTag(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      {/* 既存タグのチップ表示 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-0.5 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`${tag}を削除`}
                className="hover:text-blue-600 ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {/* タグ入力フィールド */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        list={datalistId}
        aria-label="タグを追加"
        placeholder="タグを追加（Enter で確定）"
        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <datalist id={datalistId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
