/**
 * useForceLayoutカスタムフック
 * d3-forceを使ったforce-directedレイアウトアニメーション
 */

import { useEffect, useRef } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { Node, Edge } from '@xyflow/react';
import type { ForceParams } from '@/stores/useGraphStore';
import {
  COLLISION_MARGIN,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
} from '@/lib/collision-resolver';

/**
 * d3-force用のノード型
 * React FlowのNodeとd3-forceのSimulationNodeDatumを統合
 */
type ForceNode = Node & SimulationNodeDatum;

/**
 * d3-force用のエッジ型
 * React FlowのEdgeとd3-forceのSimulationLinkDatumを統合
 */
type ForceLink = SimulationLinkDatum<ForceNode> & {
  source: string;
  target: string;
};

/**
 * useForceLayoutフックのパラメータ
 */
type UseForceLayoutParams = {
  /** React Flowのノード配列 */
  nodes: Node[];
  /** React Flowのエッジ配列 */
  edges: Edge[];
  /** forceレイアウトを有効にするかどうか */
  enabled: boolean;
  /** ノード位置更新のコールバック */
  onNodesChange: (nodes: Node[]) => void;
  /** force-directedレイアウトのパラメータ */
  forceParams: ForceParams;
};

/**
 * force-directedレイアウトアニメーションを管理するカスタムフック
 *
 * @param params - フックのパラメータ
 *
 * @description
 * d3-forceのforceSimulationを使用して、ノードを物理シミュレーションで配置します。
 *
 * - forceLink: 関係（エッジ）に基づく引力
 * - forceManyBody: ノード間の反発力
 * - forceCenter: 中心への引力
 *
 * @example
 * ```tsx
 * const [enabled, setEnabled] = useState(true);
 * const forceParams = useGraphStore((state) => state.forceParams);
 *
 * useForceLayout({
 *   nodes,
 *   edges,
 *   enabled,
 *   onNodesChange: (updatedNodes) => setNodes(updatedNodes),
 *   forceParams,
 * });
 * ```
 */
