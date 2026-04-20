/**
 * ParticipationEdgeコンポーネント
 * エピソード↔人物の参加関係を表示するカスタムエッジ
 *
 * 設計方針:
 * - 破線（strokeDasharray）でRelationshipエッジと視覚的に区別
 * - グレー系の色で主張を抑える
 * - マーカーなし（向きを持たないエッジ）
 * - ノード境界との交点計算で正確な端点を算出（PersonNode/EpisodeNode両対応）
 */

'use client';

import { memo, useMemo } from 'react';
import { BaseEdge, EdgeProps, getStraightPath, useReactFlow } from '@xyflow/react';
import { getEdgeIntersectionPoints } from '@/lib/node-intersection';

/**
 * エピソード参加エッジコンポーネント
 * @param props - React Flowから渡されるエッジプロパティ
 */
export const ParticipationEdge = memo((props: EdgeProps) => {
  const { source, target } = props;
  const { getNode } = useReactFlow();

  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  // ノードの境界との交点を計算（キャッシュして再計算を最小化）
  const { sourcePoint, targetPoint } = useMemo(() => {
    if (!sourceNode || !targetNode) {
      return { sourcePoint: { x: 0, y: 0 }, targetPoint: { x: 0, y: 0 } };
    }
    return getEdgeIntersectionPoints(sourceNode, targetNode);
  }, [
    sourceNode?.position.x,
    sourceNode?.position.y,
    sourceNode?.measured?.width,
    sourceNode?.measured?.height,
    targetNode?.position.x,
    targetNode?.position.y,
    targetNode?.measured?.width,
    targetNode?.measured?.height,
  ]);

  if (!sourceNode || !targetNode) return null;

  const [edgePath] = getStraightPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
  });

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: '#9ca3af', // gray-400
        strokeWidth: 1.5,
        strokeDasharray: '5 4',
      }}
    />
  );
});

ParticipationEdge.displayName = 'ParticipationEdge';
