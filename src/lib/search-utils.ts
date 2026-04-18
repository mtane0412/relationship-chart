/**
 * 検索ロジック
 * 人物名と関係ラベルを部分一致検索する純粋関数
 */

import type { Person } from '@/types/person';
import type { RelationshipV9, RelationshipType } from '@/types/relationship';
import { getRelationshipDisplayType } from './relationship-utils';

/**
 * 検索結果の型
 * @property kind - 'person': 人物、'relationship': 関係（SearchResult固有の概念）
 * @property id - 人物または関係のID
 * @property label - 表示用ラベル（人物名または関係ラベル）
 * @property nodeLabels - 人物の場合のノードラベル配列
 * @property imageDataUrl - 人物/物の画像URL
 * @property sourcePersonId - 関係の場合の起点人物ID
 * @property targetPersonId - 関係の場合の終点人物ID
 * @property relationshipType - 関係の表示タイプ
 * @property sourceImageDataUrl - 関係の場合の起点人物の画像URL
 * @property targetImageDataUrl - 関係の場合の終点人物の画像URL
 * @property sourceNodeLabels - 関係の場合の起点人物のノードラベル配列
 * @property targetNodeLabels - 関係の場合の終点人物のノードラベル配列
 */
export type SearchResult = {
  kind: 'person' | 'relationship';
  id: string;
  label: string;
  nodeLabels?: string[];
  imageDataUrl?: string;
  sourcePersonId?: string;
  targetPersonId?: string;
  relationshipType?: RelationshipType;
  sourceImageDataUrl?: string;
  targetImageDataUrl?: string;
  sourceNodeLabels?: string[];
  targetNodeLabels?: string[];
};

/**
 * 検索クエリの最大結果件数
 */
const MAX_RESULTS = 20;

/**
 * グラフ内を検索する
 * @param query - 検索クエリ（大文字小文字を区別しない部分一致）
 * @param persons - 人物の配列
 * @param relationships - 関係の配列
 * @returns 検索結果の配列（人物結果が先、関係結果が後、最大20件）
 */
export function searchGraph(
  query: string,
  persons: Person[],
  relationships: RelationshipV9[]
): SearchResult[] {
  // 空クエリの場合は空配列を返す
  const trimmedQuery = query.trim();
  if (trimmedQuery === '') {
    return [];
  }

  // 大文字小文字を区別しない検索のため小文字に変換
  const lowerQuery = trimmedQuery.toLowerCase();

  // 人物を検索
  const personResults: SearchResult[] = persons
    .filter((person) => person.name.toLowerCase().includes(lowerQuery))
    .map((person) => ({
      kind: 'person' as const,
      id: person.id,
      label: person.name,
      nodeLabels: person.labels ?? ['人物'],
      imageDataUrl: person.imageDataUrl,
    }));

  // 人物IDからPersonへのマップを作成（パフォーマンス最適化）
  const personMap = new Map(persons.map((p) => [p.id, p]));

  // 関係を検索
  const relationshipResults: SearchResult[] = [];
  for (const rel of relationships) {
    // 起点と終点の人物を検索
    const sourcePerson = personMap.get(rel.sourcePersonId);
    const targetPerson = personMap.get(rel.targetPersonId);

    const matchedLabels = new Set<string>();

    const displayType = getRelationshipDisplayType(rel);

    // forward.label（source→target方向ラベル）を検索
    if (rel.forward.label && rel.forward.label.toLowerCase().includes(lowerQuery)) {
      matchedLabels.add(rel.forward.label);
      relationshipResults.push({
        kind: 'relationship',
        id: rel.id,
        label: rel.forward.label,
        sourcePersonId: rel.sourcePersonId,
        targetPersonId: rel.targetPersonId,
        relationshipType: displayType,
        sourceImageDataUrl: sourcePerson?.imageDataUrl,
        targetImageDataUrl: targetPerson?.imageDataUrl,
        sourceNodeLabels: sourcePerson?.labels ?? ['人物'],
        targetNodeLabels: targetPerson?.labels ?? ['人物'],
      });
    }

    // reverse.label（target→source方向ラベル）を検索（forward.labelと異なる場合のみ追加）
    if (
      rel.reverse.label &&
      rel.reverse.label.toLowerCase().includes(lowerQuery) &&
      !matchedLabels.has(rel.reverse.label)
    ) {
      // 逆方向のラベルなので、起点と終点を入れ替えて表示
      relationshipResults.push({
        kind: 'relationship',
        id: rel.id,
        label: rel.reverse.label,
        sourcePersonId: rel.targetPersonId,
        targetPersonId: rel.sourcePersonId,
        relationshipType: displayType,
        sourceImageDataUrl: targetPerson?.imageDataUrl,
        targetImageDataUrl: sourcePerson?.imageDataUrl,
        sourceNodeLabels: targetPerson?.labels ?? ['人物'],
        targetNodeLabels: sourcePerson?.labels ?? ['人物'],
      });
    }
  }

  // 人物結果を先に、関係結果を後に結合し、最大20件に制限
  return [...personResults, ...relationshipResults].slice(0, MAX_RESULTS);
}
