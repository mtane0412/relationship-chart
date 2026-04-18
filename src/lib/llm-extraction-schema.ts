/**
 * LLM structured output 用の抽出スキーマ定義（v11 プロパティグラフ方式）
 *
 * Relationship 型をベースに、LLM が出力できる形式に変換したスキーマ。
 * 主な特徴:
 *   - sourceId / targetId の代わりに sourcePersonName / targetPersonName（名前ベース）
 *   - id / createdAt / updatedAt / colorOverride は除外（ストア側で自動生成）
 *   - z.preprocess を使用しない（LLM は null ではなく空配列を出力できる）
 *
 * z.toJSONSchema() による JSON Schema 変換に対応している。
 */

import { z } from 'zod';
import { AwarenessKindSchema } from './relationship-schema';

/**
 * LLM が出力する人物スキーマ
 */
export const LlmPersonSchema = z.object({
  /** 人物名またはアイテム名 */
  name: z.string(),
  /**
   * ノードに付与するラベル配列（例: ["人物"], ["物"]）。不明な場合は null
   * プロパティグラフ方式: 固定の種別ではなくラベルでノードの特性を表現する
   */
  labels: z.array(z.string()).nullable(),
});

/**
 * LLM が出力する関係の narrative スキーマ
 * RelationshipNarrativeSchema と異なり z.preprocess を使用しない
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
 * LLM が出力するエッジプロパティスキーマ
 */
const LlmRelationshipPropertiesSchema = z.object({
  closeness: z.number().min(0).max(1).nullable().optional(),
  trust: z.number().min(0).max(1).nullable().optional(),
  tension: z.number().min(0).max(1).nullable().optional(),
  secrecy: z.number().min(0).max(1).nullable().optional(),
  affection: z.number().min(-1).max(1).nullable().optional(),
  awareness: AwarenessKindSchema.nullable().optional(),
  role: z.string().nullable().optional(),
});

/**
 * LLM が出力する関係スキーマ（v11）
 * sourceId / targetId の代わりに人物名を使用する
 */
export const LlmRelationshipSchema = z.object({
  /** 関係の起点となる人物名 */
  sourcePersonName: z.string(),
  /** 関係の終点となる人物名 */
  targetPersonName: z.string(),
  /** エッジ型ラベル（例: "友人", "同僚", "好き", "親子"） */
  type: z.string(),
  /** 表示ラベル（null の場合は type を使用） */
  label: z.string().nullable(),
  /** true=無向表示（矢印なし）、false=有向（矢印あり） */
  symmetric: z.boolean(),
  /** 補助的な分類タグ配列 */
  tags: z.array(z.string()),
  /** 自由記述 */
  narrative: LlmNarrativeSchema,
  /**
   * ドメイン属性
   * LLM が null を出力した場合・省略した場合は空オブジェクトに正規化する
   * （プロンプトが属性をフラットに説明するため、LLM が省略するケースへの対応）
   */
  properties: z.preprocess(
    (v) => (v == null ? {} : v),
    LlmRelationshipPropertiesSchema
  ),
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
