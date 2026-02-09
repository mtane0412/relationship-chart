/**
 * ノードの境界との交点計算のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  getCircleIntersection,
  getRectIntersection,
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

  it('物ノード（type: "item"）との交点を計算する', () => {
    const sourceNode = {
      id: '1',
      type: 'item',
      position: { x: 0, y: 0 },
      measured: { width: 80, height: 80 },
    };
    const targetNode = {
      id: '2',
      type: 'person',
      position: { x: 200, y: 0 },
      measured: { width: 80, height: 80 },
    };

    const { sourcePoint, targetPoint } = getEdgeIntersectionPoints(
      sourceNode,
      targetNode
    );

    // 物ノード（四角形）の中心(40, 40)から右方向 → 右辺の中点(80, 40)
    expect(sourcePoint.x).toBeCloseTo(80, 1);
    expect(sourcePoint.y).toBeCloseTo(40, 1);
    // 人ノード（円形）の中心(240, 40)から左方向 → 左側の境界(200, 40)
    expect(targetPoint.x).toBeCloseTo(200, 1);
    expect(targetPoint.y).toBeCloseTo(40, 1);
  });

  it('物ノード同士の交点を計算する', () => {
    const sourceNode = {
      id: '1',
      type: 'item',
      position: { x: 0, y: 0 },
      measured: { width: 80, height: 80 },
    };
    const targetNode = {
      id: '2',
      type: 'item',
      position: { x: 200, y: 0 },
      measured: { width: 80, height: 80 },
    };

    const { sourcePoint, targetPoint } = getEdgeIntersectionPoints(
      sourceNode,
      targetNode
    );

    // 両方とも四角形
    // ソース: 中心(40, 40)から右方向 → 右辺の中点(80, 40)
    expect(sourcePoint.x).toBeCloseTo(80, 1);
    expect(sourcePoint.y).toBeCloseTo(40, 1);
    // ターゲット: 中心(240, 40)から左方向 → 左辺の中点(200, 40)
    expect(targetPoint.x).toBeCloseTo(200, 1);
    expect(targetPoint.y).toBeCloseTo(40, 1);
  });
});

describe('getRectIntersection', () => {
  it('四角形の中心から右方向の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 200;
    const targetY = 100;

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 右方向なので、右辺の中点(140, 100)
    expect(intersection.x).toBeCloseTo(140, 1);
    expect(intersection.y).toBeCloseTo(100, 1);
  });

  it('四角形の中心から左方向の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 0;
    const targetY = 100;

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 左方向なので、左辺の中点(60, 100)
    expect(intersection.x).toBeCloseTo(60, 1);
    expect(intersection.y).toBeCloseTo(100, 1);
  });

  it('四角形の中心から上方向の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 100;
    const targetY = 0;

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 上方向なので、上辺の中点(100, 60)
    expect(intersection.x).toBeCloseTo(100, 1);
    expect(intersection.y).toBeCloseTo(60, 1);
  });

  it('四角形の中心から下方向の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 100;
    const targetY = 200;

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 下方向なので、下辺の中点(100, 140)
    expect(intersection.x).toBeCloseTo(100, 1);
    expect(intersection.y).toBeCloseTo(140, 1);
  });

  it('四角形の中心から斜め右下の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 200;
    const targetY = 200;

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 斜め右下方向
    // 角度が45度なので、右辺または下辺のどちらかと交差する
    // width === height の場合、右辺と下辺の交点は(140, 140)
    expect(intersection.x).toBeCloseTo(140, 1);
    expect(intersection.y).toBeCloseTo(140, 1);
  });

  it('四角形の中心から少し左下の交点を計算する（重要: エッジが辺上を滑らない）', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 80; // 中心より少し左
    const targetY = 200; // 中心より下

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 方向ベクトル: dx = -20, dy = 100
    // 下辺（y=140）との交点: x = 100 + (-20) * ((140-100) / 100) = 100 - 8 = 92
    // エッジは常に中心(100, 100)から(80, 200)に向かう光線上にあるべき
    expect(intersection.x).toBeCloseTo(92, 1);
    expect(intersection.y).toBeCloseTo(140, 1);
  });

  it('四角形の中心から斜め左下の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 0; // 中心より左
    const targetY = 200; // 中心より下

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 方向ベクトル: dx = -100, dy = 100
    // 左辺（x=60）との交点: y = 100 + 100 * ((60-100) / -100) = 100 + 40 = 140
    // しかし、y=140は下辺の位置なので、角(60, 140)に近い
    // 実際には左辺（x=60）との交点を計算: y = 100 + 100 * ((60-100) / -100) = 100 + 40 = 140
    // 下辺（y=140）との交点を計算: x = 100 + (-100) * ((140-100) / 100) = 100 - 40 = 60
    // 両方とも角(60, 140)を指す → 角の位置
    expect(intersection.x).toBeCloseTo(60, 1);
    expect(intersection.y).toBeCloseTo(140, 1);
  });

  it('四角形の中心から斜め左上の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 0;
    const targetY = 0;

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 斜め左上方向（45度）
    // 角(60, 60)
    expect(intersection.x).toBeCloseTo(60, 1);
    expect(intersection.y).toBeCloseTo(60, 1);
  });

  it('四角形の中心から斜め右上の交点を計算する', () => {
    const center = { x: 100, y: 100 };
    const width = 80;
    const height = 80;
    const targetX = 200;
    const targetY = 0;

    const intersection = getRectIntersection(
      center,
      width,
      height,
      targetX,
      targetY
    );

    // 斜め右上方向（45度）
    // 角(140, 60)
    expect(intersection.x).toBeCloseTo(140, 1);
    expect(intersection.y).toBeCloseTo(60, 1);
  });
});
