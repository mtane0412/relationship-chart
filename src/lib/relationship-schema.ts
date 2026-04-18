/**
 * 関係（Relationship）の zod スキーマ定義（v11 プロパティグラフ方式）
 *
 * v11 の主な変更:
 * - sourcePersonId/targetPersonId → sourceId/targetId
 * - isDirected 廃止 → symmetric: boolean
 * - forward/reverse 廃止 → properties 配下にフラット化
 * - kinship 廃止（エッジ type で表現）
 * - type フィールド追加（エッジ型ラベル）
 * - label フィールド追加（表示ラベル）
 * - properties オブジェクト追加（ドメイン属性 + 任意拡張）
 *
 * 使用例:
 *   import { RelationshipSchema } from '@/lib/relationship-schema';
 *   const validated = RelationshipSchema.parse(unknownData);
 */

import { z } from 'zod';

/**
 * 正体・情報の認知状況のスキーマ
 */
export const AwarenessKindSchema = z.enum(['known', 'unknown', 'suspected']).nullable();

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
   */
  turningPoints: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(
      z.object({
        /** 発生時刻・場面の説明 */
        at: z.preprocess((value) => (value == null ? '' : value), z.string()),
        /** 出来事の説明 */
        note: z.preprocess((value) => (value == null ? '' : value), z.string()),
      })
    )
  ),
});

/**
 * エッジのプロパティスキーマ（v11）
 * 既知のドメイン属性を型付きで定義し、追加プロパティも許容する
 */
export const RelationshipPropertiesSchema = z
  .object({
    /** 親密度（0.0〜1.0） */
    closeness: z.number().min(0).max(1).nullable().optional(),
    /** 信頼度（0.0〜1.0） */
    trust: z.number().min(0).max(1).nullable().optional(),
    /** 緊張・対立度（0.0〜1.0） */
    tension: z.number().min(0).max(1).nullable().optional(),
    /** 秘匿性（0.0〜1.0） */
    secrecy: z.number().min(0).max(1).nullable().optional(),
    /** 好悪の強度（-1.0 〜 1.0、起点→終点視点） */
    affection: z.number().min(-1).max(1).nullable().optional(),
    /** 起点から終点への認知状況 */
    awareness: AwarenessKindSchema.optional(),
    /** 起点の終点に対する役割ラベル */
    role: z.string().nullable().optional(),
  })
  .catchall(z.unknown());

/**
 * v11 プロパティグラフ方式の関係スキーマ
 */
export const RelationshipSchema = z.object({
  id: z.string(),
  /** エッジ型ラベル（例: "友人", "同僚", "好き"） */
  type: z.string(),
  /** 起点ノードID */
  sourceId: z.string(),
  /** 終点ノードID */
  targetId: z.string(),
  /** 表示ラベル（null の場合は type を使用） */
  label: z.string().nullable(),
  /** true=無向表示（矢印なし）、false=有向（矢印あり） */
  symmetric: z.boolean(),
  /** 補助的な分類タグ配列 */
  tags: z.array(z.string()),
  /** 自由記述 */
  narrative: RelationshipNarrativeSchema,
  /** エッジ色の手動上書き（null の場合はプロパティから派生） */
  colorOverride: z.string().nullable(),
  /** ドメイン属性 + 任意カスタムプロパティ */
  properties: RelationshipPropertiesSchema,
  /** ISO 8601 形式の作成日時 */
  createdAt: z.string().datetime(),
  /** ISO 8601 形式の更新日時 */
  updatedAt: z.string().datetime(),
});

/** Relationship の infer 型（zod スキーマから導出） */
export type RelationshipFromSchema = z.infer<typeof RelationshipSchema>;
