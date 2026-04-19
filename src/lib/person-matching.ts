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
import type { Relationship } from '@/types/relationship';
import type { LlmExtractionResult } from './llm-extraction-schema';

/**
 * 人物名を正規化する（マッチング用）
 * @param name - 正規化対象の名前
 * @returns 正規化後の名前
 */
export function normalizeName(name: string): string {
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
 * id は resolveExtractionResult 内で関係解決のために事前生成する（createdAt は除外）
 */
type NewPersonData = Omit<Person, 'createdAt'>;

/**
 * ストア投入用の新規関係データの型
 * addRelationship の引数形式に合わせる（id / createdAt / updatedAt は自動生成のため除外）
 */
type NewRelationshipData = Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * ストア投入用の新規エピソードデータの型
 * createEpisode / addParticipation の引数形式に合わせる（id / createdAt / updatedAt / position / properties は自動生成のため除外）
 */
type NewEpisodeData = {
  title: string;
  description?: string;
  occurredAt?: string;
  /** 解決済みの参加者 Person ID 配列（解決できなかった参加者は除外済み） */
  participantPersonIds: string[];
};

/**
 * resolveExtractionResult の戻り値型
 */
export type ExtractionResolutionResult = {
  /** ストアに新規追加する人物リスト（id が事前に確定している） */
  newPersons: NewPersonData[];
  /** ストアに追加する関係リスト（sourceId / targetId が解決済み） */
  relationships: NewRelationshipData[];
  /** ストアに追加するエピソードリスト（participantPersonIds が解決済み） */
  episodes: NewEpisodeData[];
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
 * @param userOverrides - ユーザーによる正規化済み名前→ID のマッピング（Map<正規化人物名, Person ID>）
 *   キーは normalizeName() で正規化した人物名（大文字小文字・空白を統一）。
 *   値が既存 Person ID の場合はその人物にマップする。
 * @returns 解決済みの新規人物リストと関係リスト
 */
export function resolveExtractionResult(
  result: LlmExtractionResult,
  existingPersons: Person[],
  userOverrides: Map<string, string>
): ExtractionResolutionResult {
  // 正規化名 → Person ID の解決マップ（重複検出にも使用）
  const nameToId = new Map<string, string>();

  // 新規追加する人物（ID を事前生成して関係解決に使用）
  const newPersons: NewPersonData[] = [];

  for (const llmPerson of result.persons) {
    const normalizedName = normalizeName(llmPerson.name);

    // 重複チェック（LLM が同一人物を正規化後に同名で複数出力した場合のスキップ）
    if (nameToId.has(normalizedName)) continue;

    // 1. ユーザーオーバーライドを優先
    // 正規化した名前でルックアップし、大文字小文字・空白の差異を吸収する
    const overrideId = userOverrides.get(normalizedName);
    if (overrideId !== undefined) {
      nameToId.set(normalizedName, overrideId);
      continue;
    }

    // 2. 既存人物と照合
    const matched = matchPersonByName(llmPerson.name, existingPersons);
    if (matched) {
      nameToId.set(normalizedName, matched.id);
      continue;
    }

    // 3. 新規人物として追加（ID を事前生成して関係の ID 解決で使用）
    const newId = nanoid();
    nameToId.set(normalizedName, newId);
    newPersons.push({
      id: newId,
      name: llmPerson.name,
      // labels が null の場合は ['人物'] をデフォルトとして使用する
      labels: llmPerson.labels ?? ['人物'],
      properties: {},
    });
  }

  // 関係の解決（正規化名でルックアップして空白・大文字小文字の揺れを吸収）
  const relationships: NewRelationshipData[] = [];

  for (const llmRel of result.relationships) {
    const sourceId = nameToId.get(normalizeName(llmRel.sourcePersonName));
    const targetId = nameToId.get(normalizeName(llmRel.targetPersonName));

    // いずれかの人物が解決できない場合はスキップ
    if (sourceId === undefined || targetId === undefined) {
      continue;
    }

    relationships.push({
      sourceId,
      targetId,
      type: llmRel.type,
      label: llmRel.label,
      symmetric: llmRel.symmetric,
      tags: llmRel.tags,
      narrative: {
        summary: llmRel.narrative.summary,
        notes: llmRel.narrative.notes,
        turningPoints: llmRel.narrative.turningPoints,
      },
      colorOverride: null,
      properties: llmRel.properties,
    });
  }

  // エピソードの解決（relationships と同じ nameToId マップを再利用）
  const episodes: NewEpisodeData[] = [];

  for (const llmEpisode of result.episodes) {
    const title = llmEpisode.title.trim();
    // タイトルが空文字の Episode はスキップ
    if (!title) continue;

    // 参加者名を Person ID に解決（解決できない参加者は除外して Episode は保持）
    // 同一 Person が重複登録されないよう Set で一意化する
    const seenParticipantIds = new Set<string>();
    const participantPersonIds: string[] = [];
    for (const name of llmEpisode.participantNames) {
      const personId = nameToId.get(normalizeName(name));
      if (personId !== undefined && !seenParticipantIds.has(personId)) {
        seenParticipantIds.add(personId);
        participantPersonIds.push(personId);
      }
    }

    // 参加者が 0 人になった Episode はスキップ（ストア上で意味をなさないため）
    if (participantPersonIds.length === 0) continue;

    const episode: NewEpisodeData = {
      title,
      participantPersonIds,
    };
    // null を undefined に変換（型の都合で optional フィールドは undefined を使う）
    if (llmEpisode.description !== null) episode.description = llmEpisode.description;
    if (llmEpisode.occurredAt !== null) episode.occurredAt = llmEpisode.occurredAt;

    episodes.push(episode);
  }

  return { newPersons, relationships, episodes };
}
