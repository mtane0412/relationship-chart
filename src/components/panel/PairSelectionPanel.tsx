/**
 * PairSelectionPanelコンポーネント
 * 2人の人物が選択されている場合に表示されるパネル
 *
 * v11プロパティグラフ方式対応:
 * - ペア間の全エッジをリスト表示（マルチグラフ対応）
 * - 選択したエッジを編集: type（文字列）、label（任意）、symmetric（無向フラグ）
 * - エッジのプロパティ（closeness/trust/tension/secrecy/affection/awareness/role）をフォーム編集
 * - 物語的情報（summary/notes/turningPoints）をアコーディオンで編集
 * - colorOverride: カラーピッカー
 * - 新規エッジの追加
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { nanoid } from 'nanoid';
import { useReactFlow } from '@xyflow/react';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { NullableSlider } from '@/components/ui/NullableSlider';
import { TagChipInput } from '@/components/ui/TagChipInput';
import { TurningPointsEditor } from '@/components/panel/TurningPointsEditor';
import type { TurningPointRow } from '@/components/panel/TurningPointsEditor';
import { PersonMiniIcon } from '@/components/panel/PersonMiniIcon';
import { AWARENESS_OPTIONS } from '@/components/panel/pairSelectionHelpers';
import { useGraphStore } from '@/stores/useGraphStore';
import { MAX_RELATIONSHIP_LABEL_LENGTH } from '@/lib/validation-constants';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';
import { deriveNodeVisual } from '@/lib/node-visual';
import type { Person } from '@/types/person';
import type { AwarenessKind } from '@/types/relationship';
import { SUGGESTED_TAGS, SUGGESTED_TYPES } from '@/types/relationship';

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

  // ペア間の全エッジを取得（双方向どちらでも）
  const edgesForPair = useMemo(
    () =>
      relationships.filter(
        (r) =>
          (r.sourceId === person1.id && r.targetId === person2.id) ||
          (r.sourceId === person2.id && r.targetId === person1.id)
      ),
    [relationships, person1.id, person2.id]
  );

  // 選択中のエッジID（null = 新規追加モード）
  // edgesForPairが変化しても選択が壊れないよう管理
  const [selectedRelId, setSelectedRelId] = useState<string | 'new' | null>(
    () => edgesForPair[0]?.id ?? 'new'
  );

  // 選択されたエッジ（null = 新規追加モード）
  const selectedEdge = useMemo(
    () => edgesForPair.find((r) => r.id === selectedRelId) ?? null,
    [edgesForPair, selectedRelId]
  );

  // ────── フォーム状態 ──────

  const [edgeType, setEdgeType] = useState<string>(() => selectedEdge?.type ?? '');
  const [label, setLabel] = useState<string>(() => selectedEdge?.label ?? '');
  const [symmetric, setSymmetric] = useState<boolean>(() => selectedEdge?.symmetric ?? false);
  const [tags, setTags] = useState<string[]>(() => selectedEdge?.tags ?? []);
  const [closeness, setCloseness] = useState<number | null>(() => selectedEdge?.properties.closeness ?? null);
  const [trust, setTrust] = useState<number | null>(() => selectedEdge?.properties.trust ?? null);
  const [tension, setTension] = useState<number | null>(() => selectedEdge?.properties.tension ?? null);
  const [secrecy, setSecrecy] = useState<number | null>(() => selectedEdge?.properties.secrecy ?? null);
  const [affection, setAffection] = useState<number | null>(() => selectedEdge?.properties.affection ?? null);
  const [awareness, setAwareness] = useState<AwarenessKind>(() => (selectedEdge?.properties.awareness as AwarenessKind) ?? null);
  const [role, setRole] = useState<string>(() => (selectedEdge?.properties.role as string) ?? '');
  const [narrativeSummary, setNarrativeSummary] = useState<string>(() => selectedEdge?.narrative.summary ?? '');
  const [narrativeNotes, setNarrativeNotes] = useState<string>(() => selectedEdge?.narrative.notes ?? '');
  const [turningPoints, setTurningPoints] = useState<TurningPointRow[]>(() =>
    (selectedEdge?.narrative.turningPoints ?? []).map((tp) => ({ id: nanoid(), ...tp }))
  );
  const [colorOverride, setColorOverride] = useState<string | null>(() => selectedEdge?.colorOverride ?? null);
  const [colorPickerEnabled, setColorPickerEnabled] = useState<boolean>(
    () => selectedEdge?.colorOverride !== null && selectedEdge?.colorOverride !== undefined
  );

  // ────── 選択エッジ変更時のフォーム同期 ──────

  useEffect(() => {
    if (selectedEdge) {
      setEdgeType(selectedEdge.type);
      setLabel(selectedEdge.label ?? '');
      setSymmetric(selectedEdge.symmetric);
      setTags(selectedEdge.tags);
      setCloseness(selectedEdge.properties.closeness ?? null);
      setTrust(selectedEdge.properties.trust ?? null);
      setTension(selectedEdge.properties.tension ?? null);
      setSecrecy(selectedEdge.properties.secrecy ?? null);
      setAffection(selectedEdge.properties.affection ?? null);
      setAwareness((selectedEdge.properties.awareness as AwarenessKind) ?? null);
      setRole((selectedEdge.properties.role as string) ?? '');
      setNarrativeSummary(selectedEdge.narrative.summary ?? '');
      setNarrativeNotes(selectedEdge.narrative.notes ?? '');
      setTurningPoints(
        selectedEdge.narrative.turningPoints.map((tp) => ({ id: nanoid(), ...tp }))
      );
      setColorOverride(selectedEdge.colorOverride);
      setColorPickerEnabled(selectedEdge.colorOverride !== null);
    } else {
      // 新規追加モード: フォームをリセット
      setEdgeType('');
      setLabel('');
      setSymmetric(false);
      setTags([]);
      setCloseness(null);
      setTrust(null);
      setTension(null);
      setSecrecy(null);
      setAffection(null);
      setAwareness(null);
      setRole('');
      setNarrativeSummary('');
      setNarrativeNotes('');
      setTurningPoints([]);
      setColorOverride(null);
      setColorPickerEnabled(false);
    }
  }, [selectedEdge]);

  // edgesForPairが空になったら新規モードに切り替え
  useEffect(() => {
    if (edgesForPair.length === 0) {
      setSelectedRelId('new');
    }
  }, [edgesForPair]);

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
    if (!edgeType.trim()) return;

    const narrativePayload = {
      summary: narrativeSummary.trim() || null,
      notes: narrativeNotes.trim() || null,
      turningPoints: turningPoints
        .filter((row) => row.at.trim() || row.note.trim())
        .map(({ at, note }) => ({ at, note })),
    };

    const propertiesPayload = {
      closeness,
      trust,
      tension,
      secrecy,
      affection,
      awareness,
      role: role.trim() || null,
    };

    const colorOverridePayload = colorPickerEnabled ? colorOverride : null;
    const labelPayload = label.trim() || null;

    if (selectedEdge) {
      // 既存エッジの更新
      updateRelationship(selectedEdge.id, {
        type: edgeType.trim(),
        label: labelPayload,
        symmetric,
        tags,
        properties: { ...selectedEdge.properties, ...propertiesPayload },
        narrative: narrativePayload,
        colorOverride: colorOverridePayload,
      });
    } else {
      // 新規エッジの追加
      addRelationship({
        type: edgeType.trim(),
        sourceId: person1.id,
        targetId: person2.id,
        label: labelPayload,
        symmetric,
        tags,
        properties: propertiesPayload,
        narrative: narrativePayload,
        colorOverride: colorOverridePayload,
      });
      // 追加後は最新エッジを選択（次のrenderで edgesForPair が更新される）
      setSelectedRelId(null);
    }
  };

  // 各人物のビジュアル属性
  const person1Visual = deriveNodeVisual(person1.labels);
  const person2Visual = deriveNodeVisual(person2.labels);
  const person1IsItem = person1Visual.shape === 'rounded-rect';
  const person2IsItem = person2Visual.shape === 'rounded-rect';

  // 登録ボタンの有効/無効
  const isSubmitDisabled = !edgeType.trim();

  // 新規追加後に最新エッジを自動選択
  useEffect(() => {
    if (selectedRelId === null && edgesForPair.length > 0) {
      setSelectedRelId(edgesForPair[edgesForPair.length - 1].id);
    }
  }, [edgesForPair, selectedRelId]);

  return (
    <div className="flex flex-col h-full">
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

        {/* 2人の人物情報表示 */}
        <div className="flex items-center justify-center gap-4 text-gray-700">
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
                className={`w-14 h-14 object-cover border border-gray-300 ${person1IsItem ? 'rounded-lg' : 'rounded-full'}`}
              />
            ) : (
              <div className={`w-14 h-14 bg-gray-300 flex items-center justify-center text-gray-700 text-lg font-semibold border border-gray-300 ${person1IsItem ? 'rounded-lg' : 'rounded-full'}`}>
                {person1.name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[72px]">
              {person1.name}
            </span>
          </div>

          {/* 関係のリスト + 追加ボタン */}
          <div className="flex flex-col items-center gap-1 min-w-0">
            {edgesForPair.map((edge) => {
              const isSource = edge.sourceId === person1.id;
              const isSelected = edge.id === selectedRelId;
              const displayLabel = edge.label ?? edge.type;
              return (
                <button
                  key={edge.id}
                  type="button"
                  onClick={() => setSelectedRelId(edge.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs max-w-[100px] truncate border transition-colors ${
                    isSelected
                      ? 'bg-blue-100 border-blue-400 text-blue-800'
                      : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={displayLabel}
                >
                  {edge.symmetric ? (
                    <Minus size={10} className="flex-shrink-0" />
                  ) : isSource ? (
                    <ArrowRight size={10} className="flex-shrink-0" />
                  ) : (
                    <ArrowRight size={10} className="flex-shrink-0 rotate-180" />
                  )}
                  <span className="truncate">{displayLabel}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedRelId('new')}
              aria-pressed={selectedRelId === 'new'}
              aria-label="新しい関係を追加"
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
                selectedRelId === 'new'
                  ? 'bg-green-100 border-green-400 text-green-800'
                  : 'bg-gray-50 border-dashed border-gray-300 text-gray-400 hover:text-gray-600'
              }`}
            >
              <Plus size={10} />
              追加
            </button>
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
                className={`w-14 h-14 object-cover border border-gray-300 ${person2IsItem ? 'rounded-lg' : 'rounded-full'}`}
              />
            ) : (
              <div className={`w-14 h-14 bg-gray-300 flex items-center justify-center text-gray-700 text-lg font-semibold border border-gray-300 ${person2IsItem ? 'rounded-lg' : 'rounded-full'}`}>
                {person2.name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[72px]">
              {person2.name}
            </span>
          </div>
        </div>

        {/* 方向インジケーター（選択中のエッジの向き） */}
        {selectedEdge && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <PersonMiniIcon person={selectedEdge.sourceId === person1.id ? person1 : person2} />
            {selectedEdge.symmetric ? (
              <Minus size={12} />
            ) : (
              <ArrowRight size={12} />
            )}
            <PersonMiniIcon person={selectedEdge.targetId === person2.id ? person2 : person1} />
          </div>
        )}

        {/* ─── エッジ編集フォーム ─── */}

        {/* エッジ型（type）入力 */}
        <div>
          <label htmlFor="edge-type" className="block text-sm font-medium text-gray-700 mb-1">
            関係タイプ
          </label>
          <input
            id="edge-type"
            type="text"
            list="edge-type-suggestions"
            value={edgeType}
            onChange={(e) => setEdgeType(e.target.value)}
            maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
            placeholder="例: 友人、親子、上司"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <datalist id="edge-type-suggestions">
            {SUGGESTED_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        {/* 表示ラベル（任意） */}
        <div>
          <label htmlFor="edge-label" className="block text-sm font-medium text-gray-700 mb-1">
            表示ラベル
            <span className="ml-1 text-xs text-gray-400">（省略時はタイプを表示）</span>
          </label>
          <input
            id="edge-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
            placeholder="省略可"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* symmetric トグル */}
        <div className="flex items-center gap-3">
          <label htmlFor="edge-symmetric" className="text-sm font-medium text-gray-700">
            無向（矢印なし）
          </label>
          <input
            id="edge-symmetric"
            type="checkbox"
            checked={symmetric}
            onChange={(e) => setSymmetric(e.target.checked)}
            aria-label="無向エッジ（矢印なし）"
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* タグ chip 入力 */}
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
            {/* 数値プロパティ */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">数値属性</h4>
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
            </div>

            {/* 方向プロパティ（起点→終点視点） */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {selectedEdge
                  ? `${selectedEdge.sourceId === person1.id ? person1.name : person2.name}→${selectedEdge.targetId === person2.id ? person2.name : person1.name}`
                  : `${person1.name}→${person2.name}`}
              </h4>
              <NullableSlider
                label="好悪"
                value={affection}
                min={-1} max={1} step={0.05}
                defaultValue={0}
                onChange={setAffection}
              />
              <div className="space-y-1">
                <label
                  htmlFor="awareness-select"
                  className="block text-xs font-medium text-gray-700"
                >
                  認知状況
                </label>
                <select
                  id="awareness-select"
                  value={awareness ?? ''}
                  onChange={(e) => setAwareness((e.target.value as AwarenessKind) || null)}
                  aria-label="認知状況"
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
                <label htmlFor="role-input" className="block text-xs font-medium text-gray-700">
                  役割
                </label>
                <input
                  id="role-input"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  aria-label="役割"
                  placeholder="例: 上司、師匠"
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
          {selectedEdge ? '更新' : '登録'}
        </button>
      </form>

      {/* 削除ボタン（既存エッジが選択されている場合のみ） */}
      {selectedEdge && (
        <div className="p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => removeRelationship(selectedEdge.id)}
            className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            この関係を削除
          </button>
        </div>
      )}
    </div>
  );
}
