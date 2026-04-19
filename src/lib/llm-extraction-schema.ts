/**
 * LLM structured output 用の抽出スキーマ定義（v11 プロパティグラフ方式）
 *
 * Relationship 型をベースに、LLM が出力できる形式に変換したスキーマ。
 * 主な特徴:
 *   - sourceId / targetId の代わりに sourcePersonName / targetPersonName（名前ベース）
 *   - id / createdAt / updatedAt / colorOverride は除外（ストア側で自動生成）
 *   - narrative.turningPoints は z.preprocess を使用しない（LLM は空配列を出力する）
 *   - properties フィールドは z.preprocess で null/undefined を {} に正規化する
 *     （LLM が properties を省略・null 出力した場合の安全策）
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
  type: z.string().describe('関係カテゴリの短いラベル（1〜3語）。例: "友人", "嫌い", "親子"。文全体ではなくキーワードのみ。人物名を含めない'),
  /** 表示ラベル（null の場合は type を使用） */
  label: z.string().nullable().describe('エッジに表示する短いラベル（1〜3語）。人物名を含めず関係を表すキーワードのみ。文全体は不可。typeと同じ内容ならnullを設定'),
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
 * LLM が出力するエピソードスキーマ
 *
 * Episode は人物相関図上の「出来事・場面・イベント」を表す第一級ノード。
 * 複数人物が関与する独立した出来事を抽出する用途で使用する。
 * （関係の当事者2人に閉じた時系列イベントは Relationship.narrative.turningPoints ではなく、
 *   今後はすべてエピソードとして抽出する）
 */
export const LlmEpisodeSchema = z.object({
  /** 出来事の短いタイトル（例: "初めての出会い", "卒業式の告白"） */
  title: z.string().describe('出来事の短いタイトル（例: "初めての出会い", "卒業式"）'),
  /** エピソードの詳細説明（1〜数文）。情報がない場合は null */
  description: z.string().nullable(),
  /**
   * 発生時点の自由記述（"第3話", "2024年春", "2020-04-01" 等）。
   * テキストに記述がない場合は null
   */
  occurredAt: z.string().nullable().describe('発生時点の自由記述（"第3話", "2024年春" など）。不明なら null'),
  /**
   * このエピソードに参加した人物名の配列。
   * persons 配列に列挙した人物名と完全一致させること
   */
  participantNames: z.array(z.string()).describe('参加した人物名。persons 配列と一致させる'),
});

/**
 * LLM が出力する抽出結果全体のスキーマ
 */
export const LlmExtractionResultSchema = z.object({
  /** テキストから抽出された人物・アイテムのリスト */
  persons: z.array(LlmPersonSchema),
  /** テキストから抽出された関係のリスト */
  relationships: z.array(LlmRelationshipSchema),
  /**
   * テキストから抽出されたエピソード（出来事・場面・イベント）のリスト。
   * 複数人物が関与する独立した出来事を抽出する。ない場合は空配列 []
   */
  episodes: z.array(LlmEpisodeSchema),
});

/** LlmExtractionResult の TypeScript 型（zod スキーマから導出） */
export type LlmExtractionResult = z.infer<typeof LlmExtractionResultSchema>;

/** LlmPerson の TypeScript 型 */
export type LlmPerson = z.infer<typeof LlmPersonSchema>;

/** LlmRelationship の TypeScript 型 */
export type LlmRelationship = z.infer<typeof LlmRelationshipSchema>;

/** LlmEpisode の TypeScript 型 */
export type LlmEpisode = z.infer<typeof LlmEpisodeSchema>;

/**
 * JSON Schema を OpenAI/Azure strict mode 準拠に再帰変換する
 *
 * strict mode の要件:
 * - 全オブジェクトに required（全プロパティキーの配列）が必要
 * - additionalProperties: false が必要
 *
 * zod v4 の z.toJSONSchema() は optional フィールドを required に含めないため、
 * この関数で後処理として補完する。
 */
function makeStrictJsonSchema(schema: unknown): unknown {
  if (typeof schema !== 'object' || schema === null) return schema;
  if (Array.isArray(schema)) return schema.map(makeStrictJsonSchema);

  const obj = schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  // 全キーを再帰的に処理してコピー
  for (const [key, value] of Object.entries(obj)) {
    result[key] = makeStrictJsonSchema(value);
  }

  // type: 'object' かつ properties がある場合は strict mode 対応を追加
  if (
    result.type === 'object' &&
    result.properties != null &&
    typeof result.properties === 'object' &&
    !Array.isArray(result.properties)
  ) {
    const props = result.properties as Record<string, unknown>;
    // 全プロパティキーを required に設定（既存の required は上書き）
    result.required = Object.keys(props);
    result.additionalProperties = false;
  }

  return result;
}

/**
 * LlmExtractionResultSchema の JSON Schema（モジュールスコープでキャッシュ済み）
 *
 * OpenAI/Azure strict mode 準拠のため、makeStrictJsonSchema で後処理を行い
 * 全オブジェクトに required と additionalProperties: false を付与する。
 * スキーマは静的なため、モジュール初期化時に一度だけ生成する。
 */
const cachedLlmExtractionJsonSchema = makeStrictJsonSchema(
  z.toJSONSchema(LlmExtractionResultSchema) as Record<string, unknown>
) as Record<string, unknown>;

/**
 * LlmExtractionResultSchema を JSON Schema 形式に変換して返す。
 * Vercel AI SDK の jsonSchema() ヘルパーに渡すために使用する。
 *
 * @returns JSON Schema オブジェクト（JSON シリアライズ可能、strict mode 準拠、キャッシュ済み）
 */
export function getLlmExtractionJsonSchema(): Record<string, unknown> {
  return cachedLlmExtractionJsonSchema;
}
