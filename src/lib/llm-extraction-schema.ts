/**
 * LLM structured output 用の抽出スキーマ定義
 *
 * RelationshipV9Schema をベースに、LLM が出力できる形式に変換したスキーマ。
 * 主な違い:
 *   - sourcePersonId / targetPersonId の代わりに sourcePersonName / targetPersonName（名前ベース）
 *   - id / createdAt / updatedAt / colorOverride は除外（ストア側で自動生成）
 *   - z.preprocess を使用しない（LLM は null ではなく空配列を出力できる）
 *
 * z.toJSONSchema() による JSON Schema 変換に対応している。
 */

import { z } from 'zod';
import {
  DirectionalPropsSchema,
  SymmetricPropsSchema,
} from './relationship-schema';

/**
 * LLM が出力する人物スキーマ
 */
export const LlmPersonSchema = z.object({
  /** 人物名またはアイテム名 */
  name: z.string(),
  /** ノード種別（人物 / アイテム）。不明な場合は null */
  kind: z.enum(['person', 'item']).nullable(),
});

/**
 * LLM が出力する関係の narrative スキーマ
 * RelationshipNarrativeSchema と異なり z.preprocess を使用しない。
 */
const LlmNarrativeSchema = z.object({
  /** 関係全体の物語的記述 */
  summary: z.string().nullable(),
  /** メモ・補足 */
  notes: z.string().nullable(),
  /**
   * ターニングポイントのリスト
   * LLM には空配列を出力してもらう（null は受け付けない）
   */
  turningPoints: z.array(
    z.object({
      /** 発生時刻・場面の説明 */
      at: z.string(),
      /** 出来事の説明 */
      note: z.string(),
    })
  ),
});

/**
 * LLM が出力する関係スキーマ
 * sourcePersonId / targetPersonId の代わりに人物名を使用する。
 */
export const LlmRelationshipSchema = z.object({
  /** 関係の起点となる人物名（source → target 方向） */
  sourcePersonName: z.string(),
  /** 関係の終点となる人物名 */
  targetPersonName: z.string(),
  /** true=有向（forward/reverse が意味を持つ）、false=無向 */
  isDirected: z.boolean(),
  /** 方向対称なプロパティ */
  symmetric: SymmetricPropsSchema,
  /** source→target 視点のプロパティ */
  forward: DirectionalPropsSchema,
  /** target→source 視点のプロパティ（isDirected=false の場合は未使用） */
  reverse: DirectionalPropsSchema,
  /** 半定型タグ配列（例: "親友", "ライバル", "上司部下"） */
  tags: z.array(z.string()),
  /** 自由記述 */
  narrative: LlmNarrativeSchema,
});

/**
 * LLM が出力する抽出結果全体のスキーマ
 */
export const LlmExtractionResultSchema = z.object({
  /** テキストから抽出された人物・アイテムのリスト */
  persons: z.array(LlmPersonSchema),
  /** テキストから抽出された関係のリスト */
  relationships: z.array(LlmRelationshipSchema),
});

/** LlmExtractionResult の TypeScript 型（zod スキーマから導出） */
export type LlmExtractionResult = z.infer<typeof LlmExtractionResultSchema>;

/** LlmPerson の TypeScript 型 */
export type LlmPerson = z.infer<typeof LlmPersonSchema>;

/** LlmRelationship の TypeScript 型 */
export type LlmRelationship = z.infer<typeof LlmRelationshipSchema>;

/**
 * LlmExtractionResultSchema を JSON Schema 形式に変換して返す。
 * Vercel AI SDK の jsonSchema() ヘルパーに渡すために使用する。
 *
 * @returns JSON Schema オブジェクト（JSON シリアライズ可能）
 */
export function getLlmExtractionJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(LlmExtractionResultSchema) as Record<string, unknown>;
}
