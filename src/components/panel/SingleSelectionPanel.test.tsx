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

// useReactFlowのモック
vi.mock('@xyflow/react', () => ({
  useReactFlow: vi.fn(),
}));

// 動的importのため型をimport
import { useGraphStore } from '@/stores/useGraphStore';
import { useReactFlow } from '@xyflow/react';
import {
  VIEWPORT_ANIMATION_DURATION,
  VIEWPORT_FIT_PADDING,
  VIEWPORT_MAX_ZOOM,
} from '@/lib/viewport-utils';

describe('SingleSelectionPanel - 関係クリック遷移', () => {
  const mockSetSelectedPersonIds = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

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
    isDirected: true,
    sourceToTargetLabel: '親友',
    targetToSourceLabel: '親友', // bidirectional: 同じラベル
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
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    // useReactFlowのモック設定
    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('関係行をクリックすると2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行を探す（「親友」テキストを含む要素）
    // 双方向関係の場合、2つのエントリがあるので最初の要素を取得
    const relationshipRows = screen.getAllByText('親友');
    expect(relationshipRows.length).toBeGreaterThan(0);
    const relationshipRow = relationshipRows[0].closest('div[role="button"]');

    // 関係行をクリック
    await user.click(relationshipRow!);

    // setSelectedPersonIdsが正しい引数で呼ばれることを確認
    expect(mockSetSelectedPersonIds).toHaveBeenCalledWith(['person-1', 'person-2']);
    expect(mockSetSelectedPersonIds).toHaveBeenCalledTimes(1);
  });

  it('関係の削除ボタンが表示されないこと', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 削除ボタンが存在しないことを確認
    const deleteButton = screen.queryByLabelText('佐藤花子との関係を削除');
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('関係行でEnterキーを押すと2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行を探す（双方向の場合は最初の要素）
    const relationshipRows = screen.getAllByText('親友');
    const relationshipRow = relationshipRows[0].closest('div[role="button"]') as HTMLElement;
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

    // 関係行を探す（双方向の場合は最初の要素）
    const relationshipRows = screen.getAllByText('親友');
    const relationshipRow = relationshipRows[0].closest('div[role="button"]') as HTMLElement;
    expect(relationshipRow).toBeInTheDocument();

    // フォーカスを当ててSpaceキーを押す
    relationshipRow.focus();
    await user.keyboard(' ');

    // setSelectedPersonIdsが正しい引数で呼ばれることを確認
    expect(mockSetSelectedPersonIds).toHaveBeenCalledWith(['person-1', 'person-2']);
    expect(mockSetSelectedPersonIds).toHaveBeenCalledTimes(1);
  });

  it('関係行クリック時にビューポートが2ノードにフィットする', async () => {
    const user = userEvent.setup();

    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行をクリック（双方向の場合は最初の要素）
    const relationshipRows = screen.getAllByText('親友');
    const relationshipRow = relationshipRows[0].closest('div[role="button"]') as HTMLElement;
    await user.click(relationshipRow);

    // fitViewが両ノードIDで呼ばれることを確認
    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: 'person-1' }, { id: 'person-2' }],
      padding: VIEWPORT_FIT_PADDING,
      maxZoom: VIEWPORT_MAX_ZOOM,
      duration: VIEWPORT_ANIMATION_DURATION,
    });
  });


  it('キーボード操作でもビューポートが2ノードにフィットする', async () => {
    const user = userEvent.setup();

    render(<SingleSelectionPanel person={testPerson} />);

    // 関係行を探す（双方向の場合は最初の要素）
    const relationshipRows = screen.getAllByText('親友');
    const relationshipRow = relationshipRows[0].closest('div[role="button"]') as HTMLElement;

    // フォーカスを当ててEnterキーを押す
    relationshipRow.focus();
    await user.keyboard('{Enter}');

    // fitViewが呼ばれることを確認
    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: 'person-1' }, { id: 'person-2' }],
      padding: VIEWPORT_FIT_PADDING,
      maxZoom: VIEWPORT_MAX_ZOOM,
      duration: VIEWPORT_ANIMATION_DURATION,
    });
  });
});

