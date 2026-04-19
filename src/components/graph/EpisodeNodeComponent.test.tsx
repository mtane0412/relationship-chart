/**
 * EpisodeNodeComponentのテスト
 * エピソードノードの表示内容とインタラクションを検証
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EpisodeNodeComponent } from './EpisodeNodeComponent';

// React FlowのHandleはzustandプロバイダを必要とするためモック
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    Handle: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div data-testid={`handle-${props.type}-${props.id}`} {...props}>
        {children}
      </div>
    ),
  };
});

// React FlowのNodePropsの最小限モック
function makeNodeProps(data: Record<string, unknown>, selected = false) {
  return {
    id: 'ep-001',
    data,
    selected,
    type: 'episode',
    dragging: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
  } as Parameters<typeof EpisodeNodeComponent>[0];
}

describe('EpisodeNodeComponent', () => {
  describe('タイトル表示', () => {
    it('エピソードのタイトルを表示する', () => {
      render(
        <EpisodeNodeComponent
          {...makeNodeProps({ title: '初めての出会い', relatedRelationshipIds: [] })}
        />
      );

      expect(screen.getByText('初めての出会い')).toBeInTheDocument();
    });
  });

  describe('発生日時の表示', () => {
    it('occurredAtが指定されている場合は表示する', () => {
      render(
        <EpisodeNodeComponent
          {...makeNodeProps({ title: '再会', occurredAt: '第5話', relatedRelationshipIds: [] })}
        />
      );

      expect(screen.getByText('第5話')).toBeInTheDocument();
    });

    it('occurredAtが指定されていない場合は表示しない', () => {
      const { container } = render(
        <EpisodeNodeComponent
          {...makeNodeProps({ title: '別れ', relatedRelationshipIds: [] })}
        />
      );

      // 日時バッジが存在しないこと
      expect(container.querySelector('[data-testid="episode-date"]')).not.toBeInTheDocument();
    });
  });

  describe('説明文の表示', () => {
    it('descriptionがある場合は表示する', () => {
      render(
        <EpisodeNodeComponent
          {...makeNodeProps({
            title: '決別',
            description: '二人の関係が決定的に壊れた場面',
            relatedRelationshipIds: [],
          })}
        />
      );

      expect(screen.getByText('二人の関係が決定的に壊れた場面')).toBeInTheDocument();
    });

    it('descriptionがない場合は説明テキストを表示しない', () => {
      const { container } = render(
        <EpisodeNodeComponent
          {...makeNodeProps({ title: '邂逅', relatedRelationshipIds: [] })}
        />
      );

      expect(container.querySelector('[data-testid="episode-description"]')).not.toBeInTheDocument();
    });
  });
});
