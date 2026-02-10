/**
 * 検索ロジック
 * 人物名と関係ラベルを部分一致検索する純粋関数
 */

import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

/**
 * 検索結果の型
 * @property kind - 'person': 人物、'relationship': 関係
 * @property id - 人物または関係のID
 * @property label - 表示用ラベル（人物名または関係ラベル）
 * @property nodeKind - 人物の場合のノード種別（'person' or 'item'）
 * @property sourcePersonId - 関係の場合の起点人物ID
 * @property targetPersonId - 関係の場合の終点人物ID
 */
export type SearchResult = {
  kind: 'person' | 'relationship';
  id: string;
  label: string;
  nodeKind?: 'person' | 'item';
  sourcePersonId?: string;
  targetPersonId?: string;
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
  relationships: Relationship[]
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
      nodeKind: (person.kind ?? 'person') as 'person' | 'item',
    }));

  // 関係を検索
  const relationshipResults: SearchResult[] = [];
  for (const rel of relationships) {
    // sourceToTargetLabelを検索
    if (rel.sourceToTargetLabel && rel.sourceToTargetLabel.toLowerCase().includes(lowerQuery)) {
      relationshipResults.push({
        kind: 'relationship',
        id: rel.id,
        label: rel.sourceToTargetLabel,
        sourcePersonId: rel.sourcePersonId,
        targetPersonId: rel.targetPersonId,
      });
    }

    // targetToSourceLabelを検索
    if (rel.targetToSourceLabel && rel.targetToSourceLabel.toLowerCase().includes(lowerQuery)) {
      relationshipResults.push({
        kind: 'relationship',
        id: rel.id,
        label: rel.targetToSourceLabel,
        sourcePersonId: rel.sourcePersonId,
        targetPersonId: rel.targetPersonId,
      });
    }
  }

  // 人物結果を先に、関係結果を後に結合し、最大20件に制限
  return [...personResults, ...relationshipResults].slice(0, MAX_RESULTS);
}
