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

  // dual-directed用の平行線を計算
  const dx = targetPoint.x - sourcePoint.x;
  const dy = targetPoint.y - sourcePoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // dual-directedの場合のみオフセット計算を行う
  const isDualDirected = edgeData?.type === 'dual-directed';
  // 垂直方向の単位ベクトル（時計回りに90度回転）
  // lengthが0の場合は0除算を避けてオフセット無し（単一路線）にフォールバック
  const perpX = isDualDirected && length !== 0 ? -dy / length : 0;
  const perpY = isDualDirected && length !== 0 ? dx / length : 0;

  // オフセット距離（2本の線の間隔）
  const offset = 8;

  // 上側の線（source→target）
  const topSourceX = sourcePoint.x + perpX * offset;
  const topSourceY = sourcePoint.y + perpY * offset;
  const topTargetX = targetPoint.x + perpX * offset;
  const topTargetY = targetPoint.y + perpY * offset;

  // 下側の線（target→source）
  const bottomSourceX = sourcePoint.x - perpX * offset;
  const bottomSourceY = sourcePoint.y - perpY * offset;
  const bottomTargetX = targetPoint.x - perpX * offset;
  const bottomTargetY = targetPoint.y - perpY * offset;

  // 各線のパスとラベル位置を計算
  const [topPath, topLabelX, topLabelY] = getStraightPath({
    sourceX: topSourceX,
    sourceY: topSourceY,
    targetX: topTargetX,
    targetY: topTargetY,
  });

  const [bottomPath, bottomLabelX, bottomLabelY] = getStraightPath({
    sourceX: bottomTargetX,
    sourceY: bottomTargetY,
    targetX: bottomSourceX,
    targetY: bottomSourceY,
  });

  /**
   * 削除ボタンのクリックハンドラ
   * @param e - マウスイベント
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeRelationship(id);
  };

  // マーカーの設定
  const markerEnd =
    edgeData.type === 'undirected' ? undefined : 'url(#arrow)';
  const markerStart =
    edgeData.type === 'bidirectional' || edgeData.type === 'dual-directed'
      ? 'url(#arrow)'
      : undefined;

  return (
    <>
      {edgeData.type === 'dual-directed' ? (
        // dual-directed: 2本の平行な片方向矢印
        <>
          {/* 上側の線（source→target） */}
          <BaseEdge
            id={`${id}-top`}
            path={topPath}
            style={{
              stroke: '#3b82f6',
              strokeWidth: 2,
            }}
            markerEnd="url(#arrow-blue)"
          />

          {/* 下側の線（target→source） */}
          <BaseEdge
            id={`${id}-bottom`}
            path={bottomPath}
            style={{
              stroke: '#10b981',
              strokeWidth: 2,
            }}
            markerEnd="url(#arrow-green)"
          />
        </>
      ) : (
        // bidirectional / one-way / undirected: 1本のエッジ
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: '#64748b',
            strokeWidth: 2.5,
          }}
          markerEnd={markerEnd}
          markerStart={markerStart}
        />
      )}

      {/* ラベルと削除ボタン */}
      <EdgeLabelRenderer>
        {edgeData.type === 'dual-directed' ? (
          // dual-directed: 2つのラベルを各線の近くに表示
          <>
            {/* source→targetのラベル（上側の線） */}
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${topLabelX}px,${topLabelY}px)`,
                pointerEvents: 'all',
              }}
              className="flex items-center gap-1.5"
            >
              <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full shadow-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-200">
                <div className="text-xs font-semibold text-blue-800">
                  {edgeData.sourceToTargetLabel}
                </div>
              </div>
            </div>

            {/* target→sourceのラベル（下側の線） */}
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${bottomLabelX}px,${bottomLabelY}px)`,
                pointerEvents: 'all',
              }}
              className="flex items-center gap-1.5"
            >
              <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full shadow-lg border-2 border-green-200 hover:border-green-400 hover:shadow-xl transition-all duration-200">
                <div className="text-xs font-semibold text-green-800">
                  {edgeData.targetToSourceLabel}
                </div>
              </div>
            </div>

            {/* 削除ボタン（中央） */}
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
            >
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
          </>
        ) : (
          // bidirectional / one-way / undirected: 1つのラベルを中央に表示
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
                {edgeData.sourceToTargetLabel}
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
        )}
      </EdgeLabelRenderer>

      {/* 矢印マーカー定義 */}
      <defs>
        {/* 通常の矢印（グレー） */}
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

        {/* dual-directed用の矢印（青） */}
        <marker
          id="arrow-blue"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
        </marker>

        {/* dual-directed用の矢印（緑） */}
        <marker
          id="arrow-green"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
        </marker>
      </defs>
    </>
  );
});

RelationshipEdge.displayName = 'RelationshipEdge';
