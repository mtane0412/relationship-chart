/**
 * テスト用ファクトリ関数
 * テスト全体で使用する Person / SnapshotPerson オブジェクトの生成ヘルパー
 */

import type { Person } from '@/types/person';
import type { SnapshotPerson } from '@/types/snapshot';

/**
 * Person オブジェクトを生成するファクトリ
 * v15 フィールド（tags / narrative / colorOverride / updatedAt）にはデフォルト値を設定する
 *
 * @param overrides - 上書きしたいフィールド（id と name は必須）
 */
export function makePerson(overrides: Partial<Person> & { id: string; name: string }): Person {
  return {
    labels: ['人物'],
    properties: {},
    tags: [],
    narrative: { summary: null, notes: null },
    colorOverride: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * SnapshotPerson オブジェクトを生成するファクトリ
 *
 * @param overrides - 上書きしたいフィールド（personId と name は必須）
 */
export function makeSnapshotPerson(overrides: Partial<SnapshotPerson> & { personId: string; name: string }): SnapshotPerson {
  return {
    labels: ['人物'],
    properties: {},
    tags: [],
    narrative: { summary: null, notes: null },
    colorOverride: null,
    ...overrides,
  };
}
