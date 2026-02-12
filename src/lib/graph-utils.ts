/**
 * グラフ変換ユーティリティ
 * Person/RelationshipをReact FlowのNode/Edgeに変換する
 */

import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';
import type { GraphNode, RelationshipEdge } from '@/types/graph';
import { getRelationshipDisplayType } from './relationship-utils';

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
 * Relationship配列をRelationshipEdge配列に変換する
 * @param relationships - 変換対象のRelationship配列
 * @returns RelationshipEdge配列
 */
export function relationshipsToEdges(
  relationships: Relationship[]
): RelationshipEdge[] {
  return relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.sourcePersonId,
    target: relationship.targetPersonId,
    type: 'relationship' as const,
    data: {
      displayType: getRelationshipDisplayType(relationship),
      sourceToTargetLabel: relationship.sourceToTargetLabel,
      targetToSourceLabel: relationship.targetToSourceLabel,
    },
  }));
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
