/**
 * 相関図（Chart）の型定義
 * 複数の相関図を管理するためのデータモデル
 */

import type { Person } from './person';
import type { Relationship } from './relationship';
import type { ForceParams } from '@/stores/useGraphStore';
import type { EgoLayoutParams } from '@/lib/ego-layout';

/**
 * 相関図の完全なデータを表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property name - 相関図の名前（最大50文字）
 * @property persons - この相関図に含まれる人物のリスト
 * @property relationships - この相関図に含まれる関係のリスト
 * @property forceEnabled - force-directedレイアウトが有効かどうか
 * @property forceParams - force-directedレイアウトのパラメータ
 * @property egoLayoutParams - EGO Layoutのパラメータ
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 * @property updatedAt - 最終更新日時（ISO 8601形式の文字列）
 */
export type Chart = {
  id: string;
  name: string;
  persons: Person[];
  relationships: Relationship[];
  forceEnabled: boolean;
  forceParams: ForceParams;
  egoLayoutParams: EgoLayoutParams;
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
