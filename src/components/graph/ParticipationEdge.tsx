/**
 * ParticipationEdgeコンポーネント
 * エピソード↔人物の参加関係を表示するカスタムエッジ
 *
 * 設計方針:
 * - 破線（strokeDasharray）でRelationshipエッジと視覚的に区別
 * - グレー系の色で主張を抑える
 * - マーカーなし（向きを持たないエッジ）
 */

'use client';

import { memo } from 'react';
import { BaseEdge, EdgeProps, getStraightPath } from '@xyflow/react';

/**
 * エピソード参加エッジコンポーネント
 * @param props - React Flowから渡されるエッジプロパティ
 */
export const ParticipationEdge = memo((props: EdgeProps) => {
  const { sourceX, sourceY, targetX, targetY } = props;

  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
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
