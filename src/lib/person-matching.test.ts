/**
 * 人物マッチングユーティリティのユニットテスト（v11 プロパティグラフ方式）
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
  labels: ['人物'],
  properties: {},
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
  // v11 形式の抽出結果（type, label, symmetric: boolean, properties）
  const extractionResult: LlmExtractionResult = {
    persons: [
      { name: '田中太郎', labels: ['人物'] },
      { name: '新キャラ', labels: ['人物'] },
    ],
    relationships: [
      {
        sourcePersonName: '田中太郎',
        targetPersonName: '新キャラ',
        type: '上司部下',
        label: '上司',
        symmetric: false,
        tags: ['上司部下'],
        narrative: { summary: null, notes: null, turningPoints: [] },
        properties: { closeness: 0.5, awareness: 'known', role: '上司' },
      },
    ],
    episodes: [],
  };

  it('既存人物はマッチさせ、新規人物は新規追加リストに含めること', () => {
    const result = resolveExtractionResult(extractionResult, existingPersons, new Map());
    // 田中太郎は既存 → 新規追加リストに含まれない
    expect(result.newPersons.some((p) => p.name === '田中太郎')).toBe(false);
    // 新キャラは新規 → 新規追加リストに含まれる
    expect(result.newPersons.some((p) => p.name === '新キャラ')).toBe(true);
  });

  it('関係の sourceId / targetId が正しく解決されること', () => {
    const result = resolveExtractionResult(extractionResult, existingPersons, new Map());
    expect(result.relationships).toHaveLength(1);
    const rel = result.relationships[0];
    // 田中太郎は既存人物なので ID が person-001
    expect(rel.sourceId).toBe('person-001');
    // 新キャラは新規なので、newPersons の ID と一致する
    const newCharId = result.newPersons.find((p) => p.name === '新キャラ')?.id;
    expect(newCharId).toBeDefined();
    expect(rel.targetId).toBe(newCharId);
  });

  it('ユーザーオーバーライドが適用されること', () => {
    // 「新キャラ」を既存の「佐藤次郎」にマッピング
    const overrides = new Map([['新キャラ', 'person-003']]);
    const result = resolveExtractionResult(extractionResult, existingPersons, overrides);
    // オーバーライドされた人物は新規追加リストに含まれない
    expect(result.newPersons.some((p) => p.name === '新キャラ')).toBe(false);
    // 関係の targetId が person-003 になる
    const rel = result.relationships[0];
    expect(rel.targetId).toBe('person-003');
  });

  it('解決できない人物名を含む関係はスキップされること', () => {
    const badResult: LlmExtractionResult = {
      persons: [{ name: '田中太郎', labels: ['人物'] }],
      relationships: [
        {
          sourcePersonName: '田中太郎',
          targetPersonName: '存在しない人', // persons にも既存にも存在しない
          type: '知人',
          label: null,
          symmetric: false,
          tags: [],
          narrative: { summary: null, notes: null, turningPoints: [] },
          properties: {},
        },
      ],
      episodes: [],
    };
    const result = resolveExtractionResult(badResult, existingPersons, new Map());
    expect(result.relationships).toHaveLength(0);
  });

  describe('episodes 解決', () => {
    it('episodes が空の場合は空配列を返すこと', () => {
      const result = resolveExtractionResult(extractionResult, existingPersons, new Map());
      expect(result.episodes).toEqual([]);
    });

    it('既存人物と新規人物の参加者が両方正しく解決されること', () => {
      // 田中太郎（既存）と新キャラ（新規）が参加するエピソード
      const resultWithEpisode: LlmExtractionResult = {
        persons: [
          { name: '田中太郎', labels: ['人物'] },
          { name: '新キャラ', labels: ['人物'] },
        ],
        relationships: [],
        episodes: [
          {
            title: '初めての出会い',
            description: '部活で出会った。',
            occurredAt: '高校1年の春',
            participantNames: ['田中太郎', '新キャラ'],
          },
        ],
      };
      const result = resolveExtractionResult(resultWithEpisode, existingPersons, new Map());
      expect(result.episodes).toHaveLength(1);
      const ep = result.episodes[0];
      expect(ep.title).toBe('初めての出会い');
      expect(ep.description).toBe('部活で出会った。');
      expect(ep.occurredAt).toBe('高校1年の春');
      // 田中太郎は既存なので person-001
      expect(ep.participantPersonIds).toContain('person-001');
      // 新キャラは新規追加されるのでnewPersonsにIDがある
      const newCharId = result.newPersons.find((p) => p.name === '新キャラ')?.id;
      expect(ep.participantPersonIds).toContain(newCharId);
    });

    it('解決できない参加者は除外され、Episode 自体は保持されること', () => {
      const resultWithUnknownParticipant: LlmExtractionResult = {
        persons: [{ name: '田中太郎', labels: ['人物'] }],
        relationships: [],
        episodes: [
          {
            title: '謎の事件',
            description: null,
            occurredAt: null,
            participantNames: ['田中太郎', '存在しない人'],
          },
        ],
      };
      const result = resolveExtractionResult(resultWithUnknownParticipant, existingPersons, new Map());
      // Episode は保持される
      expect(result.episodes).toHaveLength(1);
      const ep = result.episodes[0];
      // 解決できた田中太郎のみ参加者として含まれる
      expect(ep.participantPersonIds).toContain('person-001');
      expect(ep.participantPersonIds).toHaveLength(1);
    });

    it('全参加者が解決できない場合は Episode をスキップすること', () => {
      const resultWithAllUnknown: LlmExtractionResult = {
        persons: [],
        relationships: [],
        episodes: [
          {
            title: '参加者不明のエピソード',
            description: null,
            occurredAt: null,
            participantNames: ['存在しない人A', '存在しない人B'],
          },
        ],
      };
      const result = resolveExtractionResult(resultWithAllUnknown, existingPersons, new Map());
      expect(result.episodes).toHaveLength(0);
    });

    it('title が空文字の Episode はスキップされること', () => {
      const resultWithEmptyTitle: LlmExtractionResult = {
        persons: [{ name: '田中太郎', labels: ['人物'] }],
        relationships: [],
        episodes: [
          {
            title: '',
            description: null,
            occurredAt: null,
            participantNames: ['田中太郎'],
          },
        ],
      };
      const result = resolveExtractionResult(resultWithEmptyTitle, existingPersons, new Map());
      expect(result.episodes).toHaveLength(0);
    });

    it('description と occurredAt が null の Episode が正しく解決されること', () => {
      const resultWithNulls: LlmExtractionResult = {
        persons: [{ name: '山田花子', labels: ['人物'] }],
        relationships: [],
        episodes: [
          {
            title: '記録のみ',
            description: null,
            occurredAt: null,
            participantNames: ['山田花子'],
          },
        ],
      };
      const result = resolveExtractionResult(resultWithNulls, existingPersons, new Map());
      expect(result.episodes).toHaveLength(1);
      const ep = result.episodes[0];
      expect(ep.description).toBeUndefined();
      expect(ep.occurredAt).toBeUndefined();
    });
  });
});
