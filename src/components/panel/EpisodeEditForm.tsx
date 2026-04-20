/**
 * EpisodeEditFormコンポーネント
 * 選択されたエピソードノードの編集フォーム
 * title / description / occurredAt / relatedRelationshipIds / properties を編集できる
 */

import { useState, type ChangeEvent } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { PropertiesKvEditor } from '@/components/ui/PropertiesKvEditor';
import type { Episode } from '@/types/episode';

/**
 * EpisodeEditFormのProps
 */
type EpisodeEditFormProps = {
  /** 編集対象のエピソード */
  episode: Episode;
  /** フォームを閉じるコールバック */
  onClose: () => void;
};

/**
 * エピソード編集フォームコンポーネント
 */
export function EpisodeEditForm({ episode, onClose }: EpisodeEditFormProps) {
  const updateEpisode = useGraphStore((state) => state.updateEpisode);
  const deleteEpisode = useGraphStore((state) => state.deleteEpisode);
  const relationships = useGraphStore((state) => state.relationships);

  const [title, setTitle] = useState(episode.title);
  const [description, setDescription] = useState(episode.description ?? '');
  const [occurredAt, setOccurredAt] = useState(episode.occurredAt ?? '');
  const [relatedRelationshipIds, setRelatedRelationshipIds] = useState<string[]>(
    episode.relatedRelationshipIds
  );
  const [properties, setProperties] = useState<Record<string, unknown>>(episode.properties);

  // タイトル Enterキー保存ハンドラ（IME対応）
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const trimmed = title.trim();
      if (trimmed) {
        updateEpisode(episode.id, { title: trimmed });
      }
    }
  };

  // タイトル blur 保存ハンドラ（空の場合は元の値に戻す）
  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed) {
      updateEpisode(episode.id, { title: trimmed });
    } else {
      setTitle(episode.title);
    }
  };

  // 説明 blur 保存ハンドラ
  const handleDescriptionBlur = () => {
    updateEpisode(episode.id, { description: description || undefined });
  };

  // 発生日時 blur 保存ハンドラ
  const handleOccurredAtBlur = () => {
    updateEpisode(episode.id, { occurredAt: occurredAt || undefined });
  };

  // 関連関係 チェックボックスハンドラ
  const handleRelationshipToggle = (relId: string, checked: boolean) => {
    const next = checked
      ? [...relatedRelationshipIds, relId]
      : relatedRelationshipIds.filter((id) => id !== relId);
    setRelatedRelationshipIds(next);
    updateEpisode(episode.id, { relatedRelationshipIds: next });
  };

  // プロパティ変更ハンドラ
  const handlePropertiesChange = (next: Record<string, unknown>) => {
    setProperties(next);
    updateEpisode(episode.id, { properties: next });
  };

  // 削除ハンドラ（確認ダイアログ付き）
  const handleDelete = () => {
    if (!window.confirm('このエピソードを削除しますか？')) return;
    deleteEpisode(episode.id);
    onClose();
  };

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">エピソードを編集</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="戻る"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* タイトル */}
      <div className="mb-4">
        <label htmlFor="episode-title" className="block text-sm font-medium text-gray-700 mb-2">
          タイトル
        </label>
        <input
          id="episode-title"
          type="text"
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          onBlur={handleTitleBlur}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="エピソードのタイトル"
        />
      </div>

      {/* 発生日時 */}
      <div className="mb-4">
        <label htmlFor="episode-occurred-at" className="block text-sm font-medium text-gray-700 mb-2">
          発生日時
        </label>
        <input
          id="episode-occurred-at"
          type="text"
          value={occurredAt}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setOccurredAt(e.target.value)}
          onBlur={handleOccurredAtBlur}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="例: 第1話、2024年春"
        />
      </div>

      {/* 説明 */}
      <div className="mb-4">
        <label htmlFor="episode-description" className="block text-sm font-medium text-gray-700 mb-2">
          説明
        </label>
        <textarea
          id="episode-description"
          value={description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
          placeholder="エピソードの説明"
        />
      </div>

      {/* 関連関係 */}
      {relationships.length > 0 && (
        <div className="mb-4">
          <span className="block text-sm font-medium text-gray-700 mb-2">関連する関係</span>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {relationships.map((rel) => {
              const label = rel.label ?? rel.type ?? rel.id;
              return (
                <label key={rel.id} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={relatedRelationshipIds.includes(rel.id)}
                    onChange={(e) => handleRelationshipToggle(rel.id, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* プロパティ */}
      <details className="mb-4 border-t border-gray-200 pt-4">
        <summary className="text-sm font-medium text-gray-700 cursor-pointer select-none">
          プロパティ
        </summary>
        <div className="mt-3">
          <PropertiesKvEditor value={properties} onChange={handlePropertiesChange} />
        </div>
      </details>

      {/* 削除ボタン */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          削除
        </button>
      </div>
    </div>
  );
}
