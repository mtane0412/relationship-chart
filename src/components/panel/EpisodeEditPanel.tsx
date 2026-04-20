/**
 * EpisodeEditPanelコンポーネント
 * 選択中のエピソードIDからEpisodeを取得し、EpisodeEditFormに渡すコンテナ
 */

'use client';

import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '@/stores/useGraphStore';
import { EpisodeEditForm } from './EpisodeEditForm';

/**
 * エピソード編集パネルコンポーネント
 * selectedEpisodeIds[0] に対応するEpisodeをストアから取得して編集フォームを表示する
 */
export function EpisodeEditPanel() {
  const { selectedEpisodeIds, episodes, clearSelection } = useGraphStore(
    useShallow((state) => ({
      selectedEpisodeIds: state.selectedEpisodeIds,
      episodes: state.episodes,
      clearSelection: state.clearSelection,
    }))
  );

  const episodeId = selectedEpisodeIds[0];
  const episode = episodes.find((e) => e.id === episodeId);

  // 選択されたエピソードが見つからない場合は何も表示しない
  if (!episode) return null;

  return (
    <EpisodeEditForm
      key={episode.id}
      episode={episode}
      onClose={clearSelection}
    />
  );
}
