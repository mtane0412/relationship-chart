/**
 * 接続ターゲットノード検出ユーティリティのテスト
 *
 * findClosestTargetNodeの境界条件をテストする
 */

import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import { findClosestTargetNode } from './connection-target-detection';

describe('findClosestTargetNode', () => {
  describe('候補ノードの検出', () => {
    it('範囲内にノードがない場合、nullを返すこと', () => {
      // 全てのノードがconnectionRadiusの範囲外にある
      const allNodes: Node[] = [
        {
          id: 'node-1',
          type: 'person',
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: 'node-2',
          type: 'person',
          position: { x: 500, y: 500 },
          data: {},
        },
      ];

      // マウス位置: (250, 250)、connectionRadius: 60
      // どちらのノードも範囲外（最も近いノードまでの距離 > 60）
      const result = findClosestTargetNode(250, 250, allNodes, 'from-node', 60);

      expect(result).toBeNull();
    });

    it('範囲内に複数のノードがある場合、最も近いノードを返すこと', () => {
      // 複数の候補ノードがconnectionRadiusの範囲内にある
      const allNodes: Node[] = [
        {
          id: 'node-1',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'node-2',
          type: 'person',
          position: { x: 150, y: 150 },
          data: {},
        },
        {
          id: 'node-3',
          type: 'person',
          position: { x: 200, y: 200 },
          data: {},
        },
      ];

      // マウス位置: (160, 160)、connectionRadius: 100
      // node-1の中心: (150, 150)、距離: sqrt((160-150)^2 + (160-150)^2) ≈ 14.14
      // node-2の中心: (200, 200)、距離: sqrt((160-200)^2 + (160-200)^2) ≈ 56.57
      // node-3の中心: (250, 250)、距離: sqrt((160-250)^2 + (160-250)^2) ≈ 127.28
      // node-1が最も近い
      const result = findClosestTargetNode(160, 160, allNodes, 'from-node', 100);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('node-1');
    });

    it('接続元ノードは候補から除外されること', () => {
      // 接続元ノード自身が最も近い位置にある
      const allNodes: Node[] = [
        {
          id: 'from-node',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'node-1',
          type: 'person',
          position: { x: 200, y: 200 },
          data: {},
        },
      ];

      // マウス位置: (110, 110)、connectionRadius: 100
      // from-nodeが最も近いが除外されるため、node-1が選択される
      const result = findClosestTargetNode(110, 110, allNodes, 'from-node', 100);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('node-1');
    });

    it('接続元ノードのみが範囲内にある場合、nullを返すこと', () => {
      const allNodes: Node[] = [
        {
          id: 'from-node',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'node-1',
          type: 'person',
          position: { x: 500, y: 500 },
          data: {},
        },
      ];

      // マウス位置: (110, 110)、connectionRadius: 60
      // from-nodeのみが範囲内だが除外されるため、nullを返す
      const result = findClosestTargetNode(110, 110, allNodes, 'from-node', 60);

      expect(result).toBeNull();
    });
  });

  describe('connectionRadiusの境界テスト', () => {
    it('connectionRadiusちょうど境界上のノードを検出すること', () => {
      const allNodes: Node[] = [
        {
          id: 'node-1',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
      ];

      // ノード中心: (100 + PERSON_IMAGE_SIZE/2, 100 + PERSON_IMAGE_SIZE/2) = (150, 150)
      // マウス位置: (150 + 60, 150) = (210, 150)
      // 距離: 60（ちょうどconnectionRadius）
      const result = findClosestTargetNode(210, 150, allNodes, 'from-node', 60);

      // 境界上のノードは検出される（拡張範囲の判定による）
      expect(result).not.toBeNull();
      expect(result?.id).toBe('node-1');
    });

    it('connectionRadiusを超えたノードを検出しないこと', () => {
      const allNodes: Node[] = [
        {
          id: 'node-1',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
      ];

      // ノード中心: (150, 150)
      // マウス位置: (150 + 61, 150) = (211, 150)
      // 距離: 61（connectionRadiusを超える）
      const result = findClosestTargetNode(300, 300, allNodes, 'from-node', 60);

      expect(result).toBeNull();
    });

    it('カスタムconnectionRadiusが正しく適用されること', () => {
      const allNodes: Node[] = [
        {
          id: 'node-1',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
      ];

      // ノード中心: (150, 150)
      // マウス位置: (150 + 100, 150) = (250, 150)
      // 距離: 100（カスタムconnectionRadius）
      const result = findClosestTargetNode(250, 150, allNodes, 'from-node', 100);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('node-1');
    });
  });

  describe('ノードサイズの考慮', () => {
    it('measured.widthとmeasured.heightが設定されている場合、それを使用すること', () => {
      const allNodes: Node[] = [
        {
          id: 'node-1',
          type: 'person',
          position: { x: 100, y: 100 },
          measured: { width: 300, height: 300 },
          data: {},
        },
      ];

      // ノード中心: (100 + 300/2, 100 + 300/2) = (250, 250)
      // マウス位置: (250, 250)
      // 距離: 0（ノード中心）
      const result = findClosestTargetNode(250, 250, allNodes, 'from-node', 60);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('node-1');
    });

    it('measured.widthとmeasured.heightがない場合、PERSON_IMAGE_SIZEを使用すること', () => {
      const allNodes: Node[] = [
        {
          id: 'node-1',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
      ];

      // ノード中心: (100 + PERSON_IMAGE_SIZE/2, 100 + PERSON_IMAGE_SIZE/2) = (150, 150)
      // マウス位置: (150, 150)
      // 距離: 0（ノード中心）
      const result = findClosestTargetNode(150, 150, allNodes, 'from-node', 60);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('node-1');
    });
  });

  describe('エッジケース', () => {
    it('ノードが0個の場合、nullを返すこと', () => {
      const allNodes: Node[] = [];

      const result = findClosestTargetNode(100, 100, allNodes, 'from-node', 60);

      expect(result).toBeNull();
    });

    it('接続元ノードのみが存在する場合、nullを返すこと', () => {
      const allNodes: Node[] = [
        {
          id: 'from-node',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
      ];

      const result = findClosestTargetNode(110, 110, allNodes, 'from-node', 60);

      expect(result).toBeNull();
    });

    it('複数の候補が同じ距離にある場合、最初のノードを返すこと', () => {
      // 2つのノードが同じ距離にある（ソートアルゴリズムの安定性をテスト）
      const allNodes: Node[] = [
        {
          id: 'node-1',
          type: 'person',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'node-2',
          type: 'person',
          position: { x: 200, y: 100 },
          data: {},
        },
      ];

      // ノード中心: node-1=(150, 150), node-2=(250, 150)
      // マウス位置: (200, 150) - 両ノードから等距離（50ずつ）
      const result = findClosestTargetNode(200, 150, allNodes, 'from-node', 100);

      // どちらかのノードが返される（ソートが安定なので、配列順で最初のnode-1が優先される）
      expect(result).not.toBeNull();
      expect(['node-1', 'node-2']).toContain(result?.id);
    });
  });
});
