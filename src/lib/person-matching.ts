/**
 * 人物マッチングユーティリティ
 *
 * LLM が出力した人物名と既存人物を照合し、
 * 抽出結果をストア投入用データ（addPerson / addRelationship の引数形式）に変換する。
 *
 * マッチング方式: 正規化済み完全一致
 *   - trim
 *   - 連続する空白（全角・半角）を半角スペース 1 つに正規化
 *   - 大文字小文字を無視
 */

import { nanoid } from 'nanoid';
import type { Person } from '@/types/person';
import type { RelationshipV9 } from '@/types/relationship';
import type { LlmExtractionResult } from './llm-extraction-schema';

/**
 * 人物名を正規化する（マッチング用）
 * @param name - 正規化対象の名前
 * @returns 正規化後の名前
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/[\s\u3000]+/g, ' ') // 全角スペース・連続スペースを半角スペース1つに
    .toLowerCase();
}

/**
 * 人物名で既存人物を検索する（正規化済み完全一致）
 *
 * @param name - 検索する人物名（LLM 出力）
 * @param existingPersons - 既存人物の配列
 * @returns 一致した Person オブジェクト、または null
 */
export function matchPersonByName(name: string, existingPersons: Person[]): Person | null {
  const normalized = normalizeName(name);
  return existingPersons.find((p) => normalizeName(p.name) === normalized) ?? null;
}

/**
 * ストア投入用の新規人物データの型
 * addPerson の引数形式に合わせる（id / createdAt は自動生成のため除外）
 */
type NewPersonData = Omit<Person, 'createdAt'> & { id: string };

/**
 * ストア投入用の新規関係データの型
 * addRelationship の引数形式に合わせる（id / createdAt / updatedAt は自動生成のため除外）
 */
type NewRelationshipData = Omit<RelationshipV9, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * resolveExtractionResult の戻り値型
 */
export type ExtractionResolutionResult = {
  /** ストアに新規追加する人物リスト（id が事前に確定している） */
  newPersons: NewPersonData[];
  /** ストアに追加する関係リスト（sourcePersonId / targetPersonId が解決済み） */
  relationships: NewRelationshipData[];
};

/**
 * LLM 抽出結果をストア投入用データに変換する
 *
 * 処理フロー:
 * 1. 各抽出人物に対してユーザーオーバーライド → 既存人物マッチング → 新規追加 の優先順で解決
 * 2. 新規人物には事前に ID を割り当て（関係の ID 解決で使用）
 * 3. 各関係の sourcePersonName / targetPersonName を Person ID に変換
 * 4. いずれかの人物が解決できない関係はスキップ
 *
 * @param result - LLM が出力した抽出結果
 * @param existingPersons - 既存人物の配列
 * @param userOverrides - ユーザーによる名前→ID のマッピング（Map<人物名, Person ID>）
 *   - 値が既存 Person ID: その人物にマップ
 * @returns 解決済みの新規人物リストと関係リスト
 */
export function resolveExtractionResult(
  result: LlmExtractionResult,
  existingPersons: Person[],
  userOverrides: Map<string, string>
): ExtractionResolutionResult {
  // 名前 → Person ID の解決マップを構築
  const nameToId = new Map<string, string>();

  // 新規追加する人物（ID を事前生成）
  const newPersons: NewPersonData[] = [];

  for (const llmPerson of result.persons) {
    const name = llmPerson.name;

    // 1. ユーザーオーバーライドを優先
    const overrideId = userOverrides.get(name);
    if (overrideId !== undefined) {
      nameToId.set(name, overrideId);
      continue;
    }

    // 2. 既存人物と照合
    const matched = matchPersonByName(name, existingPersons);
    if (matched) {
      nameToId.set(name, matched.id);
      continue;
    }

    // 3. 新規人物として追加
    const newId = nanoid();
    nameToId.set(name, newId);
    newPersons.push({
      id: newId,
      name,
      kind: llmPerson.kind ?? undefined,
    });
  }

  // 関係の解決
  const relationships: NewRelationshipData[] = [];

  for (const llmRel of result.relationships) {
    const sourcePersonId = nameToId.get(llmRel.sourcePersonName);
    const targetPersonId = nameToId.get(llmRel.targetPersonName);

    // いずれかの人物が解決できない場合はスキップ
    if (sourcePersonId === undefined || targetPersonId === undefined) {
      continue;
    }

    relationships.push({
      sourcePersonId,
      targetPersonId,
      isDirected: llmRel.isDirected,
      symmetric: llmRel.symmetric,
      forward: llmRel.forward,
      reverse: llmRel.reverse,
      tags: llmRel.tags,
      narrative: {
        summary: llmRel.narrative.summary,
        notes: llmRel.narrative.notes,
        turningPoints: llmRel.narrative.turningPoints,
      },
      colorOverride: null,
    });
  }

  return { newPersons, relationships };
}
