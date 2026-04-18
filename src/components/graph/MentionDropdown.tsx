/**
 * MentionDropdown コンポーネント
 *
 * チャット入力バーで @ を入力したときに表示される人物候補ドロップダウン。
 * 既存人物の一覧を表示し、一致する人物がない場合は「新規作成」オプションを提供する。
 *
 * アクセシビリティ: role="listbox" + aria-activedescendant によるコンボボックスパターン
 */

'use client';

import { useEffect, useRef } from 'react';
import { User, Package, PlusCircle } from 'lucide-react';
import { deriveNodeVisual } from '@/lib/node-visual';
import { MENTION_MAX_DISPLAY_COUNT } from '@/lib/mention-utils';
import { normalizeName } from '@/lib/person-matching';
import type { Person } from '@/types/person';

/**
 * 人物アイコンコンポーネント（SearchBar の NodeIcon と同様のパターン）
 */
function PersonIcon({
  imageDataUrl,
  nodeLabels = ['人物'],
  alt,
}: {
  imageDataUrl?: string;
  nodeLabels?: string[];
  alt: string;
}) {
  const visual = deriveNodeVisual(nodeLabels);
  const rounded = visual.shape === 'rounded-rect' ? 'rounded' : 'rounded-full';

  if (imageDataUrl) {
    return (
      <img
        src={imageDataUrl}
        alt={alt}
        className={`w-7 h-7 object-cover flex-shrink-0 ${rounded}`}
      />
    );
  }

  return (
    <div className={`w-7 h-7 bg-gray-200 flex items-center justify-center flex-shrink-0 ${rounded}`}>
      {visual.defaultIcon === 'package' ? (
        <Package size={14} className="text-gray-600" />
      ) : (
        <User size={14} className="text-gray-600" />
      )}
    </div>
  );
}

/**
 * MentionDropdown の Props
 */
type MentionDropdownProps = {
  /** 現在の検索クエリ（@ 以降のテキスト） */
  query: string;
  /** フィルタリング済みの人物リスト */
  persons: Person[];
  /** キーボードナビゲーションのハイライト位置 */
  selectedIndex: number;
  /** 人物を選択したときのコールバック */
  onSelect: (person: Person) => void;
  /** 「新規作成」を選択したときのコールバック */
  onCreateNew: (name: string) => void;
};

/**
 * @メンション候補ドロップダウン
 *
 * 人物リストから候補を表示し、新規作成オプションも提供する。
 * キーボードナビゲーション（ArrowUp/Down/Enter）はペアレントの useMention フックが管理する。
 */
export function MentionDropdown({
  query,
  persons,
  selectedIndex,
  onSelect,
  onCreateNew,
}: MentionDropdownProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // 表示する候補を最大件数に制限
  const displayedPersons = persons.slice(0, MENTION_MAX_DISPLAY_COUNT);

  // 「新規作成」オプションを表示するか（クエリが空でなく、正規化後に一致する既存人物がない場合）
  const normalizedQuery = normalizeName(query.trim());
  const hasExactMatch =
    query.trim() !== '' &&
    persons.some((p) => normalizeName(p.name) === normalizedQuery);
  const showCreateNew = query.trim() !== '' && !hasExactMatch;

  // 合計候補数（人物 + 新規作成オプション）
  const totalOptions = displayedPersons.length + (showCreateNew ? 1 : 0);

  // 選択中の項目をスクロール表示
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(
        `[id="mention-option-${selectedIndex}"]`
      ) as HTMLElement | null;
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }
  }, [selectedIndex]);

  if (totalOptions === 0) return null;

  return (
    <div
      className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50"
      role="presentation"
    >
      <ul
        ref={listRef}
        id="mention-listbox"
        role="listbox"
        aria-label="メンション候補"
        className="max-h-52 overflow-y-auto"
      >
        {/* 人物候補 */}
        {displayedPersons.map((person, index) => (
          <li key={person.id} role="presentation">
            <button
              id={`mention-option-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => onSelect(person)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50 text-gray-800'
              }`}
              type="button"
            >
              <PersonIcon
                imageDataUrl={person.imageDataUrl}
                nodeLabels={person.labels}
                alt={person.name}
              />
              <span className="text-sm truncate">{person.name}</span>
            </button>
          </li>
        ))}

        {/* 新規作成オプション */}
        {showCreateNew && (
          <li role="presentation">
            <button
              id={`mention-option-${displayedPersons.length}`}
              role="option"
              aria-selected={displayedPersons.length === selectedIndex}
              onClick={() => onCreateNew(query.trim())}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                displayedPersons.length === selectedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50 text-gray-800'
              }`}
              type="button"
            >
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <PlusCircle size={14} className="text-green-600" />
              </div>
              <span className="text-sm">
                <span className="text-gray-500">新規作成: </span>
                <span className="font-medium">{query.trim()}</span>
              </span>
            </button>
          </li>
        )}
      </ul>

      {/* 閉じるヒント */}
      <div className="px-3 py-1 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex gap-3">
        <span>↑↓ 選択</span>
        <span>Enter 確定</span>
        <span>Esc キャンセル</span>
      </div>
    </div>
  );
}
