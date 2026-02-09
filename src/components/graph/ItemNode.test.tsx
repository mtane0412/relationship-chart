/**
 * ItemNodeコンポーネントのテスト
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItemNode } from './ItemNode';
import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { PersonNodeData } from '@/types/graph';

// React Flowのフックをモック
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    Handle: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div data-testid={`handle-${props.type}-${props.id}`} {...props}>
        {children}
      </div>
    ),
    useConnection: () => ({ inProgress: false }),
  };
});

describe('ItemNode', () => {
  // 画像付き物ノードのモックデータ
  const mockDataWithImage: PersonNodeData = {
    name: 'ノートパソコン',
    imageDataUrl: 'data:image/jpeg;base64,mockImageData',
    kind: 'item',
  };

  // 画像なし物ノードのモックデータ
  const mockDataWithoutImage: PersonNodeData = {
    name: 'スマートフォン',
    imageDataUrl: undefined,
    kind: 'item',
  };

  // NodePropsの基本モック
  const createMockProps = (data: PersonNodeData, selected = false): Partial<NodeProps> => ({
    id: 'test-item-1',
    type: 'item',
    data,
    selected,
    isConnectable: true,
    zIndex: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  });

  it('物ノードが角丸四角形で表示されること', () => {
    render(<ItemNode {...(createMockProps(mockDataWithImage) as NodeProps)} />);

    // 画像要素が存在し、rounded-xlクラスが適用されていること
    const img = screen.getByRole('img', { name: 'ノートパソコン' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveClass('rounded-xl');
    expect(img).not.toHaveClass('rounded-full');
  });

  it('画像がない場合、Packageアイコンが表示されること', () => {
    const { container } = render(<ItemNode {...(createMockProps(mockDataWithoutImage) as NodeProps)} />);

    // Packageアイコン（lucide-react）のSVG要素が存在すること
    const packageIcon = container.querySelector('.lucide-package');
    expect(packageIcon).toBeInTheDocument();
    expect(packageIcon?.tagName).toBe('svg');

    // アイコンのコンテナがrounded-xlクラスを持つこと
    const iconContainer = packageIcon?.parentElement;
    expect(iconContainer).toHaveClass('rounded-xl');
    expect(iconContainer).not.toHaveClass('rounded-full');
  });

  it('選択状態の時、適切なスタイルが適用されること', () => {
    render(<ItemNode {...(createMockProps(mockDataWithImage, true) as NodeProps)} />);

    const img = screen.getByRole('img', { name: 'ノートパソコン' });
    expect(img).toHaveClass('ring-4', 'ring-blue-500');
  });

  it('非選択状態の時、適切なスタイルが適用されること', () => {
    render(<ItemNode {...(createMockProps(mockDataWithImage, false) as NodeProps)} />);

    const img = screen.getByRole('img', { name: 'ノートパソコン' });
    expect(img).toHaveClass('ring-2', 'ring-gray-200');
  });

  it('名前が表示されること', () => {
    render(<ItemNode {...(createMockProps(mockDataWithImage) as NodeProps)} />);

    expect(screen.getByText('ノートパソコン')).toBeInTheDocument();
  });

  it('source用とtarget用のハンドルが存在すること', () => {
    render(<ItemNode {...(createMockProps(mockDataWithImage) as NodeProps)} />);

    expect(screen.getByTestId('handle-source-ring-source')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target-ring-target')).toBeInTheDocument();
  });
});
