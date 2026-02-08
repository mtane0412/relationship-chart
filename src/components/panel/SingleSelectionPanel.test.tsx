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

  it('相手人物の画像がある場合、アバター画像が矢印の後に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 佐藤花子のアバター画像を探す
    const avatarImg = screen.getByAltText('佐藤花子');
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', 'data:image/jpeg;base64,test');
    expect(avatarImg).toHaveClass('w-7', 'h-7', 'rounded-full');

    // 関係行の構造を確認：「親友 ↔ [アバター] 佐藤花子」
    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    const textContent = relationshipRow.textContent || '';
    const labelIndex = textContent.indexOf('親友');
    const nameIndex = textContent.indexOf('佐藤花子');
    // ラベルが名前の前にあることを確認
    expect(labelIndex).toBeLessThan(nameIndex);
  });

  it('相手人物の画像がない場合、イニシャルが矢印の後に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 鈴木一郎のイニシャルを探す
    const initial = screen.getByText('鈴');
    expect(initial).toBeInTheDocument();
    expect(initial.parentElement).toHaveClass('w-7', 'h-7', 'rounded-full', 'bg-gray-300');

    // 関係行の構造を確認：「先輩 → [イニシャル] 鈴木一郎」
    const relationshipRow = screen.getByText('先輩').closest('div[role="button"]') as HTMLElement;
    const textContent = relationshipRow.textContent || '';
    const labelIndex = textContent.indexOf('先輩');
    const nameIndex = textContent.indexOf('鈴木一郎');
    // ラベルが名前の前にあることを確認
    expect(labelIndex).toBeLessThan(nameIndex);
  });

  it('bidirectional関係は「関係ラベル ↔ 名前」形式で表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行を探す
    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    expect(relationshipRow).toBeInTheDocument();

    // テキスト順序を確認: "親友" → "↔" → "佐藤花子"
    const textContent = relationshipRow.textContent || '';
    const labelIndex = textContent.indexOf('親友');
    const arrowIndex = textContent.indexOf('↔');
    const nameIndex = textContent.indexOf('佐藤花子');

    expect(labelIndex).toBeGreaterThan(-1);
    expect(arrowIndex).toBeGreaterThan(-1);
    expect(nameIndex).toBeGreaterThan(-1);
    expect(labelIndex).toBeLessThan(arrowIndex);
    expect(arrowIndex).toBeLessThan(nameIndex);
  });

  it('one-way関係は「関係ラベル → 名前」形式で表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行を探す
    const relationshipRow = screen.getByText('先輩').closest('div[role="button"]') as HTMLElement;
    expect(relationshipRow).toBeInTheDocument();

    // テキスト順序を確認: "先輩" → "→" → "鈴木一郎"
    const textContent = relationshipRow.textContent || '';
    const labelIndex = textContent.indexOf('先輩');
    const arrowIndex = textContent.indexOf('→');
    const nameIndex = textContent.indexOf('鈴木一郎');

    expect(labelIndex).toBeGreaterThan(-1);
    expect(arrowIndex).toBeGreaterThan(-1);
    expect(nameIndex).toBeGreaterThan(-1);
    expect(labelIndex).toBeLessThan(arrowIndex);
    expect(arrowIndex).toBeLessThan(nameIndex);
  });
});

describe('SingleSelectionPanel - dual-directed表示', () => {
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
    imageDataUrl: undefined,
    createdAt: '2024-01-02T00:00:00Z',
  };

  const dualDirectedRelationship: Relationship = {
    id: 'rel-1',
    sourcePersonId: 'person-1',
    targetPersonId: 'person-2',
    type: 'dual-directed',
    sourceToTargetLabel: '好き',
    targetToSourceLabel: '無関心',
    createdAt: '2024-01-03T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // useGraphStoreのモック設定
    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPerson],
        relationships: [dualDirectedRelationship],
        setSelectedPersonIds: mockSetSelectedPersonIds,
        removePerson: mockRemovePerson,
        removeRelationship: mockRemoveRelationship,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });
  });

  it('dual-directed関係は2つの行として表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 2つの関係行が表示されること（両方とも佐藤花子）
    const personNames = screen.getAllByText('佐藤花子');
    expect(personNames).toHaveLength(2);

    // 両方の関係ラベルが表示されること
    expect(screen.getByText('好き')).toBeInTheDocument();
    expect(screen.getByText('無関心')).toBeInTheDocument();

    // 自分→相手の矢印（→）と相手→自分の矢印（←）が表示されること
    expect(screen.getByText('→')).toBeInTheDocument();
    expect(screen.getByText('←')).toBeInTheDocument();
  });

  it('dual-directed関係の方向が正しく表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 「好き」の行（自分→相手）: "好き → 佐藤花子"
    const forwardRow = screen.getByText('好き').closest('div[role="button"]') as HTMLElement;
    const forwardText = forwardRow.textContent || '';
    const forwardLabelIndex = forwardText.indexOf('好き');
    const forwardArrowIndex = forwardText.indexOf('→');
    const forwardNameIndex = forwardText.indexOf('佐藤花子');
    expect(forwardLabelIndex).toBeLessThan(forwardArrowIndex);
    expect(forwardArrowIndex).toBeLessThan(forwardNameIndex);

    // 「無関心」の行（相手→自分）: "無関心 ← 佐藤花子"
    const backwardRow = screen.getByText('無関心').closest('div[role="button"]') as HTMLElement;
    const backwardText = backwardRow.textContent || '';
    const backwardLabelIndex = backwardText.indexOf('無関心');
    const backwardArrowIndex = backwardText.indexOf('←');
    const backwardNameIndex = backwardText.indexOf('佐藤花子');
    expect(backwardLabelIndex).toBeLessThan(backwardArrowIndex);
    expect(backwardArrowIndex).toBeLessThan(backwardNameIndex);
  });

  it('dual-directed関係の各行をクリックすると2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    // 1つ目の関係行（好き）をクリック
    const firstRow = screen.getByText('好き').closest('div[role="button"]') as HTMLElement;
    await user.click(firstRow);

    expect(mockSetSelectedPersonIds).toHaveBeenCalledWith(['person-1', 'person-2']);

    vi.clearAllMocks();

    // 2つ目の関係行（無関心）をクリック
    const secondRow = screen.getByText('無関心').closest('div[role="button"]') as HTMLElement;
    await user.click(secondRow);

    expect(mockSetSelectedPersonIds).toHaveBeenCalledWith(['person-1', 'person-2']);
  });
});
