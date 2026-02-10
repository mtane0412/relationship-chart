/**
 * collision-resolver.test.ts
 * ノード衝突解消アルゴリズムのテスト
 */

import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import { resolveCollisions, DEFAULT_COLLISION_OPTIONS, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './collision-resolver';

describe('resolveCollisions', () => {
  it('ノード0個で空配列を返す', () => {
    const nodes: Node[] = [];
    const result = resolveCollisions(nodes, DEFAULT_COLLISION_OPTIONS);
    expect(result).toEqual([]);
  });

  it('ノード1個で位置不変', () => {
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: {}, type: 'person' },
    ];
    const result = resolveCollisions(nodes, DEFAULT_COLLISION_OPTIONS);
    expect(result).toEqual(nodes);
  });

  it('重なりなしのノード2個で位置不変', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        position: { x: 200, y: 200 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    const result = resolveCollisions(nodes, DEFAULT_COLLISION_OPTIONS);
    expect(result).toEqual(nodes);
  });

  it('完全に同じ位置のノード2個で押し出し', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 100, y: 100 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        position: { x: 100, y: 100 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    const result = resolveCollisions(nodes, DEFAULT_COLLISION_OPTIONS);

    // 位置が変更されているはず
    expect(result[0].position).not.toEqual({ x: 100, y: 100 });
    expect(result[1].position).not.toEqual({ x: 100, y: 100 });

    // 2つのノードが離れているはず
    const dx = result[1].position.x - result[0].position.x;
    const dy = result[1].position.y - result[0].position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    expect(distance).toBeGreaterThan(0);
  });

  it('X方向の重なりが小さい場合にX方向へ押し出し', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        // X方向の重なり: 10px、Y方向の重なり: 110px
        position: { x: 90, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    const result = resolveCollisions(nodes, DEFAULT_COLLISION_OPTIONS);

    // X方向に押し出されているはず（最小重なり軸）
    const initialDx = Math.abs(nodes[1].position.x - nodes[0].position.x);
    const resolvedDx = Math.abs(result[1].position.x - result[0].position.x);
    expect(resolvedDx).toBeGreaterThan(initialDx);
  });

  it('Y方向の重なりが小さい場合にY方向へ押し出し', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        // X方向の重なり: 100px、Y方向の重なり: 10px
        position: { x: 0, y: 100 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    const result = resolveCollisions(nodes, DEFAULT_COLLISION_OPTIONS);

    // Y方向に押し出されているはず（最小重なり軸）
    const initialDy = Math.abs(nodes[1].position.y - nodes[0].position.y);
    const resolvedDy = Math.abs(result[1].position.y - result[0].position.y);
    expect(resolvedDy).toBeGreaterThan(initialDy);
  });

  it('margin考慮で余白が確保される', () => {
    const margin = 15;
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        // ノード境界が接触（margin=0なら衝突なし）
        position: { x: DEFAULT_NODE_WIDTH, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    const result = resolveCollisions(nodes, { ...DEFAULT_COLLISION_OPTIONS, margin });

    // marginを考慮して押し出されているはず
    const resolvedDx = Math.abs(result[1].position.x - result[0].position.x);
    expect(resolvedDx).toBeGreaterThanOrEqual(DEFAULT_NODE_WIDTH + margin);
  });

  it('overlapThreshold以下は無視', () => {
    const overlapThreshold = 10;
    const margin = 0; // marginを0にして、純粋な重なりのみをテスト
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        // 重なり: 5px（threshold以下）
        position: { x: DEFAULT_NODE_WIDTH - 5, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    const result = resolveCollisions(nodes, { ...DEFAULT_COLLISION_OPTIONS, overlapThreshold, margin });

    // 位置が変更されていないはず
    expect(result).toEqual(nodes);
  });

  it('maxIterations到達で終了', () => {
    // 3つのノードを完全に重ねる（解消に複数イテレーションが必要）
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 100, y: 100 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        position: { x: 100, y: 100 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '3',
        position: { x: 100, y: 100 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    const result = resolveCollisions(nodes, { ...DEFAULT_COLLISION_OPTIONS, maxIterations: 1 });

    // 1イテレーションで完全には解消されないが、処理が終了すること
    expect(result).toBeDefined();
    expect(result.length).toBe(3);
  });

  it('3ノード密集で全衝突解消', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 100, y: 100 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        // X方向に70px重なる（より解消しやすい密集状態）
        position: { x: 130, y: 100 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '3',
        // Y方向に75px重なる（より解消しやすい密集状態）
        position: { x: 100, y: 135 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    // 3ノードの密集状態は解消に多くのイテレーションが必要
    const result = resolveCollisions(nodes, { ...DEFAULT_COLLISION_OPTIONS, maxIterations: 100 });

    // すべてのノードペアが重ならないことを確認（marginを含めた拡張バウンディングボックスで）
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const nodeA = result[i];
        const nodeB = result[j];
        const widthA = nodeA.measured?.width ?? DEFAULT_NODE_WIDTH;
        const heightA = nodeA.measured?.height ?? DEFAULT_NODE_HEIGHT;
        const widthB = nodeB.measured?.width ?? DEFAULT_NODE_WIDTH;
        const heightB = nodeB.measured?.height ?? DEFAULT_NODE_HEIGHT;

        // marginを含めた拡張バウンディングボックスでの重なりをチェック
        const overlapX = Math.max(
          0,
          Math.min(
            nodeA.position.x + widthA + DEFAULT_COLLISION_OPTIONS.margin,
            nodeB.position.x + widthB + DEFAULT_COLLISION_OPTIONS.margin
          ) - Math.max(nodeA.position.x, nodeB.position.x)
        );
        const overlapY = Math.max(
          0,
          Math.min(
            nodeA.position.y + heightA + DEFAULT_COLLISION_OPTIONS.margin,
            nodeB.position.y + heightB + DEFAULT_COLLISION_OPTIONS.margin
          ) - Math.max(nodeA.position.y, nodeB.position.y)
        );

        // AABB衝突判定: 両方向で重なりがある場合のみ衝突
        // つまり、どちらか一方の重なりが閾値以下なら衝突なし
        const hasCollision =
          overlapX > DEFAULT_COLLISION_OPTIONS.overlapThreshold &&
          overlapY > DEFAULT_COLLISION_OPTIONS.overlapThreshold;

        // 衝突がないことを確認
        expect(hasCollision).toBe(false);
      }
    }
  });

  it('未移動ノードは参照同一性を保持', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
      {
        id: '2',
        position: { x: 200, y: 200 },
        data: {},
        type: 'person',
        measured: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      },
    ];
    const result = resolveCollisions(nodes, DEFAULT_COLLISION_OPTIONS);

    // 重なりがないため、同じ参照が返るはず
    expect(result[0]).toBe(nodes[0]);
    expect(result[1]).toBe(nodes[1]);
  });

  it('measured未定義でフォールバック値使用', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: {},
        type: 'person',
        // measuredなし
      },
      {
        id: '2',
        position: { x: 50, y: 0 },
        data: {},
        type: 'person',
        // measuredなし
      },
    ];
    const result = resolveCollisions(nodes, DEFAULT_COLLISION_OPTIONS);

    // デフォルト値で衝突判定が行われ、押し出されているはず
    const resolvedDx = Math.abs(result[1].position.x - result[0].position.x);
    expect(resolvedDx).toBeGreaterThanOrEqual(DEFAULT_NODE_WIDTH);
  });
});
