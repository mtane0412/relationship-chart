/**
 * EpisodeNodeComponentコンポーネント
 * エピソードをグラフ上の付箋風カードノードとして表示する
 * Person ノードと並んでキャンバスに配置され、EpisodeParticipation エッジで人物と繋がる
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BookOpen } from 'lucide-react';
import type { EpisodeNodeData } from '@/types/graph';

/**
 * エピソードノードコンポーネント
 * @param props - React Flowから渡されるノードプロパティ
 */
export const EpisodeNodeComponent = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as EpisodeNodeData;

  return (
    <div
      className={`relative cursor-grab active:cursor-grabbing rounded-xl border-2 bg-amber-50 shadow-lg transition-shadow duration-200 ${
        selected
          ? 'border-blue-500 shadow-blue-200 shadow-xl'
          : 'border-amber-200 hover:border-amber-400'
      }`}
      style={{ width: 180, minHeight: 72, padding: '10px 12px' }}
    >
      {/* 参加エッジ用ハンドル（source） */}
      <Handle
        type="source"
        id="participation-source"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white !rounded-full"
        style={{ top: -6 }}
      />

      {/* 参加エッジ用ハンドル（target） */}
      <Handle
        type="target"
        id="participation-target"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white !rounded-full"
        style={{ bottom: -6 }}
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
