/**
 * EpisodeListコンポーネント
 * サイドパネルのエピソード一覧
 *
 * 機能:
 * - エピソード一覧の表示
 * - タイトルのインライン編集
 * - エピソードの削除（確認ダイアログ付き）
 * - 「+ エピソードを追加」ボタンでEpisodeCaptureDialogを開く
 * - ドラッグ&ドロップによる並び替え
 */

'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
import { EpisodeCaptureDialog, type EpisodeCaptureValues } from '@/components/ui/EpisodeCaptureDialog';
import type { Episode } from '@/types/episode';

/**
 * ソート可能なエピソード行コンポーネント
 */
function SortableEpisodeItem({
  episode,
  onDelete,
  onTitleSave,
}: {
  episode: Episode;
  onDelete: (id: string) => void;
  onTitleSave: (id: string, title: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(episode.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: episode.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTitleClick = () => {
    setIsEditing(true);
    setEditValue(episode.title);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== episode.title) {
      onTitleSave(episode.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-50 group"
    >
      {/* ドラッグハンドル */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 shrink-0"
        aria-label="ドラッグして並び替え"
        tabIndex={-1}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* タイトル（インライン編集） */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full px-1 py-0.5 text-xs border border-amber-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
            aria-label="タイトルを編集"
          />
        ) : (
          <button
            type="button"
            className="w-full text-left text-xs text-gray-800 truncate hover:text-amber-700"
            onClick={handleTitleClick}
          >
            {episode.title}
          </button>
        )}
        {episode.occurredAt && (
          <span className="text-[10px] text-gray-400">{episode.occurredAt}</span>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => onDelete(episode.id)}
        className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-400 hover:text-red-500 transition-opacity"
        aria-label={`「${episode.title}」を削除`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * エピソード一覧コンポーネント
 */
export function EpisodeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const episodes = useGraphStore((state) => state.episodes);
  const createEpisode = useGraphStore((state) => state.createEpisode);
  const deleteEpisode = useGraphStore((state) => state.deleteEpisode);
  const updateEpisode = useGraphStore((state) => state.updateEpisode);
  const reorderEpisodes = useGraphStore((state) => state.reorderEpisodes);
  const addParticipation = useGraphStore((state) => state.addParticipation);
  const openConfirm = useDialogStore((state) => state.openConfirm);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = episodes.findIndex((e) => e.id === active.id);
    const newIndex = episodes.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(episodes, oldIndex, newIndex);
    reorderEpisodes(reordered.map((e) => e.id));
  };

  const handleDelete = async (id: string) => {
    const episode = episodes.find((e) => e.id === id);
    const confirmed = await openConfirm({
      message: `「${episode?.title ?? 'このエピソード'}」を削除してもよろしいですか？`,
      isDanger: true,
    });
    if (confirmed) {
      deleteEpisode(id);
    }
  };

  const handleTitleSave = (id: string, title: string) => {
    updateEpisode(id, { title });
  };

  const handleSave = (values: EpisodeCaptureValues) => {
    const episodeId = createEpisode({
      title: values.title,
      description: values.description,
      occurredAt: values.occurredAt,
      relatedRelationshipIds: values.relatedRelationshipIds,
    });
    // 参加人物のエッジを作成
    for (const personId of values.participantPersonIds) {
      addParticipation({ episodeId, personId });
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">エピソード</h3>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-0.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
          aria-label="エピソードを追加"
        >
          <Plus className="w-3.5 h-3.5" />
          エピソードを追加
        </button>
      </div>

      {/* 一覧 */}
      {episodes.length === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-400 text-center">
          エピソードがありません
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={episodes.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {episodes.map((episode) => (
                <SortableEpisodeItem
                  key={episode.id}
                  episode={episode}
                  onDelete={handleDelete}
                  onTitleSave={handleTitleSave}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* エピソード追加ダイアログ */}
      <EpisodeCaptureDialog
        isOpen={isDialogOpen}
        onSave={handleSave}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
}
