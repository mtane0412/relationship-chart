/**
 * 関係（RelationshipV9）の zod スキーマ定義
 * プロパティグラフ方式の関係データを型安全に validate する。
 * LLM の structured output との対応を意識し、JSON Schema への変換が容易な構造にしている。
 *
 * 使用例:
 *   import { RelationshipV9Schema } from '@/lib/relationship-schema';
 *   const validated = RelationshipV9Schema.parse(unknownData);
 */

import { z } from 'zod';

/**
 * 血縁・親族種別のスキーマ
 */
export const KinshipKindSchema = z
  .enum(['parent', 'child', 'sibling', 'spouse', 'partner', 'grandparent', 'grandchild', 'cousin', 'relative'])
  .nullable();

/**
 * 正体・情報の認知状況のスキーマ
 */
export const AwarenessKindSchema = z.enum(['known', 'unknown', 'suspected']).nullable();

/**
 * 方向ごとのプロパティのスキーマ
 */
export const DirectionalPropsSchema = z.object({
  /** 方向ラベル（例: "好き", "上司"） */
  label: z.string().nullable(),
  /** 好悪の向き強度（-1.0 〜 1.0） */
  affection: z.number().min(-1).max(1).nullable(),
  /** 正体・情報の認知状況 */
  awareness: AwarenessKindSchema,
  /** 役割ラベル（例: "上司", "師匠"） */
  role: z.string().nullable(),
});

/**
 * 方向対称なプロパティのスキーマ
 */
export const SymmetricPropsSchema = z.object({
  /** 親密度（0.0〜1.0） */
  closeness: z.number().min(0).max(1).nullable(),
  /** 信頼度（0.0〜1.0） */
  trust: z.number().min(0).max(1).nullable(),
  /** 緊張・対立度（0.0〜1.0） */
  tension: z.number().min(0).max(1).nullable(),
  /** 秘匿性（0.0〜1.0） */
  secrecy: z.number().min(0).max(1).nullable(),
  /** 血縁・親族の種別 */
  kinship: KinshipKindSchema,
});

/**
 * 関係の自由記述（narrative）のスキーマ
 */
export const RelationshipNarrativeSchema = z.object({
  /** 関係全体の物語的記述 */
  summary: z.string().nullable(),
  /** メモ・補足 */
  notes: z.string().nullable(),
  /**
   * ターニングポイントのリスト（省略可能。null/undefined は空配列に正規化）
   * RelationshipNarrative の turningPoints と型を一致させるため、
   * 要素の at/note も null/undefined を空文字に正規化する。
   */
  turningPoints: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(
      z.object({
        /**
         * 発生時刻・場面の説明
         * ISO 8601 形式（例: "2024-01-01T00:00:00.000Z"）または日本語の日付・場面説明
         */
        at: z.preprocess((value) => (value == null ? '' : value), z.string()),
        /** 出来事の説明 */
        note: z.preprocess((value) => (value == null ? '' : value), z.string()),
      })
    )
  ),
});

/**
 * v9 プロパティグラフ方式の関係のスキーマ
 * LLM への structured output プロンプトのスキーマとしても使用可能
 */
export const RelationshipV9Schema = z.object({
  id: z.string(),
  sourcePersonId: z.string(),
  targetPersonId: z.string(),
  /** true=有向（forward/reverse が意味を持つ）、false=無向 */
  isDirected: z.boolean(),
  /** 方向対称なプロパティ */
  symmetric: SymmetricPropsSchema,
  /** source→target 視点のプロパティ */
  forward: DirectionalPropsSchema,
  /** target→source 視点のプロパティ（isDirected=false の場合は未使用） */
  reverse: DirectionalPropsSchema,
  /** 半定型タグ配列（色派生・フィルタの主軸） */
  tags: z.array(z.string()),
  /** 自由記述 */
  narrative: RelationshipNarrativeSchema,
  /** エッジ色の手動上書き（null の場合はタグ/定型値から派生） */
  colorOverride: z.string().nullable(),
  /** ISO 8601 形式の作成日時（例: "2024-01-01T00:00:00.000Z"） */
  createdAt: z.string().datetime(),
  /** ISO 8601 形式の更新日時（例: "2024-01-01T00:00:00.000Z"） */
  updatedAt: z.string().datetime(),
});

/** RelationshipV9 の infer 型（zod スキーマから導出） */
export type RelationshipV9FromSchema = z.infer<typeof RelationshipV9Schema>;
