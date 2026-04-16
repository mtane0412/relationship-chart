/**
 * RelationshipRegistrationModalコンポーネント
 * エッジ接続時に関係を登録するためのモーダル
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeftRight, Minus } from 'lucide-react';
import { BidirectionalArrow } from '@/components/icons/BidirectionalArrow';
import { MAX_RELATIONSHIP_LABEL_LENGTH } from '@/lib/validation-constants';
import type { RelationshipType, RelationshipLayer } from '@/types/relationship';
import { RELATIONSHIP_LAYERS, DEFAULT_LAYER } from '@/types/relationship';

/** weightスライダーのデフォルト値（中央値） */
const DEFAULT_WEIGHT_VALUE = 0.5;

/**
 * モーダルで表示する人物情報
 */
type ModalPersonInfo = {
  /** 人物名 */
  name: string;
  /** 人物の画像データURL（任意） */
  imageDataUrl?: string;
};

/**
 * 編集時の初期データ（UI用のRelationshipType形式）
 */
type InitialRelationship = {
  /** 関係のタイプ（UI表示用） */
  type: RelationshipType;
  /** sourceからtargetへのラベル */
  sourceToTargetLabel: string;
  /** targetからsourceへのラベル（dual-directedのみ） */
  targetToSourceLabel: string | null;
  /** レイヤー（省略時はデフォルトレイヤーを使用） */
  layer?: RelationshipLayer;
  /** 感情の強度（0.0〜1.0、emotionalレイヤーのみ有効） */
  weight?: number | null;
};

/**
 * RelationshipRegistrationModalのプロパティ
 */
type RelationshipRegistrationModalProps = {
  /** モーダルの表示/非表示 */
  isOpen: boolean;
  /** 接続元の人物情報 */
  sourcePerson: ModalPersonInfo;
  /** 接続先の人物情報 */
  targetPerson: ModalPersonInfo;
  /** デフォルトの関係タイプ（省略時はbidirectional） */
  defaultType?: RelationshipType;
  /** 編集時の初期データ（省略可能） */
  initialRelationship?: InitialRelationship;
  /** 登録ボタンクリック時のコールバック */
  onSubmit: (
    type: RelationshipType,
    sourceToTargetLabel: string,
    targetToSourceLabel: string | null,
    layer: RelationshipLayer,
    weight: number | null
  ) => void;
  /** キャンセルボタンクリック時のコールバック */
  onCancel: () => void;
};

/**
 * 人物のミニアイコンを表示するヘルパーコンポーネント
 * ラベル入力の方向コンテキスト表示に使用
 */
