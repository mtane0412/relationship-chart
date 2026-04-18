/**
 * node-visual.ts のテスト
 * ノードのラベル配列から視覚属性を導出する deriveNodeVisual 関数を検証する
 */

import { describe, it, expect } from 'vitest';
import { deriveNodeVisual } from './node-visual';

describe('deriveNodeVisual', () => {
  describe('人物ノード（デフォルト）', () => {
    it('空配列の場合は人物風の視覚属性を返す', () => {
      const visual = deriveNodeVisual([]);
      expect(visual.shape).toBe('circle');
      expect(visual.defaultIcon).toBe('user');
      expect(visual.kindLabel).toBe('人物');
      expect(visual.cropShape).toBe('round');
    });

    it('人物ラベルを含む場合は人物風の視覚属性を返す', () => {
      const visual = deriveNodeVisual(['人物']);
      expect(visual.shape).toBe('circle');
      expect(visual.defaultIcon).toBe('user');
      expect(visual.kindLabel).toBe('人物');
      expect(visual.cropShape).toBe('round');
    });

    it('人物以外の未知ラベルでも人物風の視覚属性を返す', () => {
      const visual = deriveNodeVisual(['組織', '企業']);
      expect(visual.shape).toBe('circle');
      expect(visual.defaultIcon).toBe('user');
      expect(visual.kindLabel).toBe('人物');
      expect(visual.cropShape).toBe('round');
    });
  });

  describe('物ノード', () => {
    it('物ラベルのみの場合は物風の視覚属性を返す', () => {
      const visual = deriveNodeVisual(['物']);
      expect(visual.shape).toBe('rounded-rect');
      expect(visual.defaultIcon).toBe('package');
      expect(visual.kindLabel).toBe('物');
      expect(visual.cropShape).toBe('rect');
    });

    it('物ラベルが他のラベルと混在していても物風の視覚属性を返す', () => {
      const visual = deriveNodeVisual(['物', '道具']);
      expect(visual.shape).toBe('rounded-rect');
      expect(visual.defaultIcon).toBe('package');
      expect(visual.kindLabel).toBe('物');
      expect(visual.cropShape).toBe('rect');
    });
  });
});
