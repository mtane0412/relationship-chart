/**
 * TurningPointsEditor コンポーネント
 * ターニングポイントの動的リストを編集する
 * 行の追加・削除・編集（時期・出来事）を提供する
 */

'use client';

import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import { SkipForward } from 'lucide-react';

/** ターニングポイントの行（ローカルステート用） */
export type TurningPointRow = {
  id: string;
  at: string;
  note: string;
};

/**
 * TurningPointsEditor のプロパティ
 */
export type TurningPointsEditorProps = {
  /** ターニングポイント行の配列 */
  value: TurningPointRow[];
  /** 変更時に呼ばれるコールバック */
  onChange: (rows: TurningPointRow[]) => void;
  /**
   * at 文字列から対応するスナップショットのインデックスを解決する関数（省略可）。
   * null を返した場合はジャンプボタンを非表示にする。
   */
  findSnapshotIndexByAt?: (at: string) => number | null;
  /**
   * スナップショットへジャンプするコールバック（省略可）。
   * @param index - ジャンプ先スナップショットのインデックス
   */
  onJumpToSnapshot?: (index: number) => void;
};

/**
 * ターニングポイント動的リストエディタ
 * 行の追加・削除・編集を提供する
 */
export function TurningPointsEditor({ value, onChange, findSnapshotIndexByAt, onJumpToSnapshot }: TurningPointsEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([...value, { id: nanoid(), at: '', note: '' }]);
  }, [value, onChange]);

  const handleRemove = useCallback((id: string) => {
    onChange(value.filter((row) => row.id !== id));
  }, [value, onChange]);

  const handleChange = useCallback((id: string, field: 'at' | 'note', text: string) => {
    onChange(value.map((row) => (row.id === id ? { ...row, [field]: text } : row)));
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-gray-700">ターニングポイント</span>
      {value.map((row, index) => (
        <div key={row.id} className="flex gap-1 items-start">
          <input
            type="text"
            value={row.at}
            onChange={(e) => handleChange(row.id, 'at', e.target.value)}
            aria-label={`ターニングポイント${index + 1}の時期・時点`}
            placeholder="時期・時点"
            className="w-24 shrink-0 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            value={row.note}
            onChange={(e) => handleChange(row.id, 'note', e.target.value)}
            aria-label={`ターニングポイント${index + 1}の出来事`}
            placeholder="出来事"
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {/* at が空でなく、かつスナップショットに一致する場合のみジャンプボタンを表示する */}
          {row.at.trim() && findSnapshotIndexByAt && onJumpToSnapshot && (() => {
            const snapshotIndex = findSnapshotIndexByAt(row.at);
            if (snapshotIndex === null) return null;
            return (
              <button
                type="button"
                onClick={() => onJumpToSnapshot(snapshotIndex)}
                aria-label={`「${row.at}」のスナップショットへジャンプ`}
                title={`「${row.at}」のスナップショットへジャンプ`}
                className="shrink-0 text-blue-400 hover:text-blue-600 px-1 py-1"
              >
                <SkipForward size={12} />
              </button>
            );
          })()}
          <button
            type="button"
            onClick={() => handleRemove(row.id)}
            aria-label="このターニングポイントを削除"
            className="shrink-0 text-gray-400 hover:text-red-500 text-xs px-1 py-1"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
      >
        + ターニングポイントを追加
      </button>
    </div>
  );
}
