/**
 * ParticipationEdgeコンポーネントのテスト
 * エピソード↔人物の参加エッジの表示スタイルを検証する
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ParticipationEdge } from './ParticipationEdge';
import type { EdgeProps } from '@xyflow/react';

// React FlowのBaseEdge・useReactFlow・getStraightPathはコンテキストを必要とするためモック
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    BaseEdge: ({ style, ...props }: { style?: React.CSSProperties; [key: string]: unknown }) => (
      <path data-testid="base-edge" style={style} {...props} />
    ),
    getStraightPath: () => ['M 0 0 L 100 100', 50, 50],
    useReactFlow: () => ({
      getNode: (id: string) => {
        // テストに存在するノードIDのみ返す。不明なIDは undefined（実際のuseReactFlowの挙動を再現）
        const knownIds = ['ep-001', 'person-001'];
        if (!knownIds.includes(id)) return undefined;
        return {
          id,
          type: id.startsWith('ep') ? 'episode' : undefined,
          position: { x: 0, y: 0 },
          measured: {
            width: id.startsWith('ep') ? 180 : 80,
            height: id.startsWith('ep') ? 72 : 80,
          },
          data: {},
        };
      },
    }),
  };
});

// EdgePropsの最小限モック
function makeEdgeProps(overrides: Partial<EdgeProps> = {}): EdgeProps {
  return {
    id: 'part-001',
    source: 'ep-001',
    target: 'person-001',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: 'bottom' as const,
    targetPosition: 'top' as const,
    selected: false,
    animated: false,
    data: {},
    style: {},
    markerEnd: '',
    markerStart: '',
    pathOptions: undefined,
    interactionWidth: 20,
    ...overrides,
  } as EdgeProps;
}

describe('ParticipationEdge', () => {
  describe('破線スタイル', () => {
    it('strokeDasharrayが設定されている（破線表示）', () => {
      const { getByTestId } = render(<ParticipationEdge {...makeEdgeProps()} />);

      const edge = getByTestId('base-edge');
      const style = edge.getAttribute('style') ?? '';
      // strokeDasharrayが含まれること
      expect(style).toContain('stroke-dasharray');
    });

    it('マーカーなし（向きなしエッジ）', () => {
      const { getByTestId } = render(<ParticipationEdge {...makeEdgeProps()} />);

      const edge = getByTestId('base-edge');
      // markerEndが渡されていないこと（向きを示す矢印なし）
      const markerEnd = edge.getAttribute('marker-end') ?? '';
      expect(markerEnd).toBe('');
    });
  });

  describe('グレー系の色', () => {
    it('strokeがグレー系の色である', () => {
      const { getByTestId } = render(<ParticipationEdge {...makeEdgeProps()} />);

      const edge = getByTestId('base-edge');
      const style = edge.getAttribute('style') ?? '';
      // strokeにグレー系の色（rgb(156 163 175)はtailwindのgray-400に相当）が含まれること
      expect(style).toMatch(/stroke:\s*(?:rgb\(156,?\s*163,?\s*175\)|#9ca3af)/i);
    });
  });
});
