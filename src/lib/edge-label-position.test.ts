/**
 * edge-label-position.tsのテスト
 * dual-directedエッジのラベル位置計算のテスト
 */

import { describe, it, expect } from 'vitest';
import { calculateLabelPositionOnEdge } from './edge-label-position';

describe('calculateLabelPositionOnEdge', () => {
  it('開始点から0.3の比率でラベル位置を計算する', () => {
    // 開始点(0, 0)から終点(100, 100)への直線上で0.3の位置
    const result = calculateLabelPositionOnEdge(0, 0, 100, 100, 0.3);

    expect(result.labelX).toBe(30);
    expect(result.labelY).toBe(30);
  });

  it('水平線上のラベル位置を計算する', () => {
    // 開始点(0, 50)から終点(100, 50)への水平線上で0.3の位置
    const result = calculateLabelPositionOnEdge(0, 50, 100, 50, 0.3);

    expect(result.labelX).toBe(30);
    expect(result.labelY).toBe(50);
  });

  it('垂直線上のラベル位置を計算する', () => {
    // 開始点(50, 0)から終点(50, 100)への垂直線上で0.3の位置
    const result = calculateLabelPositionOnEdge(50, 0, 50, 100, 0.3);

    expect(result.labelX).toBe(50);
    expect(result.labelY).toBe(30);
  });

  it('負の座標でもラベル位置を計算する', () => {
    // 開始点(-100, -100)から終点(0, 0)への直線上で0.3の位置
    const result = calculateLabelPositionOnEdge(-100, -100, 0, 0, 0.3);

    expect(result.labelX).toBe(-70);
    expect(result.labelY).toBe(-70);
  });

  it('比率0.5で中央位置を計算する', () => {
    // 開始点(0, 0)から終点(100, 100)への直線上で0.5の位置（中央）
    const result = calculateLabelPositionOnEdge(0, 0, 100, 100, 0.5);

    expect(result.labelX).toBe(50);
    expect(result.labelY).toBe(50);
  });

  it('比率0で開始点を計算する', () => {
    // 開始点(10, 20)から終点(100, 100)への直線上で0の位置（開始点）
    const result = calculateLabelPositionOnEdge(10, 20, 100, 100, 0);

    expect(result.labelX).toBe(10);
    expect(result.labelY).toBe(20);
  });

  it('比率1で終点を計算する', () => {
    // 開始点(10, 20)から終点(100, 100)への直線上で1の位置（終点）
    const result = calculateLabelPositionOnEdge(10, 20, 100, 100, 1);

    expect(result.labelX).toBe(100);
    expect(result.labelY).toBe(100);
  });
});
