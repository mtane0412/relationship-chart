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
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { Node, Edge } from '@xyflow/react';

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
 *
 * useForceLayout({
 *   nodes,
 *   edges,
 *   enabled,
 *   onNodesChange: (updatedNodes) => setNodes(updatedNodes),
 * });
 * ```
 */
export function useForceLayout({
  nodes,
  edges,
  enabled,
  onNodesChange,
}: UseForceLayoutParams) {
  // シミュレーションのrefを保持
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simulationRef = useRef<ReturnType<typeof forceSimulation<any>> | null>(null);

  // ノードIDとエッジIDの構成を追跡するref
  const nodeIdsRef = useRef<string>('');
  const edgeIdsRef = useRef<string>('');

  useEffect(() => {
    // forceレイアウトが無効な場合は何もしない
    if (!enabled || nodes.length === 0) {
      // シミュレーションが存在する場合は停止
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      return;
    }

    // ノードIDとエッジIDの構成を計算
    const currentNodeIds = nodes.map((n) => n.id).sort().join(',');
    const currentEdgeIds = edges.map((e) => `${e.source}-${e.target}`).sort().join(',');

    // ID構成が変化したかチェック
    const nodeIdsChanged = currentNodeIds !== nodeIdsRef.current;
    const edgeIdsChanged = currentEdgeIds !== edgeIdsRef.current;
    const structureChanged = nodeIdsChanged || edgeIdsChanged;

    // ノードをコピーしてd3-force用に変換
    const forceNodes: ForceNode[] = nodes.map((node) => ({
      ...node,
      x: node.position.x,
      y: node.position.y,
    }));

    // エッジをd3-force用に変換
    const forceLinks: ForceLink[] = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

    // ID構成が変化した場合のみシミュレーションを再作成
    if (structureChanged || !simulationRef.current) {
      // 既存シミュレーションを停止
      if (simulationRef.current) {
        simulationRef.current.stop();
      }

      // シミュレーションを初期化
      const simulation = forceSimulation(forceNodes)
        // 関係（エッジ）に基づく引力
        .force(
          'link',
          forceLink<ForceNode, ForceLink>(forceLinks)
            .id((d) => (d as Node).id)
            .distance(150) // ノード間の距離
            .strength(0.5) // 引力の強さ
        )
        // ノード間の反発力
        .force(
          'charge',
          forceManyBody<ForceNode>()
            .strength(-300) // 反発力の強さ（負の値）
        )
        // 中心への引力
        .force('center', forceCenter(400, 400))
        // アルファ減衰率（アニメーションの減速率）
        .alphaDecay(0.02);

      // tickイベント: シミュレーションの各ステップで実行
      simulation.on('tick', () => {
        // ノード位置を更新
        const updatedNodes = forceNodes.map((forceNode) => ({
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
    } else {
      // ID構成が変わらない場合は既存シミュレーションのノード位置のみ同期
      const currentSimNodes = simulationRef.current.nodes();
      nodes.forEach((node) => {
        const simNode = currentSimNodes.find((n) => (n as Node).id === node.id);
        if (simNode && !simNode.fx && !simNode.fy) {
          // ドラッグ中（fx/fyが設定されている）でない場合のみ位置を同期
          simNode.x = node.position.x;
          simNode.y = node.position.y;
        }
      });
    }

    // クリーンアップ: シミュレーションを停止
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [nodes, edges, enabled, onNodesChange]);

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
