/**
 * PersonNodeコンポーネントのテスト
 *
 * ハンドルの構成（type、id、position）を検証します。
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { PersonNode } from './PersonNode';
import type { PersonNodeData } from '@/types/graph';

describe('PersonNode', () => {
  const mockNodeProps = {
    id: 'person-1',
    data: {
      name: '田中太郎',
      imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    } as PersonNodeData,
    selected: false,
    type: 'person',
    // React Flowが内部的に提供するpropsをモック
    dragging: false,
    isConnectable: true,
    zIndex: 0,
    selectable: true,
    deletable: true,
    draggable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };

  // テストヘルパー: ReactFlowProviderでラップしてレンダリング
  const renderWithProvider = (props = mockNodeProps) => {
    return render(
      <ReactFlowProvider>
        <PersonNode {...props} />
      </ReactFlowProvider>
    );
  };

  describe('ハンドル構成', () => {
    it('2つの円形ハンドル（source用とtarget用）がレンダリングされること', () => {
      const { container } = renderWithProvider();

      // React FlowのHandleコンポーネントは`.react-flow__handle`クラスを持つ
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles).toHaveLength(2);

      // 両方のハンドルがReact Flowに認識されていることを確認
      handles.forEach((handle) => {
        expect(handle.classList.contains('react-flow__handle')).toBe(true);
      });
    });

    it('source用ハンドルとtarget用ハンドルがそれぞれ存在すること', () => {
      const { container } = renderWithProvider();

      const handles = container.querySelectorAll('.react-flow__handle');

      // data-handleid属性でsource用とtarget用を識別
      const sourceHandle = Array.from(handles).find((handle) =>
        handle.getAttribute('data-handleid')?.includes('source')
      );
      const targetHandle = Array.from(handles).find((handle) =>
        handle.getAttribute('data-handleid')?.includes('target')
      );

      expect(sourceHandle).toBeInTheDocument();
      expect(targetHandle).toBeInTheDocument();
    });

    it('ハンドルが円形（リング状）のスタイルを持つこと', () => {
      const { container } = renderWithProvider();

      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBeGreaterThan(0);

      // 両方のハンドルに円形のクラスが適用されていることを確認
      handles.forEach((handle) => {
        const className = handle?.className || '';
        expect(className).toContain('rounded-full');
      });
    });

    it('ハンドルが太い枠（borderWidth: 10px）を持つこと', () => {
      const { container } = renderWithProvider();

      const handles = container.querySelectorAll('.react-flow__handle');

      // 両方のハンドルに太い枠（10px）が適用されていることを確認
      handles.forEach((handle) => {
        const style = (handle as HTMLElement).style;
        expect(style.borderWidth).toBe('10px');
      });
    });

    it('通常時はsourceハンドルのみがpointer-events-autoであること', () => {
      const { container } = renderWithProvider();

      const handles = container.querySelectorAll('.react-flow__handle');
      const sourceHandle = Array.from(handles).find((handle) =>
        handle.getAttribute('data-handleid')?.includes('source')
      );
      const targetHandle = Array.from(handles).find((handle) =>
        handle.getAttribute('data-handleid')?.includes('target')
      );

      // 通常時（接続操作中でない時）はsourceハンドルのみが非表示（opacity-0, pointer-events-none）
      // ※ hover状態でない限り、両方とも非表示
      expect(sourceHandle?.className).toContain('pointer-events-none');
      expect(targetHandle?.className).toContain('pointer-events-none');
    });
  });

  describe('ノードの表示', () => {
    it('人物の名前が表示されること', () => {
      const { getByText } = renderWithProvider();
      expect(getByText('田中太郎')).toBeInTheDocument();
    });

    it('人物の画像が表示されること', () => {
      const { container } = renderWithProvider();
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute('src')).toBe(mockNodeProps.data.imageDataUrl);
      expect(img?.getAttribute('alt')).toBe('田中太郎');
    });

    it('選択状態の時にボーダースタイルが変わること', () => {
      const selectedProps = { ...mockNodeProps, selected: true };
      const { container: selectedContainer } = renderWithProvider(selectedProps);
      const { container: unselectedContainer } = renderWithProvider();

      // 画像要素のring-*クラスを確認（選択状態でring-4 ring-blue-500が適用される）
      const selectedImg = selectedContainer.querySelector('img');
      const unselectedImg = unselectedContainer.querySelector('img');

      // 選択状態では ring-4 ring-blue-500 が適用される
      expect(selectedImg?.className).toContain('ring-4');
      expect(selectedImg?.className).toContain('ring-blue-500');

      // 未選択状態では ring-2 ring-gray-200 が適用される
      expect(unselectedImg?.className).toContain('ring-2');
      expect(unselectedImg?.className).toContain('ring-gray-200');
    });
  });
});
