/**
 * グラフ変換ユーティリティ
 * Person/RelationshipをReact FlowのNode/Edgeに変換する
 */

import type { Person } from '@/types/person';
import type { Relationship, EdgeFilter } from '@/types/relationship';
import type { GraphNode, RelationshipEdge } from '@/types/graph';
import { deriveEdgeVisual } from './relationship-visual';

/**
 * Person配列をGraphNode配列に変換する
 * @param persons - 変換対象のPerson配列
 * @returns GraphNode配列。person.positionがある場合はそれを使用し、ない場合は(0, 0)に設定される
 */
export function personsToNodes(persons: Person[]): GraphNode[] {
  return persons.map((person) => {
    return {
      id: person.id,
      type: 'graph' as const,
      data: {
        name: person.name,
        imageDataUrl: person.imageDataUrl,
        labels: person.labels,
      },
      position: person.position ?? { x: 0, y: 0 },
    };
  });
}

/**
 * 2つのノードIDを順序に依存しない正規化されたペアキーに変換する
 * @param idA - ノードID A
 * @param idB - ノードID B
 * @returns ソート済みの "idA:idB" 形式のキー
 */
function getPairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join(':');
}

/**
 * エッジフィルタ条件に関係が一致するか判定する
 *
 * @param relationship - 判定対象の Relationship（v11）
 * @param filter - エッジフィルタ（タグフィルタ + 述語フィルタ）
 * @returns フィルタを通過すれば true
 *
 * @description
 * タグフィルタ: values が空なら全通過。mode='any' なら関係タグのいずれかが一致すればOK、
 *               mode='all' なら全フィルタタグが関係タグに含まれる必要がある。
 * 述語フィルタ: 全述語を AND で評価（1つでも失敗すれば除外）。
 *               定型数値が null/undefined の場合は述語を満たさないとみなす。
 */
export function matchesEdgeFilter(relationship: Relationship, filter: EdgeFilter): boolean {
  // タグフィルタ: values が空なら全通過
  if (filter.tags.values.length > 0) {
    // O(1)ルックアップのためにSetへ変換（配列のincludesはO(n)）
    const filterTagSet = new Set(filter.tags.values);
    const relTagSet = new Set(relationship.tags);
    if (filter.tags.mode === 'any') {
      // いずれか1つのタグが一致すればOK
      const hasMatch = relationship.tags.some((tag) => filterTagSet.has(tag));
      if (!hasMatch) return false;
    } else {
      // 全てのフィルタタグが relationship.tags に含まれる必要がある
      const allMatch = filter.tags.values.every((tag) => relTagSet.has(tag));
      if (!allMatch) return false;
    }
  }

  // 述語フィルタ: 全述語を AND 評価
  const props = relationship.properties;
  for (const pred of filter.predicates) {
    switch (pred.type) {
      case 'closeness_gte':
        if (props.closeness == null || props.closeness < pred.value) return false;
        break;
      case 'trust_gte':
        if (props.trust == null || props.trust < pred.value) return false;
        break;
      case 'tension_gte':
        if (props.tension == null || props.tension < pred.value) return false;
        break;
      case 'secrecy_gte':
        if (props.secrecy == null || props.secrecy < pred.value) return false;
        break;
      case 'edge_type_is':
        if (relationship.type !== pred.value) return false;
        break;
      default: {
        // 未知の述語タイプに対して exhaustive check を行う
        const _exhaustive: never = pred;
        throw new Error(`未知の述語タイプ: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  return true;
}

/**
 * Relationship 配列を RelationshipEdge 配列に変換する
 *
 * @param relationships - 変換対象の Relationship 配列（v11）
 * @param edgeFilter - エッジフィルタ（指定した場合は条件に一致する関係のみ変換）
 * @returns RelationshipEdge 配列
 *
 * @description
 * 同一ペア間に複数のエッジが存在する場合、edgeIndex/totalEdgesInPair を付与する。
 * source/target の順序に関わらず同一ペアとして扱う（getPairKey で正規化）。
 * この情報は RelationshipEdge コンポーネントの並列描画オフセット計算に使用される。
 * エッジの色・線幅・破線は deriveEdgeVisual で決定する。
 * edgeFilter が指定された場合は先にフィルタリングし、残った関係のみを変換する。
 */
export function relationshipsToEdges(relationships: Relationship[], edgeFilter?: EdgeFilter): RelationshipEdge[] {
  // edgeFilter が指定されている場合は先にフィルタリング
  const filtered = edgeFilter
    ? relationships.filter((r) => matchesEdgeFilter(r, edgeFilter))
    : relationships;

  // ペアキーごとのエッジ数をカウントする（source/targetの順序を無視）
  const pairCountMap = new Map<string, number>();
  for (const r of filtered) {
    const key = getPairKey(r.sourceId, r.targetId);
    pairCountMap.set(key, (pairCountMap.get(key) ?? 0) + 1);
  }

  // ペアキーごとのエッジインデックスを追跡する
  const pairIndexMap = new Map<string, number>();

  return filtered.map((relationship) => {
    const key = getPairKey(relationship.sourceId, relationship.targetId);
    const edgeIndex = pairIndexMap.get(key) ?? 0;
    pairIndexMap.set(key, edgeIndex + 1);
    const totalEdgesInPair = pairCountMap.get(key) ?? 1;

    return {
      id: relationship.id,
      source: relationship.sourceId,
      target: relationship.targetId,
      type: 'relationship' as const,
      data: {
        edgeType: relationship.type,
        label: relationship.label,
        symmetric: relationship.symmetric,
        visual: deriveEdgeVisual(relationship),
        edgeIndex,
        totalEdgesInPair,
      },
    };
  });
}

/**
 * 同一ペア間の並列エッジにおける垂直オフセット量を計算する
 * @param edgeIndex - ペア内でのエッジのインデックス（0始まり）
 * @param totalEdgesInPair - ペア内のエッジ総数
 * @param spacing - エッジ間の間隔（ピクセル）。デフォルト20
 * @returns 中央を0とした垂直オフセット量（ピクセル）
 *
 * @description
 * N本のエッジを均等配置する。中央点を0として対称に分布させる。
 * 例: N=2, spacing=20 → [-10, +10]
 * 例: N=3, spacing=20 → [-20, 0, +20]
 */
export function calculateParallelEdgeOffset(
  edgeIndex: number,
  totalEdgesInPair: number,
  spacing: number = 20
): number {
  if (totalEdgesInPair <= 1) {
    return 0;
  }
  // 中央点を0として均等配置: (i - (N-1)/2) * spacing
  return (edgeIndex - (totalEdgesInPair - 1) / 2) * spacing;
}

/**
 * React Flowのノード配列からMapを構築してストアの位置更新関数を呼ぶヘルパー
 * @param nodes - id と position を持つノード配列
 * @param updatePositions - ストアの位置更新関数
 */
export function syncNodePositionsToStore(
  nodes: Array<{ id: string; position: { x: number; y: number } }>,
  updatePositions: (positions: Map<string, { x: number; y: number }>) => void
): void {
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    positions.set(node.id, node.position);
  }
  updatePositions(positions);
}
