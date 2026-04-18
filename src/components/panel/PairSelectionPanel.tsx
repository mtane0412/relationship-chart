/**
 * PairSelectionPanelコンポーネント
 * 2人の人物が選択されている場合に表示されるパネル
 *
 * v9プロパティグラフ方式対応:
 * - プライマリ行: タイプ選択 + forward/reverse ラベル + タグ chip 入力
 * - 定型フィールド（アコーディオン）: closeness/trust/tension/secrecy/kinship + affection/awareness/role（方向別）
 * - 物語的情報（アコーディオン）: summary/notes/turningPoints
 * - colorOverride: カラーピッカー（null のとき「タグから派生」表示）
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { nanoid } from 'nanoid';
import { useReactFlow } from '@xyflow/react';
import { ArrowRight, ArrowLeft, ArrowLeftRight, Minus } from 'lucide-react';
import { BidirectionalArrow } from '@/components/icons/BidirectionalArrow';
import { NullableSlider } from '@/components/ui/NullableSlider';
import { TagChipInput } from '@/components/ui/TagChipInput';
import { TurningPointsEditor } from '@/components/panel/TurningPointsEditor';
import type { TurningPointRow } from '@/components/panel/TurningPointsEditor';
import { PersonMiniIcon } from '@/components/panel/PersonMiniIcon';
import { getDirectionIndicator, getPlaceholder, KINSHIP_OPTIONS, AWARENESS_OPTIONS } from '@/components/panel/pairSelectionHelpers';
import { useGraphStore } from '@/stores/useGraphStore';
import { MAX_RELATIONSHIP_LABEL_LENGTH } from '@/lib/validation-constants';
import { getRelationshipDisplayType } from '@/lib/relationship-utils';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';
import type { Person } from '@/types/person';
import type { RelationshipType, KinshipKind, AwarenessKind } from '@/types/relationship';
import { SUGGESTED_TAGS } from '@/types/relationship';

/**
 * colorOverride が null のときのカラーピッカーデフォルト色
 * Tailwind の indigo-500 (#6366f1) に相当する
 */
const DEFAULT_EDGE_COLOR = '#6366f1';

/** PairSelectionPanelのプロパティ */
type PairSelectionPanelProps = {
  /** 選択されている2人の人物 */
  persons: [Person, Person];
};

// ─── PairSelectionPanel 本体 ─────────────────────────────────────────────────

