/**
 * RelationshipEdgeコンポーネント
 * 人物間の関係を表示するカスタムエッジ
 * EdgeLabelRendererを使用してラベルと削除ボタンを表示
 * ノードの境界との交点を計算して最短距離で接続します
 */

'use client';

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getStraightPath,
  useReactFlow,
} from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { getEdgeIntersectionPoints } from '@/lib/node-intersection';
import type { RelationshipEdgeData } from '@/types/graph';

/**
 * 関係エッジコンポーネント
 * @param props - エッジのプロパティ
 */
export const RelationshipEdge = memo((props: EdgeProps) => {
  const { id, source, target, data } = props;

  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const edgeData = data as RelationshipEdgeData;

  // React Flowからノード情報を取得
  const { getNode } = useReactFlow();
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  // ノードが見つからない場合は何も描画しない
  if (!sourceNode || !targetNode) {
    return null;
  }

  // ノードの境界との交点を計算
  const { sourcePoint, targetPoint } = getEdgeIntersectionPoints(
    sourceNode,
    targetNode
  );

  // 直線のパスとラベル位置を計算
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
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
          stroke: '#64748b',
          strokeWidth: 2.5,
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
          className="flex items-center gap-1.5 group/edge"
        >
          {/* ラベルバッジ */}
          <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full shadow-lg border-2 border-blue-200 group-hover/edge:border-blue-400 group-hover/edge:shadow-xl transition-all duration-200">
            <div className="text-xs font-semibold text-blue-800">
              {edgeData.label}
            </div>
          </div>

          {/* 削除ボタン */}
          <button
            onClick={handleDelete}
            className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
            aria-label="関係を削除"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
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
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
      </defs>
    </>
  );
});

RelationshipEdge.displayName = 'RelationshipEdge';
