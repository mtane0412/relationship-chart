/**
 * グラフ変換ユーティリティ
 * Person/RelationshipをReact FlowのNode/Edgeに変換する
 */

import type { Person } from '@/types/person';
import type { RelationshipV9, RelationshipType, EdgeFilter } from '@/types/relationship';
import type { GraphNode, RelationshipEdge } from '@/types/graph';
import { deriveEdgeVisual } from './relationship-visual';

/**
 * v9 形式の関係から表示タイプを導出する
 *
 * @param rel - RelationshipV9
 * @returns RelationshipType
 */
function getV9DisplayType(rel: RelationshipV9): RelationshipType {
  if (!rel.isDirected) return 'undirected';
  const hasFwd = rel.forward.label !== null;
  const hasRev = rel.reverse.label !== null;
  if (hasFwd && hasRev) {
    return rel.forward.label === rel.reverse.label ? 'bidirectional' : 'dual-directed';
  }
  return 'one-way';
}

/**
 * Person配列をGraphNode配列（PersonNodeまたはItemNode）に変換する
 * @param persons - 変換対象のPerson配列
 * @returns GraphNode配列。person.positionがある場合はそれを使用し、ない場合は(0, 0)に設定される
 */
export function personsToNodes(persons: Person[]): GraphNode[] {
  return persons.map((person) => {
    // kindが未設定の場合は'person'として扱う
    const kind = person.kind ?? 'person';
    const nodeType = kind === 'item' ? ('item' as const) : ('person' as const);

    return {
      id: person.id,
      type: nodeType,
      data: {
        name: person.name,
        imageDataUrl: person.imageDataUrl,
        kind,
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
 * @param relationship - 判定対象の RelationshipV9
 * @param filter - エッジフィルタ（タグフィルタ + 述語フィルタ）
 * @returns フィルタを通過すれば true
 *
 * @description
 * タグフィルタ: values が空なら全通過。mode='any' なら関係タグのいずれかが一致すればOK、
 *               mode='all' なら全フィルタタグが関係タグに含まれる必要がある。
 * 述語フィルタ: 全述語を AND で評価（1つでも失敗すれば除外）。
 *               定型数値が null の場合は述語を満たさないとみなす。
 */
export function matchesEdgeFilter(relationship: RelationshipV9, filter: EdgeFilter): boolean {
  // タグフィルタ: values が空なら全通過
  if (filter.tags.values.size > 0) {
    if (filter.tags.mode === 'any') {
      // いずれか1つのタグが一致すればOK
      const hasMatch = relationship.tags.some((tag) => filter.tags.values.has(tag));
      if (!hasMatch) return false;
    } else {
      // 全てのフィルタタグが relationship.tags に含まれる必要がある
      const allMatch = [...filter.tags.values].every((tag) => relationship.tags.includes(tag));
      if (!allMatch) return false;
    }
  }

  // 述語フィルタ: 全述語を AND 評価
  for (const pred of filter.predicates) {
    switch (pred.type) {
      case 'closeness_gte':
        if (relationship.symmetric.closeness === null || relationship.symmetric.closeness < pred.value) return false;
        break;
      case 'trust_gte':
        if (relationship.symmetric.trust === null || relationship.symmetric.trust < pred.value) return false;
        break;
      case 'tension_gte':
        if (relationship.symmetric.tension === null || relationship.symmetric.tension < pred.value) return false;
        break;
      case 'secrecy_gte':
        if (relationship.symmetric.secrecy === null || relationship.symmetric.secrecy < pred.value) return false;
        break;
      case 'has_kinship':
        if (relationship.symmetric.kinship === null) return false;
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
 * RelationshipV9 配列を RelationshipEdge 配列に変換する
 *
 * @param relationships - 変換対象の RelationshipV9 配列
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
export function relationshipsToEdges(relationships: RelationshipV9[], edgeFilter?: EdgeFilter): RelationshipEdge[] {
  // edgeFilter が指定されている場合は先にフィルタリング
  const filtered = edgeFilter
    ? relationships.filter((r) => matchesEdgeFilter(r, edgeFilter))
    : relationships;

  // ペアキーごとのエッジ数をカウントする（source/targetの順序を無視）
  const pairCountMap = new Map<string, number>();
  for (const r of filtered) {
    const key = getPairKey(r.sourcePersonId, r.targetPersonId);
    pairCountMap.set(key, (pairCountMap.get(key) ?? 0) + 1);
  }

  // ペアキーごとのエッジインデックスを追跡する
  const pairIndexMap = new Map<string, number>();

  return filtered.map((relationship) => {
    const key = getPairKey(relationship.sourcePersonId, relationship.targetPersonId);
    const edgeIndex = pairIndexMap.get(key) ?? 0;
    pairIndexMap.set(key, edgeIndex + 1);
    const totalEdgesInPair = pairCountMap.get(key) ?? 1;

    return {
      id: relationship.id,
      source: relationship.sourcePersonId,
      target: relationship.targetPersonId,
      type: 'relationship' as const,
      data: {
        displayType: getV9DisplayType(relationship),
        forwardLabel: relationship.forward.label,
        reverseLabel: relationship.reverse.label,
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
