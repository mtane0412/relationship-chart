/**
 * RelationshipEdgeコンポーネント
 * 人物間の関係を表示するカスタムエッジ
 * EdgeLabelRendererを使用してラベルと削除ボタンを表示
 */

'use client';

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import type { RelationshipEdgeData } from '@/types/graph';

/**
 * 関係エッジコンポーネント
 * @param props - エッジのプロパティ
 */
export const RelationshipEdge = memo((props: EdgeProps) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const edgeData = data as RelationshipEdgeData;

  // ベジェ曲線のパスとラベル位置を計算
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  /**
   * 削除ボタンのクリックハンドラ
   * @param e - マウスイベント
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeRelationship(id);
  };

  return (
    <>
      {/* エッジ本体 */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#94a3b8',
          strokeWidth: 2,
        }}
        markerEnd={edgeData.isDirected ? 'url(#arrow)' : undefined}
      />

      {/* ラベルと削除ボタン */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex items-center gap-1"
        >
          {/* ラベルバッジ */}
          <div className="px-2 py-1 bg-white rounded-md shadow-md border border-gray-200">
            <div className="text-xs font-medium text-gray-700">
              {edgeData.label}
            </div>
          </div>

          {/* 削除ボタン */}
          <button
            onClick={handleDelete}
            className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
            aria-label="関係を削除"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </EdgeLabelRenderer>

      {/* 矢印マーカー定義（方向性のある関係用） */}
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>
    </>
  );
});

RelationshipEdge.displayName = 'RelationshipEdge';
