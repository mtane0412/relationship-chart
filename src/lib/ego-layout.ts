/**
 * EGO Network放射状レイアウト
 * 中心ノードからのグラフ距離に基づいて、ノードを放射状に配置する
 */

import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

/**
 * EGO Layoutのパラメータ型
 */
export type EgoLayoutParams = {
  /** リング間の距離（ピクセル） */
  ringSpacing: number;
  /** 最初のリングの半径（ピクセル） */
  firstRingRadius: number;
};

/**
 * EGO Layoutのデフォルトパラメータ
 */
export const DEFAULT_EGO_LAYOUT_PARAMS: EgoLayoutParams = {
  ringSpacing: 200,
  firstRingRadius: 200,
};

/**
 * 隣接リストを構築する（無向グラフとして扱う）
 * @param relationships - 関係のリスト
 * @returns personId → 隣接ノードIDのSet のMap
 */
function buildAdjacencyList(relationships: Relationship[]): Map<string, Set<string>> {
  const adjacencyList = new Map<string, Set<string>>();

  for (const rel of relationships) {
    const { sourcePersonId, targetPersonId } = rel;

    // source → target
    if (!adjacencyList.has(sourcePersonId)) {
      adjacencyList.set(sourcePersonId, new Set());
    }
    adjacencyList.get(sourcePersonId)!.add(targetPersonId);

    // target → source（無向グラフとして扱う）
    if (!adjacencyList.has(targetPersonId)) {
      adjacencyList.set(targetPersonId, new Set());
    }
    adjacencyList.get(targetPersonId)!.add(sourcePersonId);
  }

  return adjacencyList;
}

/**
 * BFS（幅優先探索）でEGOノードからの各ノードの最短グラフ距離を計算する
 * @param egoNodeId - 中心ノードのID
 * @param _persons - 人物のリスト（現在未使用だが、将来の拡張のために保持）
 * @param relationships - 関係のリスト
 * @returns personId → 距離 のMap（到達不可能なノードは含まれない）
 */
export function computeGraphDistances(
  egoNodeId: string,
  _persons: Person[],
  relationships: Relationship[]
): Map<string, number> {
  const distances = new Map<string, number>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; distance: number }> = [];

  // 隣接リストを構築
  const adjacencyList = buildAdjacencyList(relationships);

  // 中心ノードから開始
  queue.push({ id: egoNodeId, distance: 0 });
  visited.add(egoNodeId);
  distances.set(egoNodeId, 0);

  // BFSで探索
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacencyList.get(current.id) || new Set();

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const newDistance = current.distance + 1;
        distances.set(neighborId, newDistance);
        queue.push({ id: neighborId, distance: newDistance });
      }
    }
  }

  return distances;
}

/**
 * グラフ距離に基づいて、ノードを放射状に配置する
 * @param egoNodeId - 中心ノードのID
 * @param distances - computeGraphDistancesで計算した距離のMap
 * @param allPersonIds - すべての人物IDのリスト
 * @param params - レイアウトパラメータ
 * @param center - 中心座標
 * @returns personId → 位置 のMap
 */
export function computeRadialPositions(
  egoNodeId: string,
  distances: Map<string, number>,
  allPersonIds: string[],
  params: EgoLayoutParams,
  center: { x: number; y: number }
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // 中心ノードは指定した座標に配置
  positions.set(egoNodeId, { x: center.x, y: center.y });

  // 距離ごとにノードをグループ化
  const nodesByDistance = new Map<number, string[]>();

  for (const personId of allPersonIds) {
    if (personId === egoNodeId) continue;

    const distance = distances.get(personId);
    if (distance !== undefined) {
      // 到達可能なノード
      if (!nodesByDistance.has(distance)) {
        nodesByDistance.set(distance, []);
      }
      nodesByDistance.get(distance)!.push(personId);
    }
  }

  // 最外周の距離を計算（到達不可能なノードを配置するため）
  const maxDistance = nodesByDistance.size > 0 ? Math.max(...nodesByDistance.keys()) : 0;
  const unreachableDistance = maxDistance + 1;

  // 到達不可能なノードを最外周の外側に配置
  const unreachableNodes: string[] = [];
  for (const personId of allPersonIds) {
    if (personId === egoNodeId) continue;
    if (!distances.has(personId)) {
      unreachableNodes.push(personId);
    }
  }

  if (unreachableNodes.length > 0) {
    nodesByDistance.set(unreachableDistance, unreachableNodes);
  }

  // 各リングにノードを配置
  for (const [distance, nodeIds] of nodesByDistance) {
    const radius = params.firstRingRadius + (distance - 1) * params.ringSpacing;
    const nodeCount = nodeIds.length;

    // 各リングの開始角度を少しずらす（距離 * 30度）
    const startAngle = (distance * Math.PI) / 6;

    for (let i = 0; i < nodeCount; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / nodeCount;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      positions.set(nodeIds[i], { x, y });
    }
  }

  return positions;
}
