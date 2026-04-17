/**
 * LLM抽出スキーマのユニットテスト
 * z.toJSONSchema() の動作確認と、スキーマのパース検証を行う。
 */

import { describe, it, expect } from 'vitest';
import {
  LlmPersonSchema,
  LlmRelationshipSchema,
  LlmExtractionResultSchema,
  getLlmExtractionJsonSchema,
  type LlmExtractionResult,
} from './llm-extraction-schema';

describe('LlmPersonSchema', () => {
  it('有効な人物データをパースできること', () => {
    const valid = { name: '田中太郎', kind: 'person' };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('kind が null でも有効であること', () => {
    const valid = { name: '山田花子', kind: null };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('kind が item でも有効であること', () => {
    const valid = { name: '秘密の手紙', kind: 'item' };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('name が欠けている場合はパース失敗すること', () => {
    const invalid = { kind: 'person' };
    const result = LlmPersonSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('kind が不正な値の場合はパース失敗すること', () => {
    const invalid = { name: '無効キャラ', kind: 'invalid_kind' };
    const result = LlmPersonSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('LlmRelationshipSchema', () => {
  const validRelationship = {
    sourcePersonName: '田中太郎',
    targetPersonName: '山田花子',
    isDirected: true,
    symmetric: {
      closeness: 0.8,
      trust: 0.7,
      tension: null,
      secrecy: null,
      kinship: null,
    },
    forward: {
      label: '好き',
      affection: 0.9,
      awareness: 'known',
      role: null,
    },
    reverse: {
      label: null,
      affection: null,
      awareness: null,
      role: null,
    },
    tags: ['片想い', '幼なじみ'],
    narrative: {
      summary: '幼なじみで片想い中',
      notes: null,
      turningPoints: [{ at: '中学入学時', note: '再会して恋に落ちる' }],
    },
  };

  it('有効な関係データをパースできること', () => {
    const result = LlmRelationshipSchema.safeParse(validRelationship);
    expect(result.success).toBe(true);
  });

  it('すべてのフィールドが null でも有効であること', () => {
    const minimal = {
      sourcePersonName: 'A',
      targetPersonName: 'B',
      isDirected: false,
      symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
      forward: { label: null, affection: null, awareness: null, role: null },
      reverse: { label: null, affection: null, awareness: null, role: null },
      tags: [],
      narrative: { summary: null, notes: null, turningPoints: [] },
    };
    const result = LlmRelationshipSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('sourcePersonName が欠けている場合はパース失敗すること', () => {
    const { sourcePersonName: _, ...invalid } = validRelationship;
    const result = LlmRelationshipSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('affection が範囲外（1.5）の場合はパース失敗すること', () => {
    const invalid = {
      ...validRelationship,
      forward: { ...validRelationship.forward, affection: 1.5 },
    };
    const result = LlmRelationshipSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('affection が範囲外（-1.5）の場合はパース失敗すること', () => {
    const invalid = {
      ...validRelationship,
      forward: { ...validRelationship.forward, affection: -1.5 },
    };
    const result = LlmRelationshipSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('LlmExtractionResultSchema', () => {
  it('有効な抽出結果をパースできること', () => {
    const valid: LlmExtractionResult = {
      persons: [
        { name: '田中太郎', kind: 'person' },
        { name: '山田花子', kind: 'person' },
      ],
      relationships: [
        {
          sourcePersonName: '田中太郎',
          targetPersonName: '山田花子',
          isDirected: true,
          symmetric: { closeness: 0.8, trust: 0.7, tension: null, secrecy: null, kinship: null },
          forward: { label: '好き', affection: 0.9, awareness: 'known', role: null },
          reverse: { label: null, affection: null, awareness: null, role: null },
          tags: ['片想い'],
          narrative: { summary: null, notes: null, turningPoints: [] },
        },
      ],
    };
    const result = LlmExtractionResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('persons・relationships が空配列でも有効であること', () => {
    const valid = { persons: [], relationships: [] };
    const result = LlmExtractionResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('getLlmExtractionJsonSchema', () => {
  it('JSON Schema オブジェクトが返されること', () => {
    const schema = getLlmExtractionJsonSchema();
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('z.toJSONSchema() が有効な JSON Schema を生成すること', () => {
    const schema = getLlmExtractionJsonSchema();
    // JSON Schemaの基本構造を検証
    expect(schema).toHaveProperty('type');
    expect(schema).toHaveProperty('properties');
  });

  it('persons と relationships プロパティが含まれること', () => {
    const schema = getLlmExtractionJsonSchema();
    // ランタイム型ガードで properties の存在を確認してからアクセス
    expect(schema !== null && typeof schema === 'object' && 'properties' in schema).toBe(true);
    const props = (schema as Record<string, unknown>).properties;
    expect(props !== null && typeof props === 'object').toBe(true);
    const propsObj = props as Record<string, unknown>;
    expect(propsObj).toHaveProperty('persons');
    expect(propsObj).toHaveProperty('relationships');
  });

  it('生成されたスキーマが JSON シリアライズ可能であること', () => {
    const schema = getLlmExtractionJsonSchema();
    expect(() => JSON.stringify(schema)).not.toThrow();
  });
});
