/**
 * SingleSelectionPanel のユニットテスト
 *
 * 検証項目:
 * - 関係行クリックで2人選択状態に遷移すること
 * - 削除ボタンクリック時に選択状態が変更されないこと
 * - キーボード操作（Enter/Space）で遷移できること
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SingleSelectionPanel } from './SingleSelectionPanel';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

// useGraphStoreのモック
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn(),
}));

// 動的importのため型をimport
import { useGraphStore } from '@/stores/useGraphStore';

describe('SingleSelectionPanel - 関係クリック遷移', () => {
  const mockSetSelectedPersonIds = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockRemoveRelationship = vi.fn();
  const mockClearSelection = vi.fn();

  const testPerson: Person = {
    id: 'person-1',
    name: '山田太郎',
    imageDataUrl: undefined,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const otherPerson: Person = {
    id: 'person-2',
    name: '佐藤花子',
    imageDataUrl: 'data:image/jpeg;base64,test',
    createdAt: '2024-01-02T00:00:00Z',
  };

  const testRelationship: Relationship = {
    id: 'rel-1',
    sourcePersonId: 'person-1',
    targetPersonId: 'person-2',
    type: 'bidirectional',
    sourceToTargetLabel: '親友',
    targetToSourceLabel: null,
    createdAt: '2024-01-03T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // useGraphStoreのモック設定
    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPerson],
        relationships: [testRelationship],
        setSelectedPersonIds: mockSetSelectedPersonIds,
        removePerson: mockRemovePerson,
        removeRelationship: mockRemoveRelationship,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });
  });

  it('関係行をクリックすると2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行を探す（「親友」テキストを含む要素）
    const relationshipRow = screen.getByText('親友').closest('div[role="button"]');
    expect(relationshipRow).toBeInTheDocument();

    // 関係行をクリック
    await user.click(relationshipRow!);

    // setSelectedPersonIdsが正しい引数で呼ばれることを確認
    expect(mockSetSelectedPersonIds).toHaveBeenCalledWith(['person-1', 'person-2']);
    expect(mockSetSelectedPersonIds).toHaveBeenCalledTimes(1);
  });

  it('削除ボタンをクリックしても選択状態は変更されない', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    // 削除ボタンを探す
    const deleteButton = screen.getByLabelText('佐藤花子との関係を削除');
    expect(deleteButton).toBeInTheDocument();

    // 削除ボタンをクリック
    await user.click(deleteButton);

    // setSelectedPersonIdsが呼ばれないことを確認
    expect(mockSetSelectedPersonIds).not.toHaveBeenCalled();
    // removeRelationshipは呼ばれる
    expect(mockRemoveRelationship).toHaveBeenCalledWith('rel-1');
  });

  it('関係行でEnterキーを押すと2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行を探す
    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    expect(relationshipRow).toBeInTheDocument();

    // フォーカスを当ててEnterキーを押す
    relationshipRow.focus();
    await user.keyboard('{Enter}');

    // setSelectedPersonIdsが正しい引数で呼ばれることを確認
    expect(mockSetSelectedPersonIds).toHaveBeenCalledWith(['person-1', 'person-2']);
    expect(mockSetSelectedPersonIds).toHaveBeenCalledTimes(1);
  });

  it('関係行でSpaceキーを押すと2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行を探す
    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    expect(relationshipRow).toBeInTheDocument();

    // フォーカスを当ててSpaceキーを押す
    relationshipRow.focus();
    await user.keyboard(' ');

    // setSelectedPersonIdsが正しい引数で呼ばれることを確認
    expect(mockSetSelectedPersonIds).toHaveBeenCalledWith(['person-1', 'person-2']);
    expect(mockSetSelectedPersonIds).toHaveBeenCalledTimes(1);
  });
});

describe('SingleSelectionPanel - アイコン付き表示', () => {
  const mockSetSelectedPersonIds = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockRemoveRelationship = vi.fn();
  const mockClearSelection = vi.fn();

  const testPerson: Person = {
    id: 'person-1',
    name: '山田太郎',
    imageDataUrl: undefined,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const otherPersonWithImage: Person = {
    id: 'person-2',
    name: '佐藤花子',
    imageDataUrl: 'data:image/jpeg;base64,test',
    createdAt: '2024-01-02T00:00:00Z',
  };

  const otherPersonWithoutImage: Person = {
    id: 'person-3',
    name: '鈴木一郎',
    imageDataUrl: undefined,
    createdAt: '2024-01-03T00:00:00Z',
  };

  const relationshipWithImage: Relationship = {
    id: 'rel-1',
    sourcePersonId: 'person-1',
    targetPersonId: 'person-2',
    type: 'bidirectional',
    sourceToTargetLabel: '親友',
    targetToSourceLabel: null,
    createdAt: '2024-01-04T00:00:00Z',
  };

  const relationshipWithoutImage: Relationship = {
    id: 'rel-2',
    sourcePersonId: 'person-1',
    targetPersonId: 'person-3',
    type: 'one-way',
    sourceToTargetLabel: '先輩',
    targetToSourceLabel: null,
    createdAt: '2024-01-05T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // useGraphStoreのモック設定
    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPersonWithImage, otherPersonWithoutImage],
        relationships: [relationshipWithImage, relationshipWithoutImage],
        setSelectedPersonIds: mockSetSelectedPersonIds,
        removePerson: mockRemovePerson,
        removeRelationship: mockRemoveRelationship,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });
  });

  it('相手人物の画像がある場合、アバター画像が表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 佐藤花子のアバター画像を探す
    const avatarImg = screen.getByAltText('佐藤花子');
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', 'data:image/jpeg;base64,test');
    expect(avatarImg).toHaveClass('w-7', 'h-7', 'rounded-full');
  });

  it('相手人物の画像がない場合、イニシャルが表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 鈴木一郎のイニシャルを探す
    const initial = screen.getByText('鈴');
    expect(initial).toBeInTheDocument();
    expect(initial.parentElement).toHaveClass('w-7', 'h-7', 'rounded-full', 'bg-gray-300');
  });
});
