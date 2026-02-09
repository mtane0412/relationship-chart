/**
 * ConnectionLineコンポーネント
 * エッジをドラッグ中のプレビュー線を描画するカスタムコンポーネント
 * 実際のエッジと同じスタイル（グレー、アニメーションドットライン、矢印）で表示します
 */

'use client';

import { useMemo } from 'react';
import { ConnectionLineComponentProps, getStraightPath, useReactFlow } from '@xyflow/react';
import { getEdgeIntersectionPoints, PERSON_IMAGE_SIZE } from '@/lib/node-intersection';

/**
 * カスタム接続線コンポーネント
 * @param props - React Flowから渡される接続線のプロパティ
 */
export function ConnectionLine(props: ConnectionLineComponentProps) {
  const { fromNode, fromX, fromY, toX, toY } = props;

  const { getNode, getNodes } = useReactFlow();

  // toNodeが存在する場合（ノード上にホバーしている場合）、境界との交点を計算
  // toNodeが存在しない場合（空中をドラッグしている場合）、マウス位置をそのまま使用
  const { sourcePoint, targetPoint } = useMemo(() => {
    if (!fromNode) {
      return {
        sourcePoint: { x: fromX, y: fromY },
        targetPoint: { x: toX, y: toY },
      };
    }

    // toNodeを特定（現在のマウス位置に最も近いノード、接続可能なもの）
    // React Flowが自動的にtoNodeを渡してくれないので、手動で探す
    // ※ただし、ConnectionLineComponentPropsにはtoNodeがないため、
    // マウス位置(toX, toY)からgetNodeAtを使って推測する必要がある
    // しかし、getNodeAtは存在しないので、代わりにtoX, toYをそのまま使用する

    // fromNodeからの交点を計算（fromNode側のボーダー位置）
    // toNodeが不明な場合は、fromNodeの中心からマウス位置への線を計算
    const sourceNode = getNode(fromNode.id);
    if (!sourceNode) {
      return {
        sourcePoint: { x: fromX, y: fromY },
        targetPoint: { x: toX, y: toY },
      };
    }

    // toX, toYの位置にあるノードを探す
    const allNodes = getNodes();
    const targetNode = allNodes.find((node) => {
      if (node.id === fromNode.id) return false; // 自分自身は除外

      const nodeWidth = node.measured?.width ?? PERSON_IMAGE_SIZE;
      const nodeHeight = node.measured?.height ?? PERSON_IMAGE_SIZE;

      // ノードの範囲を計算（connectionRadius=60pxを考慮して拡張）
      const expandedMargin = 60;
      const left = node.position.x - expandedMargin;
      const right = node.position.x + nodeWidth + expandedMargin;
      const top = node.position.y - expandedMargin;
      const bottom = node.position.y + nodeHeight + expandedMargin;

      // マウス位置がノードの拡張範囲内にあるかチェック
      return toX >= left && toX <= right && toY >= top && toY <= bottom;
    });

    if (targetNode) {
      // ターゲットノードが見つかった場合、境界との交点を計算
      const points = getEdgeIntersectionPoints(sourceNode, targetNode);
      return {
        sourcePoint: points.sourcePoint,
        targetPoint: points.targetPoint,
      };
    }

    // ターゲットノードが見つからない場合、仮想ノードを使用
    const virtualTargetNode: {
      id: string;
      type?: string;
      position: { x: number; y: number };
      measured?: { width?: number; height?: number };
    } = {
      id: 'virtual-target',
      position: {
        x: toX - PERSON_IMAGE_SIZE / 2,
        y: toY - PERSON_IMAGE_SIZE / 2,
      },
      measured: {
        width: PERSON_IMAGE_SIZE,
        height: PERSON_IMAGE_SIZE,
      },
    };

    // 交点を計算
    const points = getEdgeIntersectionPoints(sourceNode, virtualTargetNode);

    return {
      sourcePoint: points.sourcePoint,
      targetPoint: points.targetPoint,
    };
  }, [fromNode, fromX, fromY, toX, toY, getNode, getNodes]);

  // 直線のパスを計算
  const [edgePath] = getStraightPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
  });

  return (
    <g>
      {/* アニメーションドットライン */}
      <path
        d={edgePath}
        fill="none"
        stroke="#64748b"
        strokeWidth={2}
        strokeDasharray="5 5"
        className="connection-line-animated"
        markerEnd="url(#arrow)"
      />

      {/* CSSアニメーション定義 */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
        .connection-line-animated {
          animation: dash 0.5s linear infinite;
        }
      `}</style>
    </g>
  );
}
