/**
 * ノードの視覚属性導出ユーティリティ
 * labels 配列からノードの描画スタイル・アイコン・UI表示用ラベルを導出する
 */

/**
 * ノードの視覚属性
 * @property shape - 描画形状。'circle' = 円形（人物）、'rounded-rect' = 角丸四角形（物）
 * @property defaultIcon - 画像がない場合のデフォルトアイコン種別
 * @property kindLabel - UI表示用のノード種別ラベル（例: '人物', '物'）
 * @property cropShape - 画像クロッパーの形状
 */
export type NodeVisual = {
  shape: 'circle' | 'rounded-rect';
  defaultIcon: 'user' | 'package';
  kindLabel: string;
  cropShape: 'round' | 'rect';
};

/**
 * labels 配列からノードの視覚属性を導出する
 * '物' ラベルを含む場合は物ノード風、それ以外は人物ノード風の属性を返す
 *
 * @param labels - ノードに付与されたラベル配列
 * @returns ノードの視覚属性
 */
export function deriveNodeVisual(labels: string[]): NodeVisual {
  if (labels.includes('物')) {
    return {
      shape: 'rounded-rect',
      defaultIcon: 'package',
      kindLabel: '物',
      cropShape: 'rect',
    };
  }
  return {
    shape: 'circle',
    defaultIcon: 'user',
    kindLabel: '人物',
    cropShape: 'round',
  };
}
