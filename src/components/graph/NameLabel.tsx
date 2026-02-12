/**
 * NameLabelコンポーネント
 * PersonNode/ItemNodeで共有する名前ラベル
 *
 * absolute配置でReact Flowのmeasured.widthから除外され、
 * 画像の下に水平中央配置されます。
 */

import { IMAGE_SIZE, NAME_LABEL_GAP } from './node-constants';

interface NameLabelProps {
  /** 表示する名前 */
  name: string;
  /** 選択状態かどうか */
  selected?: boolean;
  /** マウスエンターハンドラー */
  onMouseEnter: () => void;
  /** マウスリーブハンドラー */
  onMouseLeave: () => void;
}

/**
 * 名前ラベルコンポーネント
 * @param props - NameLabelProps
 */
export const NameLabel = ({ name, selected, onMouseEnter, onMouseLeave }: NameLabelProps) => (
  <div
    data-testid="name-label"
    className={`absolute px-3 py-1 bg-white rounded-full shadow-lg transition-colors duration-200 border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    }`}
    style={{
      top: `${IMAGE_SIZE + NAME_LABEL_GAP}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
    }}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{name}</div>
  </div>
);