/** 2人選択パネルコンポーネント */
export function PairSelectionPanel({ persons }: PairSelectionPanelProps) {
  const relationships = useGraphStore((state) => state.relationships);
  const addRelationship = useGraphStore((state) => state.addRelationship);
  const updateRelationship = useGraphStore((state) => state.updateRelationship);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const selectPerson = useGraphStore((state) => state.selectPerson);

  const { getNode, setCenter } = useReactFlow();

  const [person1, person2] = persons;

  // 物が含まれているかチェック
  const hasItem = (person1.kind === 'item') || (person2.kind === 'item');

  // ペア間の既存関係を取得（v9はペア単位で1つのみ）
  const existingRelationship = useMemo(
    () =>
      relationships.find(
        (r) =>
          (r.sourcePersonId === person1.id && r.targetPersonId === person2.id) ||
          (r.sourcePersonId === person2.id && r.targetPersonId === person1.id)
      ),
    [relationships, person1.id, person2.id]
  );

  // 既存関係の向きを判定（person1がsourceかどうか）
  const isReversed = useMemo(
    () => (existingRelationship ? existingRelationship.sourcePersonId === person2.id : false),
    [existingRelationship, person2.id]
  );

  // ────── プライマリフィールドのフォーム状態 ──────

  const [relationshipType, setRelationshipType] = useState<RelationshipType>(() => {
    if (existingRelationship) return getRelationshipDisplayType(existingRelationship);
    return 'bidirectional';
  });

  /**
   * isReversedを考慮してsource→target方向のラベルを返す
   * one-way: ラベルは常に forward.label に格納されているため isReversed に関わらず forward を参照する
   */
  const [sourceToTargetLabel, setSourceToTargetLabel] = useState(() => {
    if (existingRelationship) {
      const displayType = getRelationshipDisplayType(existingRelationship);
      if (displayType === 'one-way') {
        return existingRelationship.forward.label ?? existingRelationship.reverse.label ?? '';
      }
      return isReversed
        ? (existingRelationship.reverse.label ?? '')
        : (existingRelationship.forward.label ?? '');
    }
    return '';
  });

  /**
   * isReversedを考慮してtarget→source方向のラベルを返す
   * one-way: 逆方向ラベルは存在しないため常に空文字
   */
  const [targetToSourceLabel, setTargetToSourceLabel] = useState(() => {
    if (existingRelationship) {
      const displayType = getRelationshipDisplayType(existingRelationship);
      if (displayType === 'one-way') return '';
      return isReversed
        ? (existingRelationship.forward.label ?? '')
        : (existingRelationship.reverse.label ?? '');
    }
    return '';
  });

  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);

  // ────── タグ ──────

  const [tags, setTags] = useState<string[]>(() => existingRelationship?.tags ?? []);

  // ────── symmetric フィールド ──────

  // 未設定を null で表現する（isNull フラグは廃止）
  const [closeness, setCloseness] = useState<number | null>(() => existingRelationship?.symmetric.closeness ?? null);
  const [trust, setTrust] = useState<number | null>(() => existingRelationship?.symmetric.trust ?? null);
  const [tension, setTension] = useState<number | null>(() => existingRelationship?.symmetric.tension ?? null);
  const [secrecy, setSecrecy] = useState<number | null>(() => existingRelationship?.symmetric.secrecy ?? null);
  const [kinship, setKinship] = useState<KinshipKind>(() => existingRelationship?.symmetric.kinship ?? null);

  // ────── 方向プロパティ（person1→person2 方向 = UI の fwd ）──────
  // isReversed が false → stored.forward が UI fwd
  // isReversed が true  → stored.reverse が UI fwd

  /**
   * 既存関係から「UI の person1→person2」に対応する stored DirectionalProps を返す
   */
  const getStoredFwdProps = () => {
    if (!existingRelationship) return { affection: null, awareness: null, role: null };
    return isReversed ? existingRelationship.reverse : existingRelationship.forward;
  };

  /**
   * 既存関係から「UI の person2→person1」に対応する stored DirectionalProps を返す
   */
  const getStoredRevProps = () => {
    if (!existingRelationship) return { affection: null, awareness: null, role: null };
    return isReversed ? existingRelationship.forward : existingRelationship.reverse;
  };

  // person1→person2 方向の affection（未設定を null で表現する）
  const [fwdAffection, setFwdAffection] = useState<number | null>(() => getStoredFwdProps().affection ?? null);
  // person1→person2 方向の awareness / role
  const [fwdAwareness, setFwdAwareness] = useState<AwarenessKind>(() => getStoredFwdProps().awareness ?? null);
  const [fwdRole, setFwdRole] = useState<string>(() => getStoredFwdProps().role ?? '');

  // person2→person1 方向の affection（未設定を null で表現する）
  const [revAffection, setRevAffection] = useState<number | null>(() => getStoredRevProps().affection ?? null);
  // person2→person1 方向の awareness / role
  const [revAwareness, setRevAwareness] = useState<AwarenessKind>(() => getStoredRevProps().awareness ?? null);
  const [revRole, setRevRole] = useState<string>(() => getStoredRevProps().role ?? '');

  // ────── narrative ──────

  const [narrativeSummary, setNarrativeSummary] = useState<string>(() => existingRelationship?.narrative.summary ?? '');
  const [narrativeNotes, setNarrativeNotes] = useState<string>(() => existingRelationship?.narrative.notes ?? '');
  const [turningPoints, setTurningPoints] = useState<TurningPointRow[]>(() =>
    (existingRelationship?.narrative.turningPoints ?? []).map((tp) => ({ id: nanoid(), ...tp }))
  );

  // ────── colorOverride ──────

  const [colorOverride, setColorOverride] = useState<string | null>(() => existingRelationship?.colorOverride ?? null);
  const [colorPickerEnabled, setColorPickerEnabled] = useState<boolean>(() => existingRelationship?.colorOverride !== null && existingRelationship?.colorOverride !== undefined);

  // ────── フォーム同期 useEffect ──────

  // existingRelationshipまたはisReversedの変化に応じてフォーム状態を再同期
  useEffect(() => {
    if (existingRelationship) {
      const displayType = getRelationshipDisplayType(existingRelationship);
      setRelationshipType(displayType);

      if (displayType === 'one-way') {
        setSourceToTargetLabel(
          existingRelationship.forward.label ?? existingRelationship.reverse.label ?? ''
        );
        setTargetToSourceLabel('');
      } else {
        setSourceToTargetLabel(
          isReversed ? (existingRelationship.reverse.label ?? '') : (existingRelationship.forward.label ?? '')
        );
        setTargetToSourceLabel(
          isReversed ? (existingRelationship.forward.label ?? '') : (existingRelationship.reverse.label ?? '')
        );
      }

      // tags
      setTags(existingRelationship.tags);

      // symmetric（null はそのまま null として同期する）
      const sym = existingRelationship.symmetric;
      setCloseness(sym.closeness);
      setTrust(sym.trust);
      setTension(sym.tension);
      setSecrecy(sym.secrecy);
      setKinship(sym.kinship);

      // 方向プロパティ（isReversed を考慮）
      const fwd = isReversed ? existingRelationship.reverse : existingRelationship.forward;
      const rev = isReversed ? existingRelationship.forward : existingRelationship.reverse;

      setFwdAffection(fwd.affection);
      setFwdAwareness(fwd.awareness ?? null);
      setFwdRole(fwd.role ?? '');

      setRevAffection(rev.affection);
      setRevAwareness(rev.awareness ?? null);
      setRevRole(rev.role ?? '');

      // narrative
      setNarrativeSummary(existingRelationship.narrative.summary ?? '');
      setNarrativeNotes(existingRelationship.narrative.notes ?? '');
      setTurningPoints(
        existingRelationship.narrative.turningPoints.map((tp) => ({ id: nanoid(), ...tp }))
      );

      // colorOverride
      setColorOverride(existingRelationship.colorOverride);
      setColorPickerEnabled(existingRelationship.colorOverride !== null);
    } else {
      // 既存関係がない場合はフォームをリセット
      setRelationshipType('bidirectional');
      setSourceToTargetLabel('');
      setTargetToSourceLabel('');
      setTags([]);
      setCloseness(null);
      setTrust(null);
      setTension(null);
      setSecrecy(null);
      setKinship(null);
      setFwdAffection(null); setFwdAwareness(null); setFwdRole('');
      setRevAffection(null); setRevAwareness(null); setRevRole('');
      setNarrativeSummary(''); setNarrativeNotes('');
      setTurningPoints([]);
      setColorOverride(null); setColorPickerEnabled(false);
    }
  }, [existingRelationship, isReversed]);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    if (!isTypePickerOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdown = document.querySelector('[data-dropdown="relationship-type"]');
      const toggleButton = document.querySelector('[data-toggle="relationship-type"]');

      if (
        dropdown &&
        toggleButton &&
        !dropdown.contains(target) &&
        !toggleButton.contains(target)
      ) {
        setIsTypePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTypePickerOpen]);

  /** ノードを画面中央に移動する */
  const focusNode = (personId: string) => {
    const node = getNode(personId);
    if (node) {
      const center = getNodeCenter(node);
      setCenter(center.x, center.y, { duration: VIEWPORT_ANIMATION_DURATION });
    }
  };

  /** 人物を単一選択する */
  const handleSelectPerson = (personId: string) => {
    selectPerson(personId);
    focusNode(personId);
  };

  /** フォーム送信ハンドラ */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sourceToTargetLabel.trim()) return;
    if (relationshipType === 'dual-directed' && !targetToSourceLabel.trim()) return;

    // UIのRelationshipTypeを新しいデータモデルに変換
    let isDirected = true;
    const finalSourceToTargetLabel = sourceToTargetLabel.trim();
    let finalTargetToSourceLabel: string | null = null;

    if (relationshipType === 'bidirectional') {
      finalTargetToSourceLabel = finalSourceToTargetLabel;
    } else if (relationshipType === 'one-way') {
      finalTargetToSourceLabel = null;
    } else if (relationshipType === 'dual-directed') {
      finalTargetToSourceLabel = targetToSourceLabel.trim();
    } else if (relationshipType === 'undirected') {
      isDirected = false;
      finalTargetToSourceLabel = finalSourceToTargetLabel;
    }

    // v9 フィールドの値をビルド（null は未設定を表す）
    const symmetricPayload = {
      closeness,
      trust,
      tension,
      secrecy,
      kinship,
    };

    // UI fwd → stored forward/reverse の対応（isReversed を考慮）
    // isReversed=false: UI fwd = stored forward, UI rev = stored reverse
    // isReversed=true:  UI fwd = stored reverse, UI rev = stored forward
    const uiFwdProps = {
      affection: fwdAffection,
      awareness: fwdAwareness,
      role: fwdRole.trim() || null,
    };
    const uiRevProps = {
      affection: revAffection,
      awareness: revAwareness,
      role: revRole.trim() || null,
    };

    const narrativePayload = {
      summary: narrativeSummary.trim() || null,
      notes: narrativeNotes.trim() || null,
      // at も note も空の行は除外する
      turningPoints: turningPoints
        .filter((row) => row.at.trim() || row.note.trim())
        .map(({ at, note }) => ({ at, note })),
    };

    const colorOverridePayload = colorPickerEnabled ? colorOverride : null;

    if (existingRelationship) {
      // 既存の関係を更新（isReversedを考慮して forward/reverse を正しく設定）
      const forwardLabel =
        relationshipType === 'one-way'
          ? finalSourceToTargetLabel
          : isReversed ? finalTargetToSourceLabel : finalSourceToTargetLabel;
      const reverseLabel =
        relationshipType === 'one-way'
          ? null
          : isReversed ? finalSourceToTargetLabel : finalTargetToSourceLabel;

      // stored forward / reverse を決定
      const storedForwardProps = isReversed ? uiRevProps : uiFwdProps;
      const storedReverseProps = isReversed ? uiFwdProps : uiRevProps;

      updateRelationship(existingRelationship.id, {
        isDirected,
        symmetric: { ...existingRelationship.symmetric, ...symmetricPayload },
        forward: { ...existingRelationship.forward, label: forwardLabel, ...storedForwardProps },
        reverse: { ...existingRelationship.reverse, label: reverseLabel, ...storedReverseProps },
        tags,
        narrative: narrativePayload,
        colorOverride: colorOverridePayload,
      });
    } else {
      // 新規の関係を追加（v9形式）
      addRelationship({
        sourcePersonId: person1.id,
        targetPersonId: person2.id,
        isDirected,
        symmetric: symmetricPayload,
        forward: { label: finalSourceToTargetLabel, ...uiFwdProps },
        reverse: { label: finalTargetToSourceLabel, ...uiRevProps },
        tags,
        narrative: narrativePayload,
        colorOverride: colorOverridePayload,
      });
    }
  };

  // 相手のイニシャルと種別（画像がない場合）
  const person1Initial = person1.name.charAt(0).toUpperCase() || '?';
  const person2Initial = person2.name.charAt(0).toUpperCase() || '?';
  const person1Kind = person1.kind ?? 'person';
  const person2Kind = person2.kind ?? 'person';
  const person1IsItem = person1Kind === 'item';
  const person2IsItem = person2Kind === 'item';

  // 登録ボタンの有効/無効を判定
  const isSubmitDisabled =
    !sourceToTargetLabel.trim() ||
    (relationshipType === 'dual-directed' && !targetToSourceLabel.trim());

  return (
    <div className="flex flex-col h-full">
      {/* 関係追加/編集フォーム */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* フォーム上部: タイトルと選択解除ボタン */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">2人を選択中</h2>
          <button
            type="button"
            onClick={() => clearSelection()}
            className="text-xs text-gray-500 hover:text-gray-700"
            aria-label="選択を解除"
          >
            ✕ 選択解除
          </button>
        </div>

        {/* 2人の人物情報表示 + 関係タイプ選択 */}
        <div className="flex items-center justify-center gap-3 text-gray-700">
          {/* 人物/物1のアイコン */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectPerson(person1.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectPerson(person1.id);
              }
            }}
            aria-label={`${person1.name}を選択`}
            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity"
          >
            {person1.imageDataUrl ? (
              <img
                src={person1.imageDataUrl}
                alt={person1.name}
                className={`w-16 h-16 object-cover border border-gray-300 ${person1IsItem ? 'rounded-lg' : 'rounded-full'}`}
              />
            ) : (
              <div className={`w-16 h-16 bg-gray-300 flex items-center justify-center text-gray-700 text-lg font-semibold border border-gray-300 ${person1IsItem ? 'rounded-lg' : 'rounded-full'}`}>
                {person1Initial}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">
              {person1.name}
            </span>
          </div>

          {/* 関係タイプ選択（クリックで展開） */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTypePickerOpen(!isTypePickerOpen)}
              aria-label="関係タイプを選択"
              className="w-10 h-10 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition-colors"
              data-toggle="relationship-type"
            >
              {relationshipType === 'one-way' && (
                isReversed ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />
              )}
              {relationshipType === 'bidirectional' && <BidirectionalArrow className="w-6 h-6" />}
              {relationshipType === 'dual-directed' && <ArrowLeftRight className="w-6 h-6" />}
              {relationshipType === 'undirected' && <Minus className="w-6 h-6" />}
            </button>

            {/* 関係タイプ選択ドロップダウン */}
            {isTypePickerOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-300 rounded-md shadow-lg p-1 flex gap-1 z-10"
                data-dropdown="relationship-type"
              >
                <button
                  type="button"
                  onClick={() => { setRelationshipType('one-way'); setIsTypePickerOpen(false); }}
                  aria-pressed={relationshipType === 'one-way'}
                  aria-label="片方向"
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    relationshipType === 'one-way' ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
                  }`}
                >
                  {isReversed ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setRelationshipType('bidirectional'); setIsTypePickerOpen(false); }}
                  aria-pressed={relationshipType === 'bidirectional'}
                  aria-label="双方向"
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    relationshipType === 'bidirectional' ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
                  }`}
                >
                  <BidirectionalArrow className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => { setRelationshipType('dual-directed'); setIsTypePickerOpen(false); }}
                  aria-pressed={relationshipType === 'dual-directed'}
                  aria-label="片方向×2"
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    relationshipType === 'dual-directed' ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeftRight className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => { setRelationshipType('undirected'); setIsTypePickerOpen(false); }}
                  aria-pressed={relationshipType === 'undirected'}
                  aria-label="無方向"
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    relationshipType === 'undirected' ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
                  }`}
                >
                  <Minus className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>

          {/* 人物/物2のアイコン */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectPerson(person2.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectPerson(person2.id);
              }
            }}
            aria-label={`${person2.name}を選択`}
            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity"
          >
            {person2.imageDataUrl ? (
              <img
                src={person2.imageDataUrl}
                alt={person2.name}
                className={`w-16 h-16 object-cover border border-gray-300 ${person2IsItem ? 'rounded-lg' : 'rounded-full'}`}
              />
            ) : (
              <div className={`w-16 h-16 bg-gray-300 flex items-center justify-center text-gray-700 text-lg font-semibold border border-gray-300 ${person2IsItem ? 'rounded-lg' : 'rounded-full'}`}>
                {person2Initial}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">
              {person2.name}
            </span>
          </div>
        </div>

        {/* ラベル入力 */}
        {relationshipType === 'dual-directed' ? (
          <>
            <div>
              <label htmlFor="relationship-label" className="block text-sm font-medium text-gray-700 mb-2">
                関係のラベル
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <PersonMiniIcon person={person1} />
                <span>→</span>
                <PersonMiniIcon person={person2} />
              </div>
              <input
                id="relationship-label"
                type="text"
                value={sourceToTargetLabel}
                onChange={(e) => setSourceToTargetLabel(e.target.value)}
                maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
                placeholder={getPlaceholder('dual-directed', false, hasItem)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="reverse-relationship-label" className="block text-sm font-medium text-gray-700 mb-2">
                逆方向のラベル
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <PersonMiniIcon person={person1} />
                <span>←</span>
                <PersonMiniIcon person={person2} />
              </div>
              <input
                id="reverse-relationship-label"
                type="text"
                value={targetToSourceLabel}
                onChange={(e) => setTargetToSourceLabel(e.target.value)}
                maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
                placeholder={getPlaceholder('dual-directed', true, hasItem)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="relationship-label" className="block text-sm font-medium text-gray-700 mb-2">
              関係のラベル
            </label>
            {relationshipType !== 'undirected' && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <PersonMiniIcon person={person1} />
                <span>{getDirectionIndicator(relationshipType, isReversed)}</span>
                <PersonMiniIcon person={person2} />
              </div>
            )}
            <input
              id="relationship-label"
              type="text"
              value={sourceToTargetLabel}
              onChange={(e) => setSourceToTargetLabel(e.target.value)}
              maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
              placeholder={getPlaceholder(relationshipType, false, hasItem)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* タグ chip 入力（常時表示） */}
        <TagChipInput
          value={tags}
          onChange={setTags}
          suggestions={SUGGESTED_TAGS}
          datalistId="tag-suggestions"
        />

        {/* ─── 定型フィールド アコーディオン ─── */}
        <details className="border border-gray-200 rounded-md">
          <summary className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-50 list-none">
            定型フィールド
          </summary>
          <div className="px-3 pb-3 space-y-4 border-t border-gray-100 pt-3">

            {/* 対称プロパティ */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">対称プロパティ</h4>
              <NullableSlider
                label="親密度"
                value={closeness}
                min={0} max={1} step={0.05}
                defaultValue={0.5}
                onChange={setCloseness}
              />
              <NullableSlider
                label="信頼度"
                value={trust}
                min={0} max={1} step={0.05}
                defaultValue={0.5}
                onChange={setTrust}
              />
              <NullableSlider
                label="緊張・対立度"
                value={tension}
                min={0} max={1} step={0.05}
                defaultValue={0.5}
                onChange={setTension}
              />
              <NullableSlider
                label="秘匿性"
                value={secrecy}
                min={0} max={1} step={0.05}
                defaultValue={0.5}
                onChange={setSecrecy}
              />
              {/* kinship セレクト */}
              <div className="space-y-1">
                <label htmlFor="kinship-select" className="block text-xs font-medium text-gray-700">
                  血縁・親族
                </label>
                <select
                  id="kinship-select"
                  value={kinship ?? ''}
                  onChange={(e) => setKinship((e.target.value as KinshipKind) || null)}
                  aria-label="血縁・親族"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {KINSHIP_OPTIONS.map((opt) => (
                    <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 方向プロパティ: person1 → person2 */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {person1.name}→{person2.name}
              </h4>
              <NullableSlider
                label={`${person1.name}→${person2.name} 好悪`}
                value={fwdAffection}
                min={-1} max={1} step={0.05}
                defaultValue={0}
                onChange={setFwdAffection}
              />
              <div className="space-y-1">
                <label
                  htmlFor="fwd-awareness-select"
                  className="block text-xs font-medium text-gray-700"
                  id="fwd-awareness-label"
                >
                  {person1.name}→{person2.name} 認知状況
                </label>
                <select
                  id="fwd-awareness-select"
                  value={fwdAwareness ?? ''}
                  onChange={(e) => setFwdAwareness((e.target.value as AwarenessKind) || null)}
                  aria-label={`${person1.name}→${person2.name} 認知状況`}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {AWARENESS_OPTIONS.map((opt) => (
                    <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="fwd-role-input" className="block text-xs font-medium text-gray-700">
                  {person1.name}→{person2.name} 役割
                </label>
                <input
                  id="fwd-role-input"
                  type="text"
                  value={fwdRole}
                  onChange={(e) => setFwdRole(e.target.value)}
                  aria-label={`${person1.name}→${person2.name} 役割`}
                  placeholder="例: 上司、師匠"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 方向プロパティ: person2 → person1 */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {person2.name}→{person1.name}
              </h4>
              <NullableSlider
                label={`${person2.name}→${person1.name} 好悪`}
                value={revAffection}
                min={-1} max={1} step={0.05}
                defaultValue={0}
                onChange={setRevAffection}
              />
              <div className="space-y-1">
                <label
                  htmlFor="rev-awareness-select"
                  className="block text-xs font-medium text-gray-700"
                >
                  {person2.name}→{person1.name} 認知状況
                </label>
                <select
                  id="rev-awareness-select"
                  value={revAwareness ?? ''}
                  onChange={(e) => setRevAwareness((e.target.value as AwarenessKind) || null)}
                  aria-label={`${person2.name}→${person1.name} 認知状況`}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {AWARENESS_OPTIONS.map((opt) => (
                    <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="rev-role-input" className="block text-xs font-medium text-gray-700">
                  {person2.name}→{person1.name} 役割
                </label>
                <input
                  id="rev-role-input"
                  type="text"
                  value={revRole}
                  onChange={(e) => setRevRole(e.target.value)}
                  aria-label={`${person2.name}→${person1.name} 役割`}
                  placeholder="例: 部下、弟子"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </details>

        {/* ─── 物語的情報 アコーディオン ─── */}
        <details className="border border-gray-200 rounded-md">
          <summary className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-50 list-none">
            物語的情報
          </summary>
          <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
            {/* summary */}
            <div className="space-y-1">
              <label htmlFor="narrative-summary" className="block text-xs font-medium text-gray-700">
                関係の概要
              </label>
              <textarea
                id="narrative-summary"
                value={narrativeSummary}
                onChange={(e) => setNarrativeSummary(e.target.value)}
                rows={3}
                placeholder="関係の背景・物語的な概要を記述"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* notes */}
            <div className="space-y-1">
              <label htmlFor="narrative-notes" className="block text-xs font-medium text-gray-700">
                メモ・補足
              </label>
              <textarea
                id="narrative-notes"
                value={narrativeNotes}
                onChange={(e) => setNarrativeNotes(e.target.value)}
                rows={2}
                placeholder="メモや補足情報"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* turningPoints */}
            <TurningPointsEditor value={turningPoints} onChange={setTurningPoints} />
          </div>
        </details>

        {/* ─── colorOverride ─── */}
        <div className="space-y-1">
          <span className="block text-xs font-medium text-gray-700">エッジの色</span>
          {colorPickerEnabled ? (
            <div className="flex items-center gap-2">
              <input
                id="color-override-picker"
                type="color"
                value={colorOverride ?? DEFAULT_EDGE_COLOR}
                onChange={(e) => setColorOverride(e.target.value)}
                aria-label="エッジの色"
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <button
                type="button"
                onClick={() => { setColorOverride(null); setColorPickerEnabled(false); }}
                aria-label="色をクリア"
                className="text-xs text-gray-500 hover:text-red-600 hover:underline"
              >
                クリア
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">タグから派生</span>
              <button
                type="button"
                onClick={() => {
                  setColorPickerEnabled(true);
                  if (!colorOverride) setColorOverride(DEFAULT_EDGE_COLOR);
                }}
                aria-label="色を上書きする"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                上書きする
              </button>
            </div>
          )}
        </div>

        {/* 登録/更新ボタン */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-auto"
        >
          {existingRelationship ? '更新' : '登録'}
        </button>
      </form>

      {/* 削除ボタン（既存関係がある場合のみ、パネル最下部） */}
      {existingRelationship && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => removeRelationship(existingRelationship.id)}
            className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            この関係を削除
          </button>
        </div>
      )}
    </div>
  );
}
