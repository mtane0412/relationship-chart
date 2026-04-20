/**
 * LLM抽出スキーマのユニットテスト（v11 プロパティグラフ方式）
 * z.toJSONSchema() の動作確認と、スキーマのパース検証を行う。
 */

import { describe, it, expect } from 'vitest';
import {
  LlmPersonSchema,
  LlmRelationshipSchema,
  LlmEpisodeSchema,
  LlmExtractionResultSchema,
  getLlmExtractionJsonSchema,
  type LlmExtractionResult,
} from './llm-extraction-schema';

describe('LlmPersonSchema', () => {
  it('有効な人物データをパースできること', () => {
    const valid = { name: '田中太郎', labels: ['人物'] };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('labels が null でも有効であること', () => {
    const valid = { name: '山田花子', labels: null };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('labels が ["物"] でも有効であること', () => {
    const valid = { name: '秘密の手紙', labels: ['物'] };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('name が欠けている場合はパース失敗すること', () => {
    const invalid = { labels: ['人物'] };
    const result = LlmPersonSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('labels が配列でない場合はパース失敗すること', () => {
    const invalid = { name: '無効キャラ', labels: 'not_an_array' };
    const result = LlmPersonSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('tags フィールドを含む人物データをパースできること', () => {
    const valid = { name: '光源氏', labels: ['人物'], tags: ['主人公', '貴族'] };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(['主人公', '貴族']);
    }
  });

  it('narrative フィールドを含む人物データをパースできること', () => {
    const valid = {
      name: '光源氏',
      labels: ['人物'],
      narrative: { summary: '平安時代の貴公子', notes: null },
    };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.narrative?.summary).toBe('平安時代の貴公子');
    }
  });

  it('properties フィールドを含む人物データをパースできること', () => {
    const valid = {
      name: '光源氏',
      labels: ['人物'],
      properties: { 身分: '左大臣', 年齢: 20 },
    };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.properties).toEqual({ 身分: '左大臣', 年齢: 20 });
    }
  });

  it('tags が省略された場合は null になること', () => {
    const valid = { name: '光源氏', labels: ['人物'] };
    const result = LlmPersonSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toBeNull();
    }
  });
});

describe('LlmRelationshipSchema', () => {
  const validRelationship = {
    sourcePersonName: '田中太郎',
    targetPersonName: '山田花子',
    type: '片想い',
    label: '好き',
    symmetric: false,
    tags: ['片想い', '幼なじみ'],
    narrative: {
      summary: '幼なじみで片想い中',
      notes: null,
    },
    properties: {
      closeness: 0.8,
      trust: 0.7,
      tension: null,
      secrecy: null,
      affection: 0.9,
      awareness: 'known',
      role: null,
    },
  };

  it('有効な関係データをパースできること', () => {
    const result = LlmRelationshipSchema.safeParse(validRelationship);
    expect(result.success).toBe(true);
  });

  it('properties が null の場合は空オブジェクトに正規化されること（LLM が null を出力した際の対応）', () => {
    const data = { ...validRelationship, properties: null };
    const result = LlmRelationshipSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.properties).toEqual({});
    }
  });

  it('properties が省略された場合は空オブジェクトに正規化されること（LLM が省略した際の対応）', () => {
    const { properties: _, ...dataWithoutProperties } = validRelationship;
    const result = LlmRelationshipSchema.safeParse(dataWithoutProperties);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.properties).toEqual({});
    }
  });

  it('properties が空オブジェクトでも有効であること', () => {
    const minimal = {
      sourcePersonName: 'A',
      targetPersonName: 'B',
      type: '知人',
      label: null,
      symmetric: false,
      tags: [],
      narrative: { summary: null, notes: null },
      properties: {},
    };
    const result = LlmRelationshipSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('narrative に turningPoints を含む入力でも parse 結果には turningPoints が存在しないこと', () => {
    // zod の strip モードにより未知フィールドは除去される（実行時の安全確認）
    const dataWithTurningPoints = {
      ...validRelationship,
      narrative: {
        ...validRelationship.narrative,
        turningPoints: [{ at: '中学入学時', note: '再会して恋に落ちる' }],
      },
    };
    const result = LlmRelationshipSchema.safeParse(dataWithTurningPoints);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('turningPoints' in result.data.narrative).toBe(false);
    }
  });

  it('symmetric: true でも有効であること', () => {
    const data = {
      ...validRelationship,
      symmetric: true,
    };
    const result = LlmRelationshipSchema.safeParse(data);
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
      properties: { ...validRelationship.properties, affection: 1.5 },
    };
    const result = LlmRelationshipSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('affection が範囲外（-1.5）の場合はパース失敗すること', () => {
    const invalid = {
      ...validRelationship,
      properties: { ...validRelationship.properties, affection: -1.5 },
    };
    const result = LlmRelationshipSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('closeness が範囲外（1.5）の場合はパース失敗すること', () => {
    const invalid = {
      ...validRelationship,
      properties: { ...validRelationship.properties, closeness: 1.5 },
    };
    const result = LlmRelationshipSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('LlmEpisodeSchema', () => {
  it('有効なエピソードデータをパースできること', () => {
    const valid = {
      title: '初めての出会い',
      description: '田中と山田が部活で初めて出会った。',
      occurredAt: '高校1年の春',
      participantNames: ['田中太郎', '山田花子'],
    };
    const result = LlmEpisodeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('description が null でも有効であること', () => {
    const valid = {
      title: '卒業式',
      description: null,
      occurredAt: '2024年3月',
      participantNames: ['田中太郎'],
    };
    const result = LlmEpisodeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('occurredAt が null でも有効であること', () => {
    const valid = {
      title: '初めての喧嘩',
      description: '些細なことで口論になった。',
      occurredAt: null,
      participantNames: ['田中太郎', '山田花子'],
    };
    const result = LlmEpisodeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('participantNames が空配列でも有効であること', () => {
    const valid = {
      title: '謎の事件',
      description: null,
      occurredAt: null,
      participantNames: [],
    };
    const result = LlmEpisodeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('title が欠けている場合はパース失敗すること', () => {
    const invalid = {
      description: '説明文',
      occurredAt: null,
      participantNames: ['田中太郎'],
    };
    const result = LlmEpisodeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('participantNames が配列でない場合はパース失敗すること', () => {
    const invalid = {
      title: 'エピソード',
      description: null,
      occurredAt: null,
      participantNames: '田中太郎',
    };
    const result = LlmEpisodeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('LlmExtractionResultSchema', () => {
  it('有効な抽出結果（episodes含む）をパースできること', () => {
    const valid: LlmExtractionResult = {
      persons: [
        { name: '田中太郎', labels: ['人物'], tags: null, narrative: null, properties: {} },
        { name: '山田花子', labels: ['人物'], tags: null, narrative: null, properties: {} },
      ],
      relationships: [
        {
          sourcePersonName: '田中太郎',
          targetPersonName: '山田花子',
          type: '片想い',
          label: '好き',
          symmetric: false,
          tags: ['片想い'],
          narrative: { summary: null, notes: null },
          properties: { affection: 0.9, awareness: 'known', role: null },
        },
      ],
      episodes: [
        {
          title: '初めての出会い',
          description: '部活で出会った。',
          occurredAt: '高校1年の春',
          participantNames: ['田中太郎', '山田花子'],
        },
      ],
    };
    const result = LlmExtractionResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('persons・relationships・episodes が空配列でも有効であること', () => {
    const valid = { persons: [], relationships: [], episodes: [] };
    const result = LlmExtractionResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('episodes が欠けている場合はパース失敗すること', () => {
    const invalid = { persons: [], relationships: [] };
    const result = LlmExtractionResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
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

  it('persons と relationships と episodes プロパティが含まれること', () => {
    const schema = getLlmExtractionJsonSchema();
    // ランタイム型ガードで properties の存在を確認してからアクセス
    expect(schema !== null && typeof schema === 'object' && 'properties' in schema).toBe(true);
    const props = (schema as Record<string, unknown>).properties;
    expect(props !== null && typeof props === 'object').toBe(true);
    const propsObj = props as Record<string, unknown>;
    expect(propsObj).toHaveProperty('persons');
    expect(propsObj).toHaveProperty('relationships');
    expect(propsObj).toHaveProperty('episodes');
  });

  it('episodes が required 配列に含まれること（strict mode 対応）', () => {
    const schema = getLlmExtractionJsonSchema() as Record<string, unknown>;
    expect(Array.isArray(schema.required)).toBe(true);
    expect((schema.required as string[]).includes('episodes')).toBe(true);
  });

  it('episodes.items に title / participantNames / description / occurredAt が required として含まれること', () => {
    type JsonSchemaObj = Record<string, unknown>;
    const schema = getLlmExtractionJsonSchema() as JsonSchemaObj;
    const schemaProps = schema.properties as JsonSchemaObj;
    const episodesSchema = schemaProps.episodes as JsonSchemaObj;
    const episodeItems = episodesSchema.items as JsonSchemaObj;

    expect(Array.isArray(episodeItems.required)).toBe(true);
    const required = episodeItems.required as string[];
    expect(required).toContain('title');
    expect(required).toContain('participantNames');
    expect(required).toContain('description');
    expect(required).toContain('occurredAt');
    expect(episodeItems.additionalProperties).toBe(false);
  });

  it('生成されたスキーマが JSON シリアライズ可能であること', () => {
    const schema = getLlmExtractionJsonSchema();
    expect(() => JSON.stringify(schema)).not.toThrow();
  });

  it('全オブジェクトに required が設定されていること（Azure/OpenAI strict mode 対応）', () => {
    // Azure strict mode は全 object に required 配列が必要
    type JsonSchemaObj = Record<string, unknown>;
    const schema = getLlmExtractionJsonSchema() as JsonSchemaObj;
    const schemaProps = schema.properties as JsonSchemaObj;
    const relationships = schemaProps.relationships as JsonSchemaObj;
    const relItems = relationships.items as JsonSchemaObj;

    // トップレベルに required が設定されていること
    expect(Array.isArray(schema.required)).toBe(true);
    // relationships の items（LlmRelationshipSchema）に required が設定されていること
    expect(Array.isArray(relItems.required)).toBe(true);
  });

  it('relationships.items.properties.properties に required が含まれること（Azure strict mode 対応）', () => {
    // Azure エラーログ: context=('properties','relationships','items','properties','properties')
    // で required が不足していた問題への対応
    type JsonSchemaObj = Record<string, unknown>;
    const schema = getLlmExtractionJsonSchema() as JsonSchemaObj;
    const schemaProps = schema.properties as JsonSchemaObj;
    const relItems = (schemaProps.relationships as JsonSchemaObj).items as JsonSchemaObj;
    const relItemsProps = relItems.properties as JsonSchemaObj;
    const propSchema = relItemsProps.properties as JsonSchemaObj;

    expect(Array.isArray(propSchema?.required)).toBe(true);
    // closeness が required に含まれていること（Azure エラーメッセージで指摘されたキー）
    expect((propSchema?.required as string[]).includes('closeness')).toBe(true);
    expect(propSchema?.additionalProperties).toBe(false);
  });

  it('persons.items.properties.properties に propertyNames が含まれないこと（Azure strict mode 対応）', () => {
    // Azure エラーログ: context=('properties','persons','items','properties','properties')
    // で z.record() が生成した propertyNames が拒否された問題への対応。
    // OpenAI / Azure strict mode は propertyNames キーをサポートしない。
    type JsonSchemaObj = Record<string, unknown>;
    const schema = getLlmExtractionJsonSchema() as JsonSchemaObj;
    const schemaProps = schema.properties as JsonSchemaObj;
    const personItems = (schemaProps.persons as JsonSchemaObj).items as JsonSchemaObj;
    const personItemsProps = personItems.properties as JsonSchemaObj;
    const propSchema = personItemsProps.properties as JsonSchemaObj;

    // propertyNames が存在しないこと
    expect(propSchema).not.toHaveProperty('propertyNames');
  });

  it('persons.items.properties.properties が strict mode 要件を満たすこと（Azure strict mode 対応）', () => {
    // z.record() 由来の properties フィールドが additionalProperties と required を持つこと
    type JsonSchemaObj = Record<string, unknown>;
    const schema = getLlmExtractionJsonSchema() as JsonSchemaObj;
    const schemaProps = schema.properties as JsonSchemaObj;
    const personItems = (schemaProps.persons as JsonSchemaObj).items as JsonSchemaObj;
    const personItemsProps = personItems.properties as JsonSchemaObj;
    const propSchema = personItemsProps.properties as JsonSchemaObj;

    // type が object であること
    expect(propSchema?.type).toBe('object');
    // additionalProperties が false であること（Azure strict mode 要件）
    expect(propSchema?.additionalProperties).toBeDefined();
  });
});