describe('SingleSelectionPanel - アイコン付き表示', () => {
  const mockSetSelectedPersonIds = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

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
    isDirected: true,
    sourceToTargetLabel: '親友',
    targetToSourceLabel: '親友', // bidirectional: 同じラベル
    createdAt: '2024-01-04T00:00:00Z',
  };

  const relationshipWithoutImage: Relationship = {
    id: 'rel-2',
    sourcePersonId: 'person-1',
    targetPersonId: 'person-3',
    isDirected: true,
    sourceToTargetLabel: '先輩',
    targetToSourceLabel: null, // one-way: 逆方向ラベルなし
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
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    // useReactFlowのモック設定
    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('相手人物の画像がある場合、アバター画像が名前の前に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 佐藤花子のアバター画像を探す（双方向の場合は複数あるので最初の要素）
    const avatarImgs = screen.getAllByAltText('佐藤花子');
    expect(avatarImgs.length).toBeGreaterThan(0);
    expect(avatarImgs[0]).toHaveAttribute('src', 'data:image/jpeg;base64,test');
    expect(avatarImgs[0]).toHaveClass('w-7', 'h-7', 'rounded-full');

    // 関係行の構造を確認：グループヘッダー配下に「[アバター] 佐藤花子 親友」
    const relationshipRows = screen.getAllByText('親友');
    const relationshipRow = relationshipRows[0].closest('div[role="button"]') as HTMLElement;
    const textContent = relationshipRow.textContent || '';
    const nameIndex = textContent.indexOf('佐藤花子');
    const labelIndex = textContent.indexOf('親友');
    // 名前がラベルの前にあることを確認
    expect(nameIndex).toBeLessThan(labelIndex);
  });

  it('相手人物の画像がない場合、イニシャルが名前の前に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // 鈴木一郎のイニシャルを探す
    const initial = screen.getByText('鈴');
    expect(initial).toBeInTheDocument();
    expect(initial.parentElement).toHaveClass('w-7', 'h-7', 'rounded-full', 'bg-gray-300');

    // 関係行の構造を確認：グループヘッダー「山田太郎 → ...」配下に「[イニシャル] 鈴木一郎 先輩」
    const relationshipRow = screen.getByText('先輩').closest('div[role="button"]') as HTMLElement;
    const textContent = relationshipRow.textContent || '';
    const nameIndex = textContent.indexOf('鈴木一郎');
    const labelIndex = textContent.indexOf('先輩');
    // 名前がラベルの前にあることを確認
    expect(nameIndex).toBeLessThan(labelIndex);
  });

  it('bidirectional関係はoutgoingとincoming両方のグループに表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // outgoingグループヘッダーを確認
    const outgoingHeader = screen.getByText('山田太郎 → ...');
    expect(outgoingHeader).toBeInTheDocument();

    // incomingグループヘッダーを確認
    const incomingHeader = screen.getByText('... → 山田太郎');
    expect(incomingHeader).toBeInTheDocument();

    // mutualグループヘッダーは表示されない（bidirectionalは無方向ではない）
    expect(screen.queryByText('山田太郎 — ...')).not.toBeInTheDocument();

    // 関係行が2つ表示される（両方とも同じ「親友」ラベル）
    const relationshipRows = screen.getAllByText('親友');
    expect(relationshipRows).toHaveLength(2);

    // 相手名前が2回表示される
    const personNames = screen.getAllByText('佐藤花子');
    expect(personNames).toHaveLength(2);
  });

  it('one-way関係はグループヘッダー「山田太郎 → ...」配下に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // グループヘッダーを探す
    const outgoingHeader = screen.getByText('山田太郎 → ...');
    expect(outgoingHeader).toBeInTheDocument();

    // 関係行を探す
    const relationshipRow = screen.getByText('先輩').closest('div[role="button"]') as HTMLElement;
    expect(relationshipRow).toBeInTheDocument();

    // 相手名前を確認
    expect(screen.getByText('鈴木一郎')).toBeInTheDocument();
  });
});

