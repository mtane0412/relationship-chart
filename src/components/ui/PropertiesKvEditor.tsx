/**
 * PropertiesKvEditor コンポーネント
 * Record<string, unknown> 型のプロパティを KV 形式で編集するコンポーネント
 * 各行でキー・型（文字列/数値/真偽値）・値を編集できる
 */

'use client';

import { useEffect, useState } from 'react';
import { coerceKvValue, type KvValueType } from '@/lib/kv-value-coerce';

/**
 * PropertiesKvEditor のプロパティ
 */
export type PropertiesKvEditorProps = {
  /** 現在のプロパティ値 */
  value: Record<string, unknown>;
  /** プロパティ変更時に呼ばれるコールバック */
  onChange: (next: Record<string, unknown>) => void;
};

/** 編集中の行データ */
type KvRow = {
  /** 行を安定して識別するためのユニーク ID（index を使わない） */
  id: string;
  key: string;
  type: KvValueType;
  value: string | number | boolean;
  /** 新規追加中かどうか（まだ onChange を呼んでいない行） */
  isPending: boolean;
};

let rowIdCounter = 0;
/** 行ごとに安定した ID を採番する */
function nextRowId(): string {
  return `kv-row-${++rowIdCounter}`;
}

/** unknown 値から KvValueType を推定する */
function inferType(v: unknown): KvValueType {
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  return 'string';
}

/**
 * unknown 値をエディタが扱える string | number | boolean に正規化する
 * null / undefined / object はすべて空文字列に変換する
 */
function normalizeKvValue(v: unknown): string | number | boolean {
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
    return v;
  }
  return v == null ? '' : String(v);
}

/** 型ラベルの日本語表示 */
const TYPE_LABELS: Record<KvValueType, string> = {
  string: '文字列',
  number: '数値',
  boolean: '真偽値',
};

/** Record → KvRow[] 変換 */
function toRows(record: Record<string, unknown>): KvRow[] {
  return Object.entries(record).map(([key, val]) => {
    const normalizedValue = normalizeKvValue(val);
    const type = inferType(normalizedValue);
    return { id: nextRowId(), key, type, value: normalizedValue, isPending: false };
  });
}

/** KvRow[] → Record 変換（pending 行は除外） */
function toRecord(rows: KvRow[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.isPending && row.key.trim()) {
      result[row.key.trim()] = row.value;
    }
  }
  return result;
}

/** コミット済み行の中に重複キーがあるか判定する */
function hasDuplicateCommittedKeys(rows: KvRow[]): boolean {
  const keys = rows
    .filter((row) => !row.isPending)
    .map((row) => row.key.trim())
    .filter(Boolean);
  return new Set(keys).size !== keys.length;
}

/**
 * KV プロパティエディタコンポーネント
 * string / number / boolean の各型に対応した行エディタを提供する
 */
export function PropertiesKvEditor({ value, onChange }: PropertiesKvEditorProps) {
  const [rows, setRows] = useState<KvRow[]>(() => toRows(value));

  // value prop が外部から更新された場合（Person 切替・snapshot 復元など）に rows を同期する
  useEffect(() => {
    setRows(toRows(value));
  }, [value]);

  const emitChange = (nextRows: KvRow[]) => {
    if (hasDuplicateCommittedKeys(nextRows)) return;
    onChange(toRecord(nextRows));
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { id: nextRowId(), key: '', type: 'string', value: '', isPending: true },
    ]);
  };

  const handleKeyChange = (index: number, newKey: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], key: newKey };
      return next;
    });
  };

  const handleKeyBlur = (index: number) => {
    const row = rows[index];
    const trimmed = row.key.trim();
    if (!trimmed) return;

    // 重複チェック（自分以外のキー）
    const others = rows.filter((_, i) => i !== index).map((r) => r.key.trim());
    if (others.includes(trimmed)) return;

    if (row.isPending) {
      const next = [...rows];
      next[index] = { ...next[index], key: trimmed, isPending: false };
      setRows(next);
    }
    emitChange(rows.map((r, i) => (i === index ? { ...r, key: trimmed } : r)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.currentTarget.blur();
    }
  };

  const handleTypeChange = (index: number, newType: KvValueType) => {
    const row = rows[index];
    const newValue = coerceKvValue(row.value, row.type, newType);
    const next = [...rows];
    next[index] = { ...next[index], type: newType, value: newValue };
    setRows(next);
    if (!next[index].isPending) {
      emitChange(next);
    }
  };

  const handleValueChange = (index: number, rawValue: string) => {
    const row = rows[index];
    let parsed: string | number | boolean = rawValue;
    if (row.type === 'number') {
      const n = Number(rawValue);
      parsed = Number.isNaN(n) ? 0 : n;
    } else if (row.type === 'boolean') {
      parsed = rawValue === 'true';
    }
    const next = [...rows];
    next[index] = { ...next[index], value: parsed };
    setRows(next);
  };

  const handleValueBlur = (index: number) => {
    const row = rows[index];
    if (!row.key.trim()) return;

    if (row.isPending) {
      const next = [...rows];
      next[index] = { ...next[index], isPending: false };
      if (hasDuplicateCommittedKeys(next)) return;
      setRows(next);
      emitChange(next);
    } else {
      emitChange(rows);
    }
  };

  const handleDelete = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    setRows(next);
    if (!rows[index].isPending) {
      emitChange(next);
    }
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-gray-400">プロパティなし</p>
      )}
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-1">
          {/* キー入力 */}
          <input
            type="text"
            value={row.key}
            onChange={(e) => handleKeyChange(index, e.target.value)}
            onBlur={() => handleKeyBlur(index)}
            onKeyDown={handleKeyDown}
            placeholder="キー"
            className="w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="プロパティキー"
          />
          {/* 型セレクト */}
          <select
            value={row.type}
            onChange={(e) => handleTypeChange(index, e.target.value as KvValueType)}
            className="px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="プロパティ型"
          >
            <option value="string">{TYPE_LABELS.string}</option>
            <option value="number">{TYPE_LABELS.number}</option>
            <option value="boolean">{TYPE_LABELS.boolean}</option>
          </select>
          {/* 値入力 */}
          {row.type === 'boolean' ? (
            <select
              value={String(row.value)}
              onChange={(e) => handleValueChange(index, e.target.value)}
              onBlur={() => handleValueBlur(index)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="プロパティ値"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              type={row.type === 'number' ? 'number' : 'text'}
              value={String(row.value)}
              onChange={(e) => handleValueChange(index, e.target.value)}
              onBlur={() => handleValueBlur(index)}
              onKeyDown={handleKeyDown}
              placeholder="値"
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="プロパティ値"
            />
          )}
          {/* 削除ボタン */}
          <button
            type="button"
            onClick={() => handleDelete(index)}
            aria-label={`${row.key || '行'}を削除`}
            className="p-1 text-gray-400 hover:text-red-500"
          >
            ×
          </button>
        </div>
      ))}
      {/* 追加ボタン */}
      <button
        type="button"
        onClick={handleAddRow}
        className="text-xs text-blue-600 hover:text-blue-800"
        aria-label="プロパティを追加"
      >
        ＋ 追加
      </button>
    </div>
  );
}
