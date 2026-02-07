/**
 * グラフ変換ユーティリティ
 * Person/RelationshipをReact FlowのNode/Edgeに変換する
 */

import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';
import type { PersonNode, RelationshipEdge } from '@/types/graph';

/**
 * Person配列をPersonNode配列に変換する
 * @param persons - 変換対象のPerson配列
 * @returns PersonNode配列。初期位置は(0, 0)に設定される
 */
export function personsToNodes(persons: Person[]): PersonNode[] {
  return persons.map((person) => ({
    id: person.id,
    type: 'person' as const,
    data: {
      name: person.name,
      imageDataUrl: person.imageDataUrl,
    },
    position: { x: 0, y: 0 },
  }));
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
      type: relationship.type,
      sourceToTargetLabel: relationship.sourceToTargetLabel,
      targetToSourceLabel: relationship.targetToSourceLabel,
    },
  }));
}
