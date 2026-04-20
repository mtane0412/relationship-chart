/**
 * EpisodeNodeComponentコンポーネント
 * エピソードをグラフ上の付箋風カードノードとして表示する
 * Person ノードと並んでキャンバスに配置され、EpisodeParticipation エッジで人物と繋がる
 *
 * ハンドルはカード中央1点に集約し、node-intersection.ts の境界交点計算と連携する
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BookOpen } from 'lucide-react';
import type { EpisodeNodeData } from '@/types/graph';
import { useHandleHover } from './useHandleHover';

/** エピソードカードの高さ（px）: node-intersection.ts の fallback と一致させる */
const EPISODE_CARD_HEIGHT = 72;
/** ハンドル中心の Y 座標（カード高さの中央）*/
const EPISODE_HANDLE_CENTER_Y = EPISODE_CARD_HEIGHT / 2;

/**
 * エピソードノードコンポーネント
 * @param props - React Flowから渡されるノードプロパティ
 */
export const EpisodeNodeComponent = memo(({ data, selected, id }: NodeProps) => {
  const nodeData = data as EpisodeNodeData;

  const { handleMouseEnter, handleMouseLeave, showSourceHandle, showTargetHandle, isConnectingToThisNode } =
    useHandleHover(id, selected ?? false);

  return (
    <div
      className={`relative cursor-grab active:cursor-grabbing rounded-xl border-2 bg-amber-50 shadow-lg transition-shadow duration-200 ${
        selected
          ? 'border-blue-500 shadow-blue-200 shadow-xl'
          : 'border-amber-200 hover:border-amber-400'
      }`}
      style={{ width: 180, minHeight: EPISODE_CARD_HEIGHT, padding: '10px 12px' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 参加エッジ用ハンドル（source）: カード全体を透明ヒット領域として覆う。ホバー時のみ visible */}
      <Handle
        type="source"
        id="participation-source"
        position={Position.Top}
        className="!absolute !rounded-xl !border-transparent !bg-transparent transition-opacity duration-200"
        style={{
          left: '50%',
          top: `${EPISODE_HANDLE_CENTER_Y}px`,
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: `${EPISODE_CARD_HEIGHT}px`,
          opacity: showSourceHandle ? 1 : 0,
          pointerEvents: showSourceHandle ? 'auto' : 'none',
          zIndex: 2,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* 参加エッジ用ハンドル（target）: カード中央に配置 */}
      <Handle
        type="target"
        id="participation-target"
        position={Position.Top}
        className="!absolute !rounded-xl !border-transparent !bg-transparent transition-opacity duration-200"
        style={{
          left: '50%',
          top: `${EPISODE_HANDLE_CENTER_Y}px`,
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: `${EPISODE_CARD_HEIGHT}px`,
          opacity: 0,
          pointerEvents: showTargetHandle || isConnectingToThisNode ? 'auto' : 'none',
          zIndex: isConnectingToThisNode ? 15 : 2,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* ヘッダー: アイコン + タイトル */}
      <div className="flex items-start gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
        <span className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 flex-1">
          {nodeData.title}
        </span>
      </div>

      {/* 発生日時バッジ */}
      {nodeData.occurredAt && (
        <div
          data-testid="episode-date"
          className="mt-1.5 inline-block text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium"
        >
          {nodeData.occurredAt}
        </div>
      )}

      {/* 説明文プレビュー（2行まで） */}
      {nodeData.description && (
        <p
          data-testid="episode-description"
          className="mt-1 text-[10px] text-gray-500 leading-relaxed line-clamp-2"
        >
          {nodeData.description}
        </p>
      )}
    </div>
  );
});

EpisodeNodeComponent.displayName = 'EpisodeNodeComponent';