describe('SingleSelectionPanel - dual-directed表示', () => {
  const mockSetSelectedPersonIds = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

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
    isDirected: true,
    sourceToTargetLabel: '好き',
    targetToSourceLabel: '無関心', // dual-directed: 異なるラベル
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
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    // useReactFlowのモック設定
    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('dual-directed関係は2つのグループに分かれて表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // グループヘッダーを確認
    expect(screen.getByText('山田太郎 → ...')).toBeInTheDocument();
    expect(screen.getByText('... → 山田太郎')).toBeInTheDocument();

    // 2つの関係行が表示されること（両方とも佐藤花子）
    const personNames = screen.getAllByText('佐藤花子');
    expect(personNames).toHaveLength(2);

    // 両方の関係ラベルが表示されること
    expect(screen.getByText('好き')).toBeInTheDocument();
    expect(screen.getByText('無関心')).toBeInTheDocument();
  });

  it('dual-directed関係の方向が正しいグループに表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // outgoingグループヘッダー
    const outgoingHeader = screen.getByText('山田太郎 → ...');
    expect(outgoingHeader).toBeInTheDocument();

    // incomingグループヘッダー
    const incomingHeader = screen.getByText('... → 山田太郎');
    expect(incomingHeader).toBeInTheDocument();

    // 「好き」の行（自分→相手）
    const forwardRow = screen.getByText('好き').closest('div[role="button"]') as HTMLElement;
    expect(forwardRow).toBeInTheDocument();

    // 「無関心」の行（相手→自分）
    const backwardRow = screen.getByText('無関心').closest('div[role="button"]') as HTMLElement;
    expect(backwardRow).toBeInTheDocument();
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

describe('SingleSelectionPanel - グループヘッダー', () => {
  const mockSetSelectedPersonIds = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

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

  // 関係がない場合のテスト
  beforeEach(() => {
    vi.clearAllMocks();

    // useGraphStoreのモック設定
    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPerson],
        relationships: [], // 関係なし
        setSelectedPersonIds: mockSetSelectedPersonIds,
        removePerson: mockRemovePerson,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    // useReactFlowのモック設定
    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('関係がないグループのヘッダーは非表示であること', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // どのグループヘッダーも表示されない
    expect(screen.queryByText('山田太郎 — ...')).not.toBeInTheDocument();
    expect(screen.queryByText('山田太郎 → ...')).not.toBeInTheDocument();
    expect(screen.queryByText('... → 山田太郎')).not.toBeInTheDocument();

    // 関係一覧セクション自体が非表示
    expect(screen.queryByText('この人物の関係')).not.toBeInTheDocument();
  });
});

describe('SingleSelectionPanel - 無方向関係（undirected）', () => {
  const mockSetSelectedPersonIds = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

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

  const undirectedRelationship: Relationship = {
    id: 'rel-1',
    sourcePersonId: 'person-1',
    targetPersonId: 'person-2',
    isDirected: false, // 無方向
    sourceToTargetLabel: '同一人物',
    targetToSourceLabel: '同一人物',
    createdAt: '2024-01-03T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // useGraphStoreのモック設定
    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPerson],
        relationships: [undirectedRelationship],
        setSelectedPersonIds: mockSetSelectedPersonIds,
        removePerson: mockRemovePerson,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    // useReactFlowのモック設定
    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('無方向関係はmutualグループ（山田太郎 — ...）に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    // mutualグループヘッダーを確認
    const mutualHeader = screen.getByText('山田太郎 — ...');
    expect(mutualHeader).toBeInTheDocument();

    // 有向グループヘッダーは表示されない
    expect(screen.queryByText('山田太郎 → ...')).not.toBeInTheDocument();
    expect(screen.queryByText('... → 山田太郎')).not.toBeInTheDocument();

    // 関係行を確認
    expect(screen.getByText('同一人物')).toBeInTheDocument();
    expect(screen.getByText('佐藤花子')).toBeInTheDocument();
  });
});