export function useForceLayout({
  nodes,
  edges,
  enabled,
  onNodesChange,
  forceParams,
}: UseForceLayoutParams) {
  // シミュレーションのrefを保持
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simulationRef = useRef<ReturnType<typeof forceSimulation<any>> | null>(null);

  // ノードIDとエッジIDの構成を追跡するref
  const nodeIdsRef = useRef<string>('');
  const edgeIdsRef = useRef<string>('');

  // ノードとエッジをrefで保持（依存配列から除外するため）
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const forceParamsRef = useRef<ForceParams>(forceParams);

  // 最新の値をrefに保存
  nodesRef.current = nodes;
  edgesRef.current = edges;
  forceParamsRef.current = forceParams;

  useEffect(() => {
    // forceレイアウトが無効な場合はシミュレーションを停止
    if (!enabled) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
        nodeIdsRef.current = '';
        edgeIdsRef.current = '';
      }
      return;
    }

    // ノードが空の場合は何もしない
    if (nodesRef.current.length === 0) {
      return;
    }

    // ノードIDとエッジIDの構成を計算
    const currentNodeIds = nodesRef.current.map((n) => n.id).sort().join(',');
    const currentEdgeIds = edgesRef.current.map((e) => `${e.source}-${e.target}`).sort().join(',');

    // ID構成が変化したかチェック
    const nodeIdsChanged = currentNodeIds !== nodeIdsRef.current;
    const edgeIdsChanged = currentEdgeIds !== edgeIdsRef.current;
    const structureChanged = nodeIdsChanged || edgeIdsChanged;

    // ID構成が変化した場合のみシミュレーションを再作成
    if (structureChanged || !simulationRef.current) {
      // 既存シミュレーションを停止
      if (simulationRef.current) {
        simulationRef.current.stop();
      }

      // ノードをコピーしてd3-force用に変換
      const forceNodes: ForceNode[] = nodesRef.current.map((node) => ({
        ...node,
        x: node.position.x,
        y: node.position.y,
      }));

      // エッジをd3-force用に変換
      const forceLinks: ForceLink[] = edgesRef.current.map((edge) => ({
        source: edge.source,
        target: edge.target,
      }));

      // シミュレーションを初期化
      const simulation = forceSimulation(forceNodes)
        // 関係（エッジ）に基づく引力
        .force(
          'link',
          forceLink<ForceNode, ForceLink>(forceLinks)
            .id((d) => (d as Node).id)
            .distance(forceParamsRef.current.linkDistance) // ノード間の距離
            .strength(forceParamsRef.current.linkStrength) // 引力の強さ
        )
        // ノード間の反発力
        .force(
          'charge',
          forceManyBody<ForceNode>()
            .strength(forceParamsRef.current.chargeStrength) // 反発力の強さ（負の値）
        )
        // ノード間の衝突防止（物理的なサイズを考慮）
        .force(
          'collide',
          forceCollide<ForceNode>()
            .radius((d) => {
              // ノードの実際のサイズを取得（measured があれば優先、なければデフォルト値）
              const node = d as Node;
              const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
              const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
              // 半径として最大辺を使用し、COLLISIONMARGINを追加
              // 注意: forceCollideは円形の衝突判定のため、矩形ノードの短辺方向には余分な余白が生じる
              return Math.max(width, height) / 2 + COLLISION_MARGIN;
            })
            .strength(0.7) // 衝突解消の強さ
            .iterations(2) // 各tick内での反復回数
        )
        // 中心への引力
        .force('center', forceCenter(400, 400))
        // アルファ減衰率（アニメーションの減速率）
        .alphaDecay(0.02);

      // tickイベント: シミュレーションの各ステップで実行
      simulation.on('tick', () => {
        // ノード位置を更新
        const updatedNodes = simulation.nodes().map((forceNode) => ({
          ...forceNode,
          position: {
            x: forceNode.x ?? 0,
            y: forceNode.y ?? 0,
          },
        }));

        onNodesChange(updatedNodes);
      });

      // refに保存
      simulationRef.current = simulation;
      nodeIdsRef.current = currentNodeIds;
      edgeIdsRef.current = currentEdgeIds;
    }

    // クリーンアップ: enabledがfalseになった時とアンマウント時のみシミュレーションを停止
    // 構造変化によるeffect再実行時は停止しない（新しいシミュレーションが既に作成されているため）
    return () => {
      // enabledがfalseになる場合はシミュレーションを停止
      if (!enabled && simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [enabled, onNodesChange]);

  // forceParamsが変更された時にシミュレーションを動的更新
  useEffect(() => {
    if (!enabled || !simulationRef.current) {
      return;
    }

    // 既存のforceを動的に更新
    const linkForce = simulationRef.current.force('link') as ReturnType<typeof forceLink<ForceNode, ForceLink>> | undefined;
    const chargeForce = simulationRef.current.force('charge') as ReturnType<typeof forceManyBody<ForceNode>> | undefined;

    if (linkForce) {
      linkForce.distance(forceParamsRef.current.linkDistance);
      linkForce.strength(forceParamsRef.current.linkStrength);
    }

    if (chargeForce) {
      chargeForce.strength(forceParamsRef.current.chargeStrength);
    }

    // シミュレーションを再加熱（パラメータ変更を反映）
    simulationRef.current.alpha(0.3).restart();
  }, [enabled, forceParams]);

  // ノードドラッグ開始時のハンドラ
  const handleNodeDragStart = (nodeId: string) => {
    if (!simulationRef.current) return;

    // シミュレーションを再加熱（アニメーションを再開）
    simulationRef.current.alphaTarget(0.3).restart();

    // ドラッグ中のノードを固定
    const node = simulationRef.current.nodes().find((n) => (n as Node).id === nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
  };

  // ノードドラッグ中のハンドラ
  const handleNodeDrag = (nodeId: string, position: { x: number; y: number }) => {
    if (!simulationRef.current) return;

    // ドラッグ中のノードの位置を更新
    const node = simulationRef.current.nodes().find((n) => (n as Node).id === nodeId);
    if (node) {
      node.fx = position.x;
      node.fy = position.y;
    }
  };

  // ノードドラッグ終了時のハンドラ
  const handleNodeDragEnd = (nodeId: string) => {
    if (!simulationRef.current) return;

    // シミュレーションを冷却（アニメーションを減速）
    simulationRef.current.alphaTarget(0);

    // ノードの固定を解除
    const node = simulationRef.current.nodes().find((n) => (n as Node).id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  };

  return {
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragEnd,
  };
}
