/**
 * PersonEditFormコンポーネント
 * 選択された人物の編集フォーム
 */

import { useState } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';
import { ImageDropZone } from '@/components/dnd/ImageDropZone';
import { processImage } from '@/lib/image-utils';
import type { Person } from '@/types/person';

/**
 * PersonEditFormのProps
 */
type PersonEditFormProps = {
  /** 編集対象の人物 */
  person: Person;
  /** フォームを閉じるコールバック */
  onClose: () => void;
};

/**
 * 人物編集フォームコンポーネント
 * 選択中の人物の名前・画像を編集する
 */
export function PersonEditForm({ person, onClose }: PersonEditFormProps) {
  const updatePerson = useGraphStore((state) => state.updatePerson);
  const removePerson = useGraphStore((state) => state.removePerson);

  const [name, setName] = useState(person.name);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(person.imageDataUrl);

  // 保存ハンドラ
  const handleSave = () => {
    if (!name.trim()) return;

    updatePerson(person.id, {
      name: name.trim(),
      imageDataUrl,
    });

    onClose();
  };

  // 画像選択ハンドラ
  const handleImageDrop = async (file: File) => {
    try {
      const dataUrl = await processImage(file);
      setImageDataUrl(dataUrl);
    } catch (error) {
      console.error('画像処理に失敗しました:', error);
    }
  };

  // 画像削除ハンドラ
  const handleRemoveImage = () => {
    setImageDataUrl(undefined);
  };

  // 人物削除ハンドラ
  const handleDeletePerson = () => {
    if (confirm(`「${person.name}」を削除してもよろしいですか？`)) {
      removePerson(person.id);
      onClose();
    }
  };

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">人物を編集</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* 名前入力 */}
      <div className="mb-4">
        <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
          名前
        </label>
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="名前を入力"
        />
      </div>

      {/* 画像編集 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">画像</label>
        {imageDataUrl ? (
          <div className="space-y-2">
            <img
              src={imageDataUrl}
              alt={name}
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-md mx-auto"
            />
            <div className="flex gap-2">
              <ImageDropZone onDrop={handleImageDrop} />
              <button
                onClick={handleRemoveImage}
                className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                画像を削除
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-32 h-32 rounded-full bg-gray-400 border-4 border-gray-200 shadow-md mx-auto flex items-center justify-center">
              <span className="text-white text-4xl font-bold">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <ImageDropZone onDrop={handleImageDrop} />
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="space-y-2">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          保存
        </button>
        <button
          onClick={handleDeletePerson}
          className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          この人物を削除
        </button>
      </div>
    </div>
  );
}
