/**
 * 相関図（Chart）の型定義
 * 複数の相関図を管理するためのデータモデル（v13 エピソードノード対応）
 */

import type { Person } from './person';
import type { Relationship } from './relationship';
import type { Snapshot } from './snapshot';
import type { Episode, EpisodeParticipation } from './episode';
import type { ForceParams } from '@/stores/useGraphStore';
import type { EgoLayoutParams } from '@/lib/ego-layout';

/**
 * 相関図の完全なデータを表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property name - 相関図の名前（最大50文字）
 * @property persons - この相関図に含まれる人物のリスト
 * @property relationships - この相関図に含まれる関係のリスト
 * @property episodes - この相関図に含まれるエピソードのリスト（v13以降）
 * @property episodeParticipations - エピソード参加エッジのリスト（v13以降）
 * @property forceEnabled - force-directedレイアウトが有効かどうか
 * @property forceParams - force-directedレイアウトのパラメータ
 * @property egoLayoutParams - EGO Layoutのパラメータ
 * @property snapshots - タイムラインスナップショット一覧（v12以降、省略時は空配列として扱う）
 * @property schemaVersion - 関係スキーマのバージョン（undefined は v8 以前）
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 * @property updatedAt - 最終更新日時（ISO 8601形式の文字列）
 */
export type Chart = {
  id: string;
  name: string;
  persons: Person[];
  relationships: Relationship[];
  /** エピソードノード一覧（v13以降、省略時は空配列として扱う） */
  episodes?: Episode[];
  /** エピソード参加エッジ一覧（v13以降、省略時は空配列として扱う） */
  episodeParticipations?: EpisodeParticipation[];
  forceEnabled: boolean;
  forceParams: ForceParams;
  egoLayoutParams: EgoLayoutParams;
  /** タイムラインスナップショット一覧（v12以降、省略時は空配列として扱う） */
  snapshots?: Snapshot[];
  /** 関係スキーマのバージョン（undefined は v8 以前として扱う） */
  schemaVersion?: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * 相関図のメタデータ（一覧表示用）
 * @property id - 一意な識別子
 * @property name - 相関図の名前
 * @property personCount - この相関図に含まれる人物の数
 * @property relationshipCount - この相関図に含まれる関係の数
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 * @property updatedAt - 最終更新日時（ISO 8601形式の文字列）
 */
export type ChartMeta = {
  id: string;
  name: string;
  personCount: number;
  relationshipCount: number;
  createdAt: string;
  updatedAt: string;
};
