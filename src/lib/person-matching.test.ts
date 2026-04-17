/**
 * 人物マッチングユーティリティのユニットテスト
 * LLM が出力した人物名と既存人物の照合ロジックを検証する。
 */

import { describe, it, expect } from 'vitest';
import type { Person } from '@/types/person';
import {
  matchPersonByName,
  resolveExtractionResult,
} from './person-matching';
import type { LlmExtractionResult } from './llm-extraction-schema';

const makePerson = (name: string, id: string): Person => ({
  id,
  name,
  createdAt: '2024-01-01T00:00:00.000Z',
});

const existingPersons: Person[] = [
  makePerson('田中太郎', 'person-001'),
  makePerson('山田花子', 'person-002'),
  makePerson('佐藤次郎', 'person-003'),
];

describe('matchPersonByName', () => {
  it('完全一致する人物を返すこと', () => {
    const result = matchPersonByName('田中太郎', existingPersons);
    expect(result?.id).toBe('person-001');
  });

  it('大文字小文字を無視して照合すること', () => {
    const persons: Person[] = [makePerson('Alice', 'alice-001')];
    const result = matchPersonByName('alice', persons);
    expect(result?.id).toBe('alice-001');
  });

  it('前後の空白を無視して照合すること', () => {
    const result = matchPersonByName('  田中太郎  ', existingPersons);
    expect(result?.id).toBe('person-001');
  });

  it('中間の空白を正規化して照合すること', () => {
    const persons: Person[] = [makePerson('田中 太郎', 'person-space')];
    const result = matchPersonByName('田中　太郎', persons);
    // 全角スペースも半角スペースに正規化して照合
    expect(result?.id).toBe('person-space');
  });

  it('一致する人物がいない場合は null を返すこと', () => {
    const result = matchPersonByName('存在しない人', existingPersons);
    expect(result).toBeNull();
  });

  it('空の配列に対しては null を返すこと', () => {
    const result = matchPersonByName('田中太郎', []);
    expect(result).toBeNull();
  });
});

describe('resolveExtractionResult', () => {
  const extractionResult: LlmExtractionResult = {
    persons: [
      { name: '田中太郎', kind: 'person' },
      { name: '新キャラ', kind: 'person' },
    ],
    relationships: [
      {
        sourcePersonName: '田中太郎',
        targetPersonName: '新キャラ',
        isDirected: true,
        symmetric: { closeness: 0.5, trust: null, tension: null, secrecy: null, kinship: null },
        forward: { label: '上司', affection: null, awareness: 'known', role: '上司' },
        reverse: { label: '部下', affection: null, awareness: null, role: '部下' },
        tags: ['上司部下'],
        narrative: { summary: null, notes: null, turningPoints: [] },
      },
    ],
  };

  it('既存人物はマッチさせ、新規人物は新規追加リストに含めること', () => {
    const result = resolveExtractionResult(extractionResult, existingPersons, new Map());
    // 田中太郎は既存 → 新規追加リストに含まれない
    expect(result.newPersons.some((p) => p.name === '田中太郎')).toBe(false);
    // 新キャラは新規 → 新規追加リストに含まれる
    expect(result.newPersons.some((p) => p.name === '新キャラ')).toBe(true);
  });

  it('関係の sourcePersonId / targetPersonId が正しく解決されること', () => {
    const result = resolveExtractionResult(extractionResult, existingPersons, new Map());
    expect(result.relationships).toHaveLength(1);
    const rel = result.relationships[0];
    // 田中太郎は既存人物なので ID が person-001
    expect(rel.sourcePersonId).toBe('person-001');
    // 新キャラは新規なので、newPersons の ID と一致する
    const newCharId = result.newPersons.find((p) => p.name === '新キャラ')?.id;
    expect(newCharId).toBeDefined();
    expect(rel.targetPersonId).toBe(newCharId);
  });

  it('ユーザーオーバーライドが適用されること', () => {
    // 「新キャラ」を既存の「佐藤次郎」にマッピング
    const overrides = new Map([['新キャラ', 'person-003']]);
    const result = resolveExtractionResult(extractionResult, existingPersons, overrides);
    // オーバーライドされた人物は新規追加リストに含まれない
    expect(result.newPersons.some((p) => p.name === '新キャラ')).toBe(false);
    // 関係の targetPersonId が person-003 になる
    const rel = result.relationships[0];
    expect(rel.targetPersonId).toBe('person-003');
  });

  it('解決できない人物名を含む関係はスキップされること', () => {
    const badResult: LlmExtractionResult = {
      persons: [{ name: '田中太郎', kind: 'person' }],
      relationships: [
        {
          sourcePersonName: '田中太郎',
          targetPersonName: '存在しない人', // persons にも既存にも存在しない
          isDirected: false,
          symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
          forward: { label: null, affection: null, awareness: null, role: null },
          reverse: { label: null, affection: null, awareness: null, role: null },
          tags: [],
          narrative: { summary: null, notes: null, turningPoints: [] },
        },
      ],
    };
    const result = resolveExtractionResult(badResult, existingPersons, new Map());
    expect(result.relationships).toHaveLength(0);
  });
});