function PersonMiniIcon({ person, testId }: { person: ModalPersonInfo; testId: string }) {
  if (person.imageDataUrl) {
    return (
      <img
        data-testid={testId}
        src={person.imageDataUrl}
        alt={person.name}
        className="w-6 h-6 rounded-full object-cover border border-gray-300"
      />
    );
  }
  return (
    <div
      data-testid={testId}
      className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold border border-gray-300"
    >
      {person.name.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

/**
 * 関係タイプに応じたプレースホルダーを返す
 */
function getPlaceholder(type: RelationshipType, isReverse = false): string {
  if (type === 'one-way') {
    return '例: 片想い、憧れ';
  }
  if (type === 'bidirectional') {
    return '例: 友人、親子、同僚';
  }
  if (type === 'dual-directed') {
    return isReverse ? '例: 無関心、嫌い' : '例: 好き、憧れ';
  }
  if (type === 'undirected') {
    return '例: 同一人物、別名';
  }
  return '例: 関係を入力';
}

/**
 * 関係登録モーダルコンポーネント
 */
export function RelationshipRegistrationModal({
  isOpen,
  sourcePerson,
  targetPerson,
  defaultType = 'bidirectional',
  initialRelationship,
  onSubmit,
  onCancel,
}: RelationshipRegistrationModalProps) {
  // 編集モードかどうか
  const isEditMode = Boolean(initialRelationship);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('bidirectional');
  const [sourceToTargetLabel, setSourceToTargetLabel] = useState('');
  const [targetToSourceLabel, setTargetToSourceLabel] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<RelationshipLayer>(DEFAULT_LAYER);
  // weightの状態（nullは未設定、supportsWeightのレイヤーで有効）
  const [weight, setWeight] = useState<number | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const labelSelectRef = useRef<HTMLSelectElement>(null);
  // モーダルが「新たに開いた」直後のフォーカス制御フラグ
  const justOpenedRef = useRef(false);

  // 現在選択されているレイヤーのスキーマ定義
  const currentLayerDef = RELATIONSHIP_LAYERS.find((l) => l.value === selectedLayer)!;

  /**
   * fixedレイヤー用ラベル正規化
   * - fixedレイヤーでは候補外のラベルを空文字に落とす
   * - fixed以外のレイヤーではラベルをそのまま返す
   */
  const normalizeLabelForLayer = (label: string, layer: RelationshipLayer) => {
    const layerDef = RELATIONSHIP_LAYERS.find((l) => l.value === layer);
    if (!layerDef || layerDef.labelSystem !== 'fixed') return label;
    return layerDef.suggestedLabels?.includes(label) ? label : '';
  };

  /**
   * レイヤー変更時の処理
   * - allowDirectionOverride=falseのレイヤーに変更した場合、方向をdefaultDirectedに強制
   * - supportsWeight=falseのレイヤーに変更した場合、weightをnullにリセット
   * - fixedレイヤーに変更した場合、候補外ラベルを空文字に正規化
   */
  const handleLayerChange = (newLayer: RelationshipLayer) => {
    const newLayerDef = RELATIONSHIP_LAYERS.find((l) => l.value === newLayer)!;
    setSelectedLayer(newLayer);

    // fixedレイヤーに切り替えた場合は候補外ラベルを正規化
    setSourceToTargetLabel((prev) => normalizeLabelForLayer(prev, newLayer));

    // 方向変更不可のレイヤーに切り替えた場合は方向をデフォルトに強制
    if (!newLayerDef.allowDirectionOverride) {
      setRelationshipType(newLayerDef.defaultDirected ? 'one-way' : 'undirected');
    }

    // weight非対応レイヤーに切り替えた場合はweightをリセット
    if (!newLayerDef.supportsWeight) {
      setWeight(null);
    } else if (weight === null) {
      // weight対応レイヤーに切り替えた場合でweightが未設定ならデフォルト値を設定
      setWeight(DEFAULT_WEIGHT_VALUE);
    }
  };

  // モーダルが開いたときに初期値を設定
  useEffect(() => {
    if (isOpen) {
      // フォーカス制御フラグをセット（selectedLayer更新後のレンダリングでフォーカスを実行）
      justOpenedRef.current = true;

      // 初期値を設定（編集モードの場合は initialRelationship から、そうでなければデフォルト値）
      if (initialRelationship) {
        const restoredLayer = initialRelationship.layer ?? DEFAULT_LAYER;
        const restoredLayerDef = RELATIONSHIP_LAYERS.find((l) => l.value === restoredLayer)!;
        // allowDirectionOverride=falseのレイヤーでは方向をデフォルトに強制（保存データとの不整合を防ぐ）
        const normalizedType = restoredLayerDef.allowDirectionOverride
          ? initialRelationship.type
          : restoredLayerDef.defaultDirected
            ? 'one-way'
            : 'undirected';
        setRelationshipType(normalizedType);
        // fixedレイヤーの場合は候補外ラベルを正規化して復元
        setSourceToTargetLabel(
          normalizeLabelForLayer(initialRelationship.sourceToTargetLabel, restoredLayer)
        );
        setTargetToSourceLabel(initialRelationship.targetToSourceLabel || '');
        setSelectedLayer(restoredLayer);
        // supportsWeight=falseのレイヤーではweightをnullに正規化（保存データとの不整合を防ぐ）
        setWeight(restoredLayerDef.supportsWeight ? (initialRelationship.weight ?? null) : null);
      } else {
        // フォームをリセット（defaultTypeを使用）
        setRelationshipType(defaultType);
        setSourceToTargetLabel('');
        setTargetToSourceLabel('');
        setSelectedLayer(DEFAULT_LAYER);
        setWeight(null);
      }
    }
  }, [isOpen, defaultType, initialRelationship]);

  // フォーカス制御: selectedLayerが確定しDOMが更新された後に実行
  // justOpenedRefフラグでモーダルが新たに開いた直後のみフォーカスを当てる
  // isOpenを依存に含めることで同じレイヤーで再オープンした場合もフォーカスを当てる
  useEffect(() => {
    if (!isOpen || !justOpenedRef.current) return;
    justOpenedRef.current = false;
    const layerDef = RELATIONSHIP_LAYERS.find((l) => l.value === selectedLayer)!;
    if (layerDef.labelSystem === 'fixed') {
      labelSelectRef.current?.focus();
    } else {
      labelInputRef.current?.focus();
    }
  }, [isOpen, selectedLayer]);

  // Escapeキーでキャンセル
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // 登録ボタンの有効/無効を判定
  const isSubmitDisabled =
    !sourceToTargetLabel.trim() ||
    (relationshipType === 'dual-directed' && !targetToSourceLabel.trim());

  // 登録処理
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    const finalTargetToSourceLabel =
      relationshipType === 'dual-directed' ? targetToSourceLabel.trim() : null;

    onSubmit(relationshipType, sourceToTargetLabel.trim(), finalTargetToSourceLabel, selectedLayer, weight);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(event) => {
        // キーボードトリガーや合成クリック（detail === 0）は無視
        if (event.detail === 0) {
          return;
        }
        onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-modal-title"
        className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="relationship-modal-title"
          className="text-xl font-bold text-gray-900 mb-4"
        >
          {isEditMode ? '関係を編集' : '関係を登録'}
        </h2>

        {/* 2人の人物情報表示 + セグメントコントロール */}
        <div className="mb-4 flex items-center justify-center gap-3 text-gray-700">
          {/* 接続元の人物 */}
          <div className="flex items-center gap-2">
            {sourcePerson.imageDataUrl ? (
              <img
                src={sourcePerson.imageDataUrl}
                alt={sourcePerson.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div
                data-testid="person-initial-source"
                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold border border-gray-300"
              >
                {sourcePerson.name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <span className="font-medium">{sourcePerson.name}</span>
          </div>

          {/* セグメントコントロール（関係タイプ選択）: allowDirectionOverride=falseのレイヤーでは非表示 */}
          {currentLayerDef.allowDirectionOverride && (
            <div className="flex gap-1 bg-gray-100 rounded-md p-1">
              {/* 片方向 (one-way) */}
              <button
                type="button"
                onClick={() => setRelationshipType('one-way')}
                aria-pressed={relationshipType === 'one-way'}
                aria-label="片方向"
                className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                  relationshipType === 'one-way'
                    ? 'bg-blue-100 ring-2 ring-blue-500'
                    : 'hover:bg-gray-200'
                }`}
              >
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* 双方向 (bidirectional) */}
              <button
                type="button"
                onClick={() => setRelationshipType('bidirectional')}
                aria-pressed={relationshipType === 'bidirectional'}
                aria-label="双方向"
                className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                  relationshipType === 'bidirectional'
                    ? 'bg-blue-100 ring-2 ring-blue-500'
                    : 'hover:bg-gray-200'
                }`}
              >
                <BidirectionalArrow className="w-5 h-5" />
              </button>

              {/* 片方向×2 (dual-directed) */}
              <button
                type="button"
                onClick={() => setRelationshipType('dual-directed')}
                aria-pressed={relationshipType === 'dual-directed'}
                aria-label="片方向×2"
                className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                  relationshipType === 'dual-directed'
                    ? 'bg-blue-100 ring-2 ring-blue-500'
                    : 'hover:bg-gray-200'
                }`}
              >
                <ArrowLeftRight className="w-5 h-5" />
              </button>

              {/* 無方向 (undirected) */}
              <button
                type="button"
                onClick={() => setRelationshipType('undirected')}
                aria-pressed={relationshipType === 'undirected'}
                aria-label="無方向"
                className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                  relationshipType === 'undirected'
                    ? 'bg-blue-100 ring-2 ring-blue-500'
                    : 'hover:bg-gray-200'
                }`}
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* 接続先の人物 */}
          <div className="flex items-center gap-2">
            {targetPerson.imageDataUrl ? (
              <img
                src={targetPerson.imageDataUrl}
                alt={targetPerson.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div
                data-testid="person-initial-target"
                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold border border-gray-300"
              >
                {targetPerson.name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <span className="font-medium">{targetPerson.name}</span>
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
          {/* レイヤー選択 */}
          <div className="mb-4">
            <label
              htmlFor="relationship-layer"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              レイヤー
            </label>
            <select
              id="relationship-layer"
              value={selectedLayer}
              onChange={(e) => handleLayerChange(e.target.value as RelationshipLayer)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {RELATIONSHIP_LAYERS.map((layer) => (
                <option key={layer.value} value={layer.value}>
                  {layer.label}（{layer.description}）
                </option>
              ))}
            </select>
          </div>

          {/* ラベル入力（方向コンテキスト付き） */}
          {currentLayerDef.labelSystem === 'fixed' ? (
            // fixed: suggestedLabels からselectで選択
            <div className="mb-4">
              <label
                htmlFor="relationship-label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                関係のラベル
              </label>
              <select
                ref={labelSelectRef}
                id="relationship-label"
                value={sourceToTargetLabel}
                onChange={(e) => setSourceToTargetLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">選択してください</option>
                {currentLayerDef.suggestedLabels?.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : relationshipType === 'dual-directed' ? (
            // dual-directed: 2つのラベル入力セット（semi-fixed/free）
            <>
              <div className="mb-4">
                <label
                  htmlFor="relationship-label"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  関係のラベル
                </label>
                {/* 方向インジケーター（A → B） */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <PersonMiniIcon person={sourcePerson} testId="mini-icon-source-forward" />
                  <span>→</span>
                  <PersonMiniIcon person={targetPerson} testId="mini-icon-target-forward" />
                </div>
                <input
                  ref={labelInputRef}
                  id="relationship-label"
                  type="text"
                  list={currentLayerDef.labelSystem === 'semi-fixed' ? 'label-suggestions' : undefined}
                  value={sourceToTargetLabel}
                  onChange={(e) => setSourceToTargetLabel(e.target.value)}
                  maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
                  placeholder={getPlaceholder('dual-directed', false)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {currentLayerDef.labelSystem === 'semi-fixed' && currentLayerDef.suggestedLabels && (
                  <datalist id="label-suggestions">
                    {currentLayerDef.suggestedLabels.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </datalist>
                )}
              </div>
              <div className="mb-4">
                <label
                  htmlFor="reverse-relationship-label"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  逆方向のラベル
                </label>
                {/* 方向インジケーター（A ← B） */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <PersonMiniIcon person={sourcePerson} testId="mini-icon-source-reverse" />
                  <span>←</span>
                  <PersonMiniIcon person={targetPerson} testId="mini-icon-target-reverse" />
                </div>
                <input
                  id="reverse-relationship-label"
                  type="text"
                  list={currentLayerDef.labelSystem === 'semi-fixed' ? 'label-suggestions' : undefined}
                  value={targetToSourceLabel}
                  onChange={(e) => setTargetToSourceLabel(e.target.value)}
                  maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
                  placeholder={getPlaceholder('dual-directed', true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          ) : (
            // one-way / bidirectional / undirected: 単一ラベル入力（semi-fixed/free）
            <div className="mb-4">
              <label
                htmlFor="relationship-label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                関係のラベル
              </label>
              {/* 方向インジケーター */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <PersonMiniIcon person={sourcePerson} testId="mini-icon-source-single" />
                <span>
                  {relationshipType === 'one-way' && '→'}
                  {relationshipType === 'bidirectional' && '↔'}
                  {relationshipType === 'undirected' && '—'}
                </span>
                <PersonMiniIcon person={targetPerson} testId="mini-icon-target-single" />
              </div>
              <input
                ref={labelInputRef}
                id="relationship-label"
                type="text"
                list={currentLayerDef.labelSystem === 'semi-fixed' ? 'label-suggestions' : undefined}
                value={sourceToTargetLabel}
                onChange={(e) => setSourceToTargetLabel(e.target.value)}
                maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
                placeholder={getPlaceholder(relationshipType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {currentLayerDef.labelSystem === 'semi-fixed' && currentLayerDef.suggestedLabels && (
                <datalist id="label-suggestions">
                  {currentLayerDef.suggestedLabels.map((label) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </datalist>
              )}
            </div>
          )}

          {/* weightスライダー（supportsWeight=trueのレイヤーのみ表示） */}
          {currentLayerDef.supportsWeight && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                強度
              </label>
              {weight === null ? (
                // 未設定状態: 「強度を設定する」ボタンで有効化
                <button
                  type="button"
                  onClick={() => setWeight(DEFAULT_WEIGHT_VALUE)}
                  className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  強度を設定する
                </button>
              ) : (
                // 設定済み状態: スライダーと「未設定にする」ボタン
                <div className="space-y-2">
                  <input
                    id="relationship-weight"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value))}
                    className="w-full"
                    aria-label={`強度: ${weight.toFixed(1)}`}
                  />
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{weight.toFixed(1)}</span>
                    <button
                      type="button"
                      onClick={() => setWeight(null)}
                      className="text-gray-500 hover:text-gray-700 underline"
                    >
                      未設定にする
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isEditMode ? '更新' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
