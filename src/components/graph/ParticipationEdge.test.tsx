/**
 * ParticipationEdgeコンポーネントのテスト
 * エピソード↔人物の参加エッジの表示スタイルを検証する
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ParticipationEdge } from './ParticipationEdge';
import type { EdgeProps } from '@xyflow/react';

// React FlowのBaseEdgeはzustandプロバイダを必要とするためモック
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    BaseEdge: ({ style, ...props }: { style?: React.CSSProperties; [key: string]: unknown }) => (
      <path data-testid="base-edge" style={style} {...props} />
    ),
    getStraightPath: () => ['M 0 0 L 100 100', 50, 50],
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
