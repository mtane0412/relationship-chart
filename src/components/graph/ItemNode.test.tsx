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

  it('名前ラベルがabsolute配置であること（measured.widthに影響しないことを保証）', () => {
    const { container } = render(<ItemNode {...(createMockProps(mockDataWithImage) as NodeProps)} />);

    // 名前ラベル要素を取得
    const nameLabel = Array.from(container.querySelectorAll('div')).find((div) =>
      div.className.includes('bg-white rounded-full shadow-lg')
    );

    // absoluteクラスが適用されていることを確認
    expect(nameLabel?.className).toContain('absolute');
  });

  it('名前ラベルが画像の下に水平中央配置されていること', () => {
    const { container } = render(<ItemNode {...(createMockProps(mockDataWithImage) as NodeProps)} />);

    // 名前ラベル要素を取得
    const nameLabel = Array.from(container.querySelectorAll('div')).find((div) =>
      div.className.includes('bg-white rounded-full shadow-lg')
    ) as HTMLElement;

    expect(nameLabel).toBeInTheDocument();

    // スタイルプロパティを確認
    const style = nameLabel.style;
    expect(style.top).toBe('88px'); // IMAGE_SIZE(80) + NAME_LABEL_GAP(8) = 88px
    expect(style.left).toBe('50%');
    expect(style.transform).toBe('translateX(-50%)');
  });

  it('名前ラベルのborder幅が選択状態に関わらず一定（常にborder-2）であること', () => {
    const { container: selectedContainer } = render(
      <ItemNode {...(createMockProps(mockDataWithImage, true) as NodeProps)} />
    );
    const { container: unselectedContainer } = render(
      <ItemNode {...(createMockProps(mockDataWithImage, false) as NodeProps)} />
    );

    // 名前ラベル要素を取得
    const selectedNameLabel = Array.from(selectedContainer.querySelectorAll('div')).find((div) =>
      div.className.includes('bg-white rounded-full shadow-lg')
    );
    const unselectedNameLabel = Array.from(unselectedContainer.querySelectorAll('div')).find((div) =>
      div.className.includes('bg-white rounded-full shadow-lg')
    );

    // 両方の状態でborder-2が適用されていることを確認
    expect(selectedNameLabel?.className).toContain('border-2');
    expect(unselectedNameLabel?.className).toContain('border-2');

    // border-2以外のborder-*クラスが存在しないことを確認
    const selectedBorderClasses = selectedNameLabel?.className.match(/border-\d+/g) || [];
    const unselectedBorderClasses = unselectedNameLabel?.className.match(/border-\d+/g) || [];

    expect(selectedBorderClasses).toEqual(['border-2']);
    expect(unselectedBorderClasses).toEqual(['border-2']);
  });

  it('名前ラベルのborder色が選択状態で適切に変わること', () => {
    const { container: selectedContainer } = render(
      <ItemNode {...(createMockProps(mockDataWithImage, true) as NodeProps)} />
    );
    const { container: unselectedContainer } = render(
      <ItemNode {...(createMockProps(mockDataWithImage, false) as NodeProps)} />
    );

    // 名前ラベル要素を取得
    const selectedNameLabel = Array.from(selectedContainer.querySelectorAll('div')).find((div) =>
      div.className.includes('bg-white rounded-full shadow-lg')
    );
    const unselectedNameLabel = Array.from(unselectedContainer.querySelectorAll('div')).find((div) =>
      div.className.includes('bg-white rounded-full shadow-lg')
    );

    // 選択状態ではborder-blue-500が適用される
    expect(selectedNameLabel?.className).toContain('border-blue-500');

    // 未選択状態ではborder-gray-200が適用される
    expect(unselectedNameLabel?.className).toContain('border-gray-200');
  });
});
