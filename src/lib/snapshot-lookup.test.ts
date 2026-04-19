/**
 * snapshot-lookup ユーティリティのテスト
 *
 * findSnapshotIndexByLabel の正規化済み完全一致マッチングを検証する
 */

import { describe, it, expect } from 'vitest';
import { findSnapshotIndexByLabel } from './snapshot-lookup';
import type { Snapshot } from '@/types/snapshot';

/** テスト用スナップショットのファクトリ */
function makeSnapshot(id: string, label: string): Snapshot {
  return {
    id,
    label,
    persons: [],
    relationships: [],
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('findSnapshotIndexByLabel', () => {
  const snapshots = [
    makeSnapshot('s1', '第1話'),
    makeSnapshot('s2', '第2話'),
    makeSnapshot('s3', '2024年春'),
    makeSnapshot('s4', 'ラスト'),
  ];

  it('完全一致するラベルのインデックスを返す', () => {
    expect(findSnapshotIndexByLabel('第1話', snapshots)).toBe(0);
    expect(findSnapshotIndexByLabel('2024年春', snapshots)).toBe(2);
    expect(findSnapshotIndexByLabel('ラスト', snapshots)).toBe(3);
  });

  it('前後の空白を正規化して一致させる', () => {
    expect(findSnapshotIndexByLabel('  第1話  ', snapshots)).toBe(0);
    expect(findSnapshotIndexByLabel('\t第2話\t', snapshots)).toBe(1);
  });

  it('連続する全角・半角スペースを正規化して一致させる', () => {
    const snapshotsWithSpace = [makeSnapshot('s1', '2024 年春')];
    expect(findSnapshotIndexByLabel('2024　年春', snapshotsWithSpace)).toBe(0);
    expect(findSnapshotIndexByLabel('2024  年春', snapshotsWithSpace)).toBe(0);
  });

  it('大文字小文字を無視して一致させる', () => {
    const snapshotsEN = [makeSnapshot('s1', 'Chapter One')];
    expect(findSnapshotIndexByLabel('chapter one', snapshotsEN)).toBe(0);
    expect(findSnapshotIndexByLabel('CHAPTER ONE', snapshotsEN)).toBe(0);
  });

  it('一致しないラベルのときは null を返す', () => {
    expect(findSnapshotIndexByLabel('第10話', snapshots)).toBeNull();
    expect(findSnapshotIndexByLabel('存在しない', snapshots)).toBeNull();
  });

  it('空文字列のときは null を返す', () => {
    expect(findSnapshotIndexByLabel('', snapshots)).toBeNull();
  });

  it('スナップショット配列が空のときは null を返す', () => {
    expect(findSnapshotIndexByLabel('第1話', [])).toBeNull();
  });

  it('複数のスナップショットが同じ正規化済みラベルを持つとき、最初のインデックスを返す', () => {
    const duplicates = [
      makeSnapshot('a', '第1話'),
      makeSnapshot('b', '第1話'),
    ];
    expect(findSnapshotIndexByLabel('第1話', duplicates)).toBe(0);
  });

  it('部分一致ではマッチしない（完全一致のみ）', () => {
    expect(findSnapshotIndexByLabel('第1', snapshots)).toBeNull();
    expect(findSnapshotIndexByLabel('話', snapshots)).toBeNull();
  });
});
