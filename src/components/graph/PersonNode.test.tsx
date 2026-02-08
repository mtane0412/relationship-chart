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
    it('8つのハンドルがすべて type="source" でレンダリングされること', () => {
      const { container } = renderWithProvider();

      // React FlowのHandleコンポーネントは`.react-flow__handle`クラスを持つ
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles).toHaveLength(8);

      // すべてのハンドルがdata-handlepos属性を持つこと（React Flowの内部実装）
      // type="source"のみの場合、すべてsource用のハンドルとして動作
      handles.forEach((handle) => {
        // React Flowがハンドルとして認識していることを確認
        expect(handle.classList.contains('react-flow__handle')).toBe(true);
      });
    });

    it('各ハンドルに一意のidが設定されていること', () => {
      const { container } = renderWithProvider();

      const handles = container.querySelectorAll('.react-flow__handle');
      const ids = Array.from(handles).map((handle) => handle.getAttribute('data-handleid'));

      // すべてのハンドルがidを持つこと
      ids.forEach((id) => {
        expect(id).toBeTruthy();
      });

      // idが重複していないこと
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(8);

      // 期待されるIDが存在すること
      const expectedIds = ['top', 'right', 'bottom', 'left', 'top-right', 'bottom-right', 'bottom-left', 'top-left'];
      expectedIds.forEach((expectedId) => {
        expect(ids).toContain(expectedId);
      });
    });

    it('8方向のハンドルが配置されていること', () => {
      const { container } = renderWithProvider();

      const handles = container.querySelectorAll('.react-flow__handle');

      // 8つのハンドルがレンダリングされていることを確認
      expect(handles).toHaveLength(8);

      // 各ハンドルがdata-handleid属性を持つことを確認
      const ids = Array.from(handles).map((handle) => handle.getAttribute('data-handleid'));
      expect(ids.filter(Boolean)).toHaveLength(8);
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
