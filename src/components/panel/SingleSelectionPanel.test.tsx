/**
 * SingleSelectionPanel のユニットテスト（v11）
 *
 * 検証項目:
 * - 関係行クリックで2人選択状態に遷移すること
 * - 削除ボタンが表示されないこと（エッジ選択時の削除機能を使用）
 * - キーボード操作（Enter/Space）で遷移できること
 * - 関係が方向別にグループ化されて表示されること
 *   - symmetric=false, isSource → outgoing(→)グループ
 *   - symmetric=false, isTarget → incoming(←)グループ
 *   - symmetric=true → mutual(—)グループ
 * - 複数エッジが同一ペア間に存在する場合（マルチグラフ）
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

/** テスト用 Person ファクトリ */
function makePerson(overrides: Partial<Person> & { id: string; name: string }): Person {
  return {
    imageDataUrl: undefined,
    labels: ['人物'],
    properties: {},
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/** テスト用 Relationship ファクトリ（v11形式） */
function makeRel(overrides: Partial<Relationship> & { id: string; sourceId: string; targetId: string; type: string }): Relationship {
  return {
    label: null,
    symmetric: false,
    tags: [],
    properties: {},
    narrative: { summary: null, notes: null, turningPoints: [] },
    colorOverride: null,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    ...overrides,
  };
}

describe('SingleSelectionPanel - 基本的な関係クリック遷移', () => {
  const mockSelectPersonPairForEdit = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

  const testPerson = makePerson({ id: 'person-1', name: '山田太郎' });
  const otherPerson = makePerson({ id: 'person-2', name: '佐藤花子' });

  // person-1 → person-2 方向の有向エッジ
  const directedRelationship = makeRel({
    id: 'rel-1',
    sourceId: 'person-1',
    targetId: 'person-2',
    type: '親友',
    symmetric: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPerson],
        relationships: [directedRelationship],
        selectPersonPairForEdit: mockSelectPersonPairForEdit,
        removePerson: mockRemovePerson,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('関係行をクリックすると2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    const relationshipRow = screen.getByText('親友').closest('div[role="button"]');
    await user.click(relationshipRow!);

    expect(mockSelectPersonPairForEdit).toHaveBeenCalledWith('person-1', 'person-2', 'rel-1');
    expect(mockSelectPersonPairForEdit).toHaveBeenCalledTimes(1);
  });

  it('関係の削除ボタンが表示されないこと', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    const deleteButton = screen.queryByLabelText('佐藤花子との関係を削除');
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('関係行でEnterキーを押すと2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    relationshipRow.focus();
    await user.keyboard('{Enter}');

    expect(mockSelectPersonPairForEdit).toHaveBeenCalledWith('person-1', 'person-2', 'rel-1');
  });

  it('関係行でSpaceキーを押すと2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    relationshipRow.focus();
    await user.keyboard(' ');

    expect(mockSelectPersonPairForEdit).toHaveBeenCalledWith('person-1', 'person-2', 'rel-1');
  });

  it('関係行クリック時にビューポートが2ノードにフィットする', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    await user.click(relationshipRow);

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

    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    relationshipRow.focus();
    await user.keyboard('{Enter}');

    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: 'person-1' }, { id: 'person-2' }],
      padding: VIEWPORT_FIT_PADDING,
      maxZoom: VIEWPORT_MAX_ZOOM,
      duration: VIEWPORT_ANIMATION_DURATION,
    });
  });
});

describe('SingleSelectionPanel - アイコン付き表示', () => {
  const mockSelectPersonPairForEdit = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

  const testPerson = makePerson({ id: 'person-1', name: '山田太郎' });
  const otherPersonWithImage = makePerson({
    id: 'person-2',
    name: '佐藤花子',
    imageDataUrl: 'data:image/jpeg;base64,test',
  });
  const otherPersonWithoutImage = makePerson({ id: 'person-3', name: '鈴木一郎' });

  // person-1 → person-2: 親友（有向）
  const relWithImage = makeRel({
    id: 'rel-1',
    sourceId: 'person-1',
    targetId: 'person-2',
    type: '親友',
    symmetric: false,
  });

  // person-1 → person-3: 先輩（有向）
  const relWithoutImage = makeRel({
    id: 'rel-2',
    sourceId: 'person-1',
    targetId: 'person-3',
    type: '先輩',
    symmetric: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPersonWithImage, otherPersonWithoutImage],
        relationships: [relWithImage, relWithoutImage],
        selectPersonPairForEdit: mockSelectPersonPairForEdit,
        removePerson: mockRemovePerson,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('相手人物の画像がある場合、アバター画像が名前の前に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    const avatarImgs = screen.getAllByAltText('佐藤花子');
    expect(avatarImgs.length).toBeGreaterThan(0);
    expect(avatarImgs[0]).toHaveAttribute('src', 'data:image/jpeg;base64,test');

    const relationshipRow = screen.getByText('親友').closest('div[role="button"]') as HTMLElement;
    const textContent = relationshipRow.textContent || '';
    expect(textContent.indexOf('佐藤花子')).toBeLessThan(textContent.indexOf('親友'));
  });

  it('相手人物の画像がない場合、イニシャルが名前の前に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    const initial = screen.getByText('鈴');
    expect(initial).toBeInTheDocument();

    const relationshipRow = screen.getByText('先輩').closest('div[role="button"]') as HTMLElement;
    const textContent = relationshipRow.textContent || '';
    expect(textContent.indexOf('鈴木一郎')).toBeLessThan(textContent.indexOf('先輩'));
  });

  it('有向エッジ（person-1 → person-2）はoutgoingグループに表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    expect(screen.getByText('山田太郎 → ...')).toBeInTheDocument();
    expect(screen.getByText('親友')).toBeInTheDocument();
    expect(screen.getByText('佐藤花子')).toBeInTheDocument();
  });

  it('incomingグループヘッダーは表示されない（全て有向outgoing）', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    expect(screen.queryByText('... → 山田太郎')).not.toBeInTheDocument();
    expect(screen.queryByText('山田太郎 — ...')).not.toBeInTheDocument();
  });
});

