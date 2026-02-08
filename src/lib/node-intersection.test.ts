/**
 * ノードの境界との交点計算のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  getCircleIntersection,
  getEdgeIntersectionPoints,
} from './node-intersection';

describe('getCircleIntersection', () => {
  it('円の中心から右方向（0度）の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const radius = 50;
    const targetX = 200;
    const targetY = 100;

    const intersection = getCircleIntersection(
      center,
      radius,
      targetX,
      targetY
    );

    // 右方向なので、x座標は中心 + 半径、y座標は中心と同じ
    expect(intersection.x).toBeCloseTo(150, 1);
    expect(intersection.y).toBeCloseTo(100, 1);
  });

  it('円の中心から左方向（180度）の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const radius = 50;
    const targetX = 0;
    const targetY = 100;

    const intersection = getCircleIntersection(
      center,
      radius,
      targetX,
      targetY
    );

    // 左方向なので、x座標は中心 - 半径、y座標は中心と同じ
    expect(intersection.x).toBeCloseTo(50, 1);
    expect(intersection.y).toBeCloseTo(100, 1);
  });

  it('円の中心から上方向（90度）の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const radius = 50;
    const targetX = 100;
    const targetY = 0;

    const intersection = getCircleIntersection(
      center,
      radius,
      targetX,
      targetY
    );

    // 上方向なので、x座標は中心と同じ、y座標は中心 - 半径
    expect(intersection.x).toBeCloseTo(100, 1);
    expect(intersection.y).toBeCloseTo(50, 1);
  });

  it('円の中心から下方向（270度）の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const radius = 50;
    const targetX = 100;
    const targetY = 200;

    const intersection = getCircleIntersection(
      center,
      radius,
      targetX,
      targetY
    );

    // 下方向なので、x座標は中心と同じ、y座標は中心 + 半径
    expect(intersection.x).toBeCloseTo(100, 1);
    expect(intersection.y).toBeCloseTo(150, 1);
  });

  it('円の中心から斜め右下（45度）の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const radius = 50;
    const targetX = 200;
    const targetY = 200;

    const intersection = getCircleIntersection(
      center,
      radius,
      targetX,
      targetY
    );

    // 45度なので、x座標とy座標は同じ増加量
    const offset = radius / Math.sqrt(2);
    expect(intersection.x).toBeCloseTo(100 + offset, 1);
    expect(intersection.y).toBeCloseTo(100 + offset, 1);
  });
});

describe('getEdgeIntersectionPoints', () => {
  it('2つのノードの境界交点を計算する', () => {
    const sourceNode = {
      id: '1',
      position: { x: 0, y: 0 },
      measured: { width: 100, height: 100 },
    };
    const targetNode = {
      id: '2',
      position: { x: 200, y: 0 },
      measured: { width: 100, height: 100 },
    };

    const { sourcePoint, targetPoint } = getEdgeIntersectionPoints(
      sourceNode,
      targetNode
    );

    // 新しい計算式:
    // - centerY = position.y + PERSON_IMAGE_RADIUS (40px固定)
    // - centerX = position.x + measured.width / 2
    // - radius = PERSON_IMAGE_RADIUS (40px固定)
    // ソースノードの中心(50, 40)、右方向に半径40 → (90, 40)
    expect(sourcePoint.x).toBeCloseTo(90, 1);
    expect(sourcePoint.y).toBeCloseTo(40, 1);
    // ターゲットノードの中心(250, 40)、左方向に半径40 → (210, 40)
    expect(targetPoint.x).toBeCloseTo(210, 1);
    expect(targetPoint.y).toBeCloseTo(40, 1);
  });

  it('measuredが未定義の場合、デフォルト幅を使用する', () => {
    const sourceNode = {
      id: '1',
      position: { x: 0, y: 0 },
      measured: undefined,
    };
    const targetNode = {
      id: '2',
      position: { x: 200, y: 0 },
      measured: undefined,
    };

    const { sourcePoint, targetPoint } = getEdgeIntersectionPoints(
      sourceNode,
      targetNode
    );

    // デフォルト幅（80px）を使用
    // ソースの中心(40, 40)、右方向に半径40 → (80, 40)
    expect(sourcePoint.x).toBeCloseTo(80, 1);
    expect(sourcePoint.y).toBeCloseTo(40, 1);
    // ターゲットの中心(240, 40)、左方向に半径40 → (200, 40)
    expect(targetPoint.x).toBeCloseTo(200, 1);
    expect(targetPoint.y).toBeCloseTo(40, 1);
  });

  it('measuredの有無でY座標が変わらないことを検証', () => {
    const baseNode = {
      id: '1',
      position: { x: 0, y: 0 },
    };
    const targetNode = {
      id: '2',
      position: { x: 200, y: 0 },
      measured: { width: 100, height: 100 },
    };

    // measuredありの場合
    const withMeasured = getEdgeIntersectionPoints(
      { ...baseNode, measured: { width: 100, height: 120 } },
      targetNode
    );

    // measuredなしの場合
    const withoutMeasured = getEdgeIntersectionPoints(
      { ...baseNode, measured: undefined },
      targetNode
    );

    // Y座標は常に position.y + 40 で固定されるべき
    expect(withMeasured.sourcePoint.y).toBeCloseTo(40, 1);
    expect(withoutMeasured.sourcePoint.y).toBeCloseTo(40, 1);
    expect(withMeasured.sourcePoint.y).toBeCloseTo(withoutMeasured.sourcePoint.y, 1);
  });
});
