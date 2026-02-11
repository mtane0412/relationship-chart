/**
 * EGO Network放射状レイアウトのテスト
 * 中心ノードからのグラフ距離に基づいて、ノードを放射状に配置するロジックを検証する
 */

import { describe, it, expect } from 'vitest';
import { computeGraphDistances, computeRadialPositions } from './ego-layout';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

describe('computeGraphDistances', () => {
  it('中心ノード自身の距離は0である', () => {
    // 準備: 1つのノードのみ（孤立ノード）
    const persons: Person[] = [
      { id: 'a', name: 'A', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const relationships: Relationship[] = [];

    // 実行
    const distances = computeGraphDistances('a', persons, relationships);

    // 検証
    expect(distances.get('a')).toBe(0);
  });

  it('直接接続されたノードの距離は1である', () => {
    // 準備: A → B という関係
    const persons: Person[] = [
      { id: 'a', name: 'A', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', name: 'B', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const relationships: Relationship[] = [
      {
        id: 'r1',
        sourcePersonId: 'a',
        targetPersonId: 'b',
        isDirected: true,
        sourceToTargetLabel: 'friend',
        targetToSourceLabel: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    // 実行
    const distances = computeGraphDistances('a', persons, relationships);

    // 検証
    expect(distances.get('a')).toBe(0);
    expect(distances.get('b')).toBe(1);
  });

  it('関係の方向性を無視して無向グラフとして扱う', () => {
    // 準備: A → B という有向関係（Aが中心ではない場合）
    const persons: Person[] = [
      { id: 'a', name: 'A', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', name: 'B', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const relationships: Relationship[] = [
      {
        id: 'r1',
        sourcePersonId: 'a',
        targetPersonId: 'b',
        isDirected: true,
        sourceToTargetLabel: 'one-way',
        targetToSourceLabel: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    // 実行: Bを中心とした場合、A → B の関係でもAに到達できる
    const distances = computeGraphDistances('b', persons, relationships);

    // 検証
    expect(distances.get('b')).toBe(0);
    expect(distances.get('a')).toBe(1);
  });

  it('2ホップ離れたノードの距離は2である', () => {
    // 準備: A → B → C という連鎖
    const persons: Person[] = [
      { id: 'a', name: 'A', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', name: 'B', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'c', name: 'C', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const relationships: Relationship[] = [
      {
        id: 'r1',
        sourcePersonId: 'a',
        targetPersonId: 'b',
        isDirected: false,
        sourceToTargetLabel: 'friend',
        targetToSourceLabel: 'friend',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'r2',
        sourcePersonId: 'b',
        targetPersonId: 'c',
        isDirected: false,
        sourceToTargetLabel: 'friend',
        targetToSourceLabel: 'friend',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    // 実行
    const distances = computeGraphDistances('a', persons, relationships);

    // 検証
    expect(distances.get('a')).toBe(0);
    expect(distances.get('b')).toBe(1);
    expect(distances.get('c')).toBe(2);
  });

  it('複数の経路がある場合は最短距離を返す', () => {
    // 準備: A → B → C と A → C という2つの経路
    const persons: Person[] = [
      { id: 'a', name: 'A', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', name: 'B', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'c', name: 'C', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const relationships: Relationship[] = [
      {
        id: 'r1',
        sourcePersonId: 'a',
        targetPersonId: 'b',
        isDirected: false,
        sourceToTargetLabel: 'friend',
        targetToSourceLabel: 'friend',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'r2',
        sourcePersonId: 'b',
        targetPersonId: 'c',
        isDirected: false,
        sourceToTargetLabel: 'friend',
        targetToSourceLabel: 'friend',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'r3',
        sourcePersonId: 'a',
        targetPersonId: 'c',
        isDirected: false,
        sourceToTargetLabel: 'best friend',
        targetToSourceLabel: 'best friend',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    // 実行
    const distances = computeGraphDistances('a', persons, relationships);

    // 検証: Cへは直接接続（距離1）が最短
    expect(distances.get('a')).toBe(0);
    expect(distances.get('b')).toBe(1);
    expect(distances.get('c')).toBe(1);
  });

  it('到達不可能なノードはMapに含まれない', () => {
    // 準備: A → B と 孤立したC
    const persons: Person[] = [
      { id: 'a', name: 'A', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', name: 'B', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'c', name: 'C', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const relationships: Relationship[] = [
      {
        id: 'r1',
        sourcePersonId: 'a',
        targetPersonId: 'b',
        isDirected: false,
        sourceToTargetLabel: 'friend',
        targetToSourceLabel: 'friend',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    // 実行
    const distances = computeGraphDistances('a', persons, relationships);

    // 検証: Cは到達不可能なのでMapに含まれない
    expect(distances.has('a')).toBe(true);
    expect(distances.has('b')).toBe(true);
    expect(distances.has('c')).toBe(false);
  });
});

describe('computeRadialPositions', () => {
  const defaultParams = {
    ringSpacing: 200,
    firstRingRadius: 200,
  };

  const defaultCenter = { x: 400, y: 300 };

  it('中心ノードは指定した座標に配置される', () => {
    // 準備
    const egoNodeId = 'a';
    const distances = new Map([['a', 0]]);
    const allPersonIds = ['a'];

    // 実行
    const positions = computeRadialPositions(
      egoNodeId,
      distances,
      allPersonIds,
      defaultParams,
      defaultCenter
    );

    // 検証
    expect(positions.get('a')).toEqual({ x: 400, y: 300 });
  });

  it('距離1のノードは第1リング（半径200）に配置される', () => {
    // 準備: 中心Aから距離1のノードB
    const egoNodeId = 'a';
    const distances = new Map([
      ['a', 0],
      ['b', 1],
    ]);
    const allPersonIds = ['a', 'b'];

    // 実行
    const positions = computeRadialPositions(
      egoNodeId,
      distances,
      allPersonIds,
      defaultParams,
      defaultCenter
    );

    // 検証: 中心から半径200の位置にある
    const posA = positions.get('a')!;
    const posB = positions.get('b')!;
    const distance = Math.sqrt((posB.x - posA.x) ** 2 + (posB.y - posA.y) ** 2);
    expect(distance).toBeCloseTo(200, 0);
  });

  it('距離2のノードは第2リング（半径400）に配置される', () => {
    // 準備
    const egoNodeId = 'a';
    const distances = new Map([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ]);
    const allPersonIds = ['a', 'b', 'c'];

    // 実行
    const positions = computeRadialPositions(
      egoNodeId,
      distances,
      allPersonIds,
      defaultParams,
      defaultCenter
    );

    // 検証: 中心から半径400の位置にある
    const posA = positions.get('a')!;
    const posC = positions.get('c')!;
    const distance = Math.sqrt((posC.x - posA.x) ** 2 + (posC.y - posA.y) ** 2);
    expect(distance).toBeCloseTo(400, 0);
  });

  it('同じリング上の複数ノードは等間隔に配置される', () => {
    // 準備: 距離1のノードが3つ
    const egoNodeId = 'a';
    const distances = new Map([
      ['a', 0],
      ['b', 1],
      ['c', 1],
      ['d', 1],
    ]);
    const allPersonIds = ['a', 'b', 'c', 'd'];

    // 実行
    const positions = computeRadialPositions(
      egoNodeId,
      distances,
      allPersonIds,
      defaultParams,
      defaultCenter
    );

    // 検証: 3つのノードすべてが同じ半径（200）上にあることを確認
    const posA = positions.get('a')!;
    const posB = positions.get('b')!;
    const posC = positions.get('c')!;
    const posD = positions.get('d')!;

    const distanceB = Math.sqrt((posB.x - posA.x) ** 2 + (posB.y - posA.y) ** 2);
    const distanceC = Math.sqrt((posC.x - posA.x) ** 2 + (posC.y - posA.y) ** 2);
    const distanceD = Math.sqrt((posD.x - posA.x) ** 2 + (posD.y - posA.y) ** 2);

    // すべて半径200に配置される
    expect(distanceB).toBeCloseTo(200, 0);
    expect(distanceC).toBeCloseTo(200, 0);
    expect(distanceD).toBeCloseTo(200, 0);

    // さらに、隣接ノード間の角度差が等しいことを確認
    // 3つのノードなので角度差は約120度（2π/3ラジアン）
    const angles = [
      Math.atan2(posB.y - posA.y, posB.x - posA.x),
      Math.atan2(posC.y - posA.y, posC.x - posA.x),
      Math.atan2(posD.y - posA.y, posD.x - posA.x),
    ].sort((a, b) => a - b);

    // 角度をソートしてから差を計算
    const diff1 = angles[1] - angles[0];
    const diff2 = angles[2] - angles[1];
    const diff3 = 2 * Math.PI - (angles[2] - angles[0]); // 最後のノードから最初のノードへの角度差

    // すべての角度差が約120度であることを確認
    expect(diff1).toBeCloseTo((2 * Math.PI) / 3, 1);
    expect(diff2).toBeCloseTo((2 * Math.PI) / 3, 1);
    expect(diff3).toBeCloseTo((2 * Math.PI) / 3, 1);
  });

  it('到達不可能なノードは最外周の外側に配置される', () => {
    // 準備: A-B（距離1）と孤立したC
    const egoNodeId = 'a';
    const distances = new Map([
      ['a', 0],
      ['b', 1],
      // cは到達不可能（distancesに含まれない）
    ]);
    const allPersonIds = ['a', 'b', 'c'];

    // 実行
    const positions = computeRadialPositions(
      egoNodeId,
      distances,
      allPersonIds,
      defaultParams,
      defaultCenter
    );

    // 検証: Cは最外周（距離1）の外側、つまり半径400に配置される
    const posA = positions.get('a')!;
    const posC = positions.get('c')!;
    const distance = Math.sqrt((posC.x - posA.x) ** 2 + (posC.y - posA.y) ** 2);

    // 最外周の距離は1なので、次のリングは半径400（firstRingRadius + ringSpacing）
    expect(distance).toBeCloseTo(400, 0);
  });

  it('カスタムパラメータが正しく適用される', () => {
    // 準備
    const egoNodeId = 'a';
    const distances = new Map([
      ['a', 0],
      ['b', 1],
    ]);
    const allPersonIds = ['a', 'b'];
    const customParams = {
      ringSpacing: 300,
      firstRingRadius: 150,
    };

    // 実行
    const positions = computeRadialPositions(
      egoNodeId,
      distances,
      allPersonIds,
      customParams,
      defaultCenter
    );

    // 検証: 第1リングは半径150
    const posA = positions.get('a')!;
    const posB = positions.get('b')!;
    const distance = Math.sqrt((posB.x - posA.x) ** 2 + (posB.y - posA.y) ** 2);
    expect(distance).toBeCloseTo(150, 0);
  });
});
