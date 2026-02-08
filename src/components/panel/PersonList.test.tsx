/**
 * PersonList のユニットテスト
 *
 * 検証項目:
 * - 人物クリック時にsetCenterが正しい座標で呼ばれること
 * - getNodeがnullの場合にsetCenterが呼ばれないこと
 * - Shift+クリック時にsetCenterが呼ばれないこと
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonList } from './PersonList';
import type { Person } from '@/types/person';

// useGraphStoreのモック
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn(),
}));

// @xyflow/reactのモック
vi.mock('@xyflow/react', () => ({
  useReactFlow: vi.fn(),
}));

// 動的importのため型をimport
import { useGraphStore } from '@/stores/useGraphStore';
import { useReactFlow } from '@xyflow/react';

describe('PersonList - ノード中央移動', () => {
  const mockSelectPerson = vi.fn();
  const mockTogglePersonSelection = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();

  const testPerson: Person = {
    id: 'person-1',
    name: '山田太郎',
    imageDataUrl: undefined,
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // useGraphStoreのモック設定
    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson],
        selectedPersonIds: [],
        selectPerson: mockSelectPerson,
        togglePersonSelection: mockTogglePersonSelection,
        removePerson: mockRemovePerson,
      };
      return selector(state as never);
    });

    // useReactFlowのモック設定
    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
    } as never);
  });

  it('人物をクリックするとノードが画面中央に移動する', async () => {
    const user = userEvent.setup();

    // ノードのモック（measured付き）
    mockGetNode.mockReturnValue({
      id: 'person-1',
      position: { x: 100, y: 200 },
      measured: { width: 80, height: 120 },
    });

    render(<PersonList />);

    // 人物行をクリック
    const personRow = screen.getByText('山田太郎').closest('div[role="button"]') as HTMLElement;
    await user.click(personRow);

    // selectPersonが呼ばれる
    expect(mockSelectPerson).toHaveBeenCalledWith('person-1');

    // setCenterが正しい座標で呼ばれる（中心座標 = position + measured/2）
    expect(mockSetCenter).toHaveBeenCalledWith(140, 260, { duration: 500 });
  });

  it('measuredがない場合はデフォルトサイズを使用する', async () => {
    const user = userEvent.setup();

    // ノードのモック（measuredなし）
    mockGetNode.mockReturnValue({
      id: 'person-1',
      position: { x: 100, y: 200 },
      measured: undefined,
    });

    render(<PersonList />);

    // 人物行をクリック
    const personRow = screen.getByText('山田太郎').closest('div[role="button"]') as HTMLElement;
    await user.click(personRow);

    // setCenterがデフォルトサイズ（80x120）で呼ばれる
    expect(mockSetCenter).toHaveBeenCalledWith(140, 260, { duration: 500 });
  });

  it('getNodeがnullを返す場合はsetCenterが呼ばれない', async () => {
    const user = userEvent.setup();

    // getNodeがnullを返す
    mockGetNode.mockReturnValue(null);

    render(<PersonList />);

    // 人物行をクリック
    const personRow = screen.getByText('山田太郎').closest('div[role="button"]') as HTMLElement;
    await user.click(personRow);

    // selectPersonは呼ばれる
    expect(mockSelectPerson).toHaveBeenCalledWith('person-1');
    // setCenterは呼ばれない
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('Shift+クリック時はsetCenterが呼ばれない', async () => {
    const user = userEvent.setup();

    // ノードのモック
    mockGetNode.mockReturnValue({
      id: 'person-1',
      position: { x: 100, y: 200 },
      measured: { width: 80, height: 120 },
    });

    render(<PersonList />);

    // Shift+クリック
    const personRow = screen.getByText('山田太郎').closest('div[role="button"]') as HTMLElement;
    await user.keyboard('{Shift>}');
    await user.click(personRow);
    await user.keyboard('{/Shift}');

    // togglePersonSelectionは呼ばれる
    expect(mockTogglePersonSelection).toHaveBeenCalled();
    // setCenterは呼ばれない（複数選択モード）
    expect(mockSetCenter).not.toHaveBeenCalled();
  });
});
