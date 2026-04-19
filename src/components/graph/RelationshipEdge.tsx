/**
 * RelationshipEdgeコンポーネント
 * 人物間の関係を表示するカスタムエッジ（v11 プロパティグラフ方式）
 *
 * v11 の描画ルール:
 *   - symmetric: true → 矢印なし（無向表示）
 *   - symmetric: false → targetノードに矢印（有向表示）
 *   - label が null の場合は edgeType（エッジ型ラベル）を表示
 *
 * EdgeLabelRendererを使用してラベルと削除ボタンを表示
 * ノードの境界との交点を計算して最短距離で接続します
 */

'use client';

import { memo, useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import { calculateParallelEdgeOffset } from '@/lib/graph-utils';
import { getDiffEdgeStyle, getDiffMarkerKey } from '@/lib/diff-highlight';

/**
 * 関係エッジコンポーネント
 * @param props - エッジのプロパティ
 */
export const RelationshipEdge = memo((props: EdgeProps) => {
  const { id, source, target, data, selected } = props;

  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const edgeData = data as RelationshipEdgeData;

  // ホバー状態管理（削除ボタン表示用）
  const [isHovered, setIsHovered] = useState(false);
  // ホバー解除の遅延タイマー
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * ホバー開始ハンドラ
   * タイマーをクリアしてホバー状態を有効化
   */
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  /**
   * ホバー終了ハンドラ
   * 遅延後にホバー状態を無効化（削除ボタンへのマウス移動時間を確保）
   */
  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      hoverTimeoutRef.current = null;
    }, 100); // 100ms の遅延
  }, []);

  // クリーンアップ: コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // React Flowからノード情報を取得（Hooksは常に同じ順序で呼び出す必要がある）
  const { getNode } = useReactFlow();

  // edgeDataが存在しない場合は何も描画しない
  if (!edgeData) {
    return null;
  }

  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  // ノードの境界との交点を計算（useMemoでキャッシュして再計算を最小化）
  // Rules of Hooksに従い、early returnの前にuseMemoを呼び出す
  const { sourcePoint, targetPoint } = useMemo(() => {
    if (!sourceNode || !targetNode) {
      return { sourcePoint: { x: 0, y: 0 }, targetPoint: { x: 0, y: 0 } };
    }
    return getEdgeIntersectionPoints(sourceNode, targetNode);
  }, [
    sourceNode?.position.x,
    sourceNode?.position.y,
    sourceNode?.measured?.width,
    targetNode?.position.x,
    targetNode?.position.y,
    targetNode?.measured?.width,
  ]);

  // ノードが見つからない場合は何も描画しない
  if (!sourceNode || !targetNode) {
    return null;
  }

  // エッジの方向ベクトルと垂直単位ベクトルを計算（全エッジタイプで共通）
  const dx = targetPoint.x - sourcePoint.x;
  const dy = targetPoint.y - sourcePoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  // 垂直方向の単位ベクトル（時計回りに90度回転）
  // lengthが0の場合は0除算を避けてオフセット無し（単一路線）にフォールバック
  const perpX = length !== 0 ? -dy / length : 0;
  const perpY = length !== 0 ? dx / length : 0;

  // 同一ペア間の並列エッジオフセット計算
  // 複数エッジが重ならないよう垂直方向にずらす
  const pairOffset = calculateParallelEdgeOffset(
    edgeData.edgeIndex ?? 0,
    edgeData.totalEdgesInPair ?? 1
  );

  // ペアオフセットを適用した開始/終了点
  const offsetSourceX = sourcePoint.x + perpX * pairOffset;
  const offsetSourceY = sourcePoint.y + perpY * pairOffset;
  const offsetTargetX = targetPoint.x + perpX * pairOffset;
  const offsetTargetY = targetPoint.y + perpY * pairOffset;

  // 直線のパスとラベル位置を計算（ペアオフセット適用済み）
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: offsetSourceX,
    sourceY: offsetSourceY,
    targetX: offsetTargetX,
    targetY: offsetTargetY,
  });

  /**
   * 削除ボタンのクリックハンドラ
   * @param e - マウスイベント
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeRelationship(id);
  };

  // deriveEdgeVisual で導出された視覚属性を使用する
  const { color, strokeWidth: baseStrokeWidth, dashed, markerKey } = edgeData.visual;

  // diffハイライトスタイルを取得（タイムラインモードのスナップショット切り替え時に適用）
  const diffStyle = getDiffEdgeStyle(edgeData.diffStatus);
  const diffMarkerKey = getDiffMarkerKey(edgeData.diffStatus);

  // マーカーの設定（優先順位: selected > diffStatus > visual）
  const markerSuffix = selected ? 'blue' : (diffMarkerKey ?? markerKey);

  // v11: symmetric=true → 矢印なし（無向）、symmetric=false → targetに矢印（有向）
  const markerEnd = edgeData.symmetric ? undefined : `url(#arrow-${markerSuffix})`;

  // エッジのスタイル（優先順位: selected > diffStatus > visual）
  // 破線スタイル（secrecy >= 0.5 のとき破線）
  const strokeDasharray = dashed ? '8 4' : undefined;
  let edgeStyle: { stroke: string; strokeWidth: number; strokeDasharray: string | undefined };
  if (selected) {
    edgeStyle = { stroke: '#3b82f6', strokeWidth: 3.5, strokeDasharray };
  } else if (diffStyle) {
    // diffハイライト時はbaseStrokeWidthと比較して大きい方を採用する
    // （closeness=1.0 の4pxより細くなるケースを防ぐため）
    edgeStyle = { stroke: diffStyle.stroke, strokeWidth: Math.max(diffStyle.strokeWidth, baseStrokeWidth), strokeDasharray };
  } else {
    edgeStyle = { stroke: color, strokeWidth: baseStrokeWidth, strokeDasharray };
  }

  // 表示ラベル: label が null の場合は edgeType を使用
  const displayLabel = edgeData.label ?? edgeData.edgeType;

  return (
    <>
      {/* 1本のエッジ（v11ではすべて単線） */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />

      {/* ラベルと削除ボタン */}
      <EdgeLabelRenderer>
        {/* 外側コンテナ全体をホバー領域とすることで、ラベルがない場合も削除ボタンに到達できる */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex items-center gap-1.5"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* ラベル表示（ラベルなしの場合は透明なホバー領域で代替） */}
          {displayLabel ? (
            <div
              className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full shadow-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-200 cursor-pointer"
            >
              <div className="text-xs font-semibold text-blue-800">
                {displayLabel}
              </div>
            </div>
          ) : (
            // ラベルなしのとき: 削除ボタン表示トリガー用の透明ホバー領域
            <div className="w-4 h-4" />
          )}

          {/* 削除ボタン（ホバー時のみ表示） */}
          <button
            onClick={handleDelete}
            className={`w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 ${
              isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
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
    </>
  );
});

RelationshipEdge.displayName = 'RelationshipEdge';