describe('SingleSelectionPanel - 有向エッジの方向表示', () => {
  const mockSelectPersonPairForEdit = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

  const testPerson = makePerson({ id: 'person-1', name: '山田太郎' });
  const otherPerson = makePerson({ id: 'person-2', name: '佐藤花子' });

  // person-1 → person-2: 好き（有向）
  const outgoingRel = makeRel({
    id: 'rel-1',
    sourceId: 'person-1',
    targetId: 'person-2',
    type: '好き',
    symmetric: false,
  });

  // person-2 → person-1: 無関心（有向 = incoming from person-1's perspective）
  const incomingRel = makeRel({
    id: 'rel-2',
    sourceId: 'person-2',
    targetId: 'person-1',
    type: '無関心',
    symmetric: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPerson],
        relationships: [outgoingRel, incomingRel],
        selectPersonPairForEdit: mockSelectPersonPairForEdit,
        removePerson: mockRemovePerson,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('2本の有向エッジがそれぞれoutgoingとincomingグループに表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    expect(screen.getByText('山田太郎 → ...')).toBeInTheDocument();
    expect(screen.getByText('... → 山田太郎')).toBeInTheDocument();

    expect(screen.getByText('好き')).toBeInTheDocument();
    expect(screen.getByText('無関心')).toBeInTheDocument();
  });

  it('各行をクリックすると2人選択状態に遷移する', async () => {
    const user = userEvent.setup();
    render(<SingleSelectionPanel person={testPerson} />);

    // 「好き」の行をクリック（person-1 → person-2）
    await user.click(screen.getByText('好き').closest('div[role="button"]')!);
    expect(mockSelectPersonPairForEdit).toHaveBeenCalledWith('person-1', 'person-2', 'rel-1');

    vi.clearAllMocks();

    // 「無関心」の行をクリック（person-2 → person-1）
    await user.click(screen.getByText('無関心').closest('div[role="button"]')!);
    expect(mockSelectPersonPairForEdit).toHaveBeenCalledWith('person-1', 'person-2', 'rel-2');
  });
});

describe('SingleSelectionPanel - グループヘッダー', () => {
  const mockSelectPersonPairForEdit = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

  const testPerson = makePerson({ id: 'person-1', name: '山田太郎' });
  const otherPerson = makePerson({ id: 'person-2', name: '佐藤花子' });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPerson],
        relationships: [], // 関係なし
        selectPersonPairForEdit: mockSelectPersonPairForEdit,
        removePerson: mockRemovePerson,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('関係がないグループのヘッダーは非表示であること', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    expect(screen.queryByText('山田太郎 — ...')).not.toBeInTheDocument();
    expect(screen.queryByText('山田太郎 → ...')).not.toBeInTheDocument();
    expect(screen.queryByText('... → 山田太郎')).not.toBeInTheDocument();
    expect(screen.queryByText('この人物の関係')).not.toBeInTheDocument();
  });
});

describe('SingleSelectionPanel - symmetric（無向）関係', () => {
  const mockSelectPersonPairForEdit = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockClearSelection = vi.fn();
  const mockGetNode = vi.fn();
  const mockSetCenter = vi.fn();
  const mockFitView = vi.fn();

  const testPerson = makePerson({ id: 'person-1', name: '山田太郎' });
  const otherPerson = makePerson({ id: 'person-2', name: '佐藤花子' });

  // symmetric=true の無向エッジ
  const symmetricRelationship = makeRel({
    id: 'rel-1',
    sourceId: 'person-1',
    targetId: 'person-2',
    type: '同期',
    symmetric: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGraphStore).mockImplementation((selector) => {
      const state = {
        persons: [testPerson, otherPerson],
        relationships: [symmetricRelationship],
        selectPersonPairForEdit: mockSelectPersonPairForEdit,
        removePerson: mockRemovePerson,
        clearSelection: mockClearSelection,
      };
      return selector(state as never);
    });

    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: mockFitView,
    } as never);
  });

  it('symmetric=true の関係はmutualグループ（山田太郎 — ...）に表示される', () => {
    render(<SingleSelectionPanel person={testPerson} />);

    expect(screen.getByText('山田太郎 — ...')).toBeInTheDocument();
    expect(screen.queryByText('山田太郎 → ...')).not.toBeInTheDocument();
    expect(screen.queryByText('... → 山田太郎')).not.toBeInTheDocument();

    expect(screen.getByText('同期')).toBeInTheDocument();
    expect(screen.getByText('佐藤花子')).toBeInTheDocument();
  });
});
