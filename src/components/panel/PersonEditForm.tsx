/**
 * PersonEditFormコンポーネント
 * 選択された人物の編集フォーム
 */

import { useState, useRef, useCallback, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';
import { readFileAsDataUrl } from '@/lib/image-utils';
import ImageCropper from '@/components/ui/ImageCropper';
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

  const [name, setName] = useState(person.name);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(person.imageDataUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const secondMenuItemRef = useRef<HTMLButtonElement>(null);

  // 名前変更ハンドラ（ローカルstateのみ更新）
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
  };

  // 名前入力でEnterキー押下時のハンドラ
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enterキーが押された場合のみ処理
    if (e.key === 'Enter') {
      // 変換中（isComposing）のEnterは無視
      // ネイティブイベントのisComposingをチェック
      const nativeEvent = e.nativeEvent as KeyboardEvent;
      if (nativeEvent.isComposing) {
        return;
      }

      const trimmedName = name.trim();
      // trim後に空でなければストアを更新
      if (trimmedName) {
        updatePerson(person.id, {
          name: trimmedName,
          imageDataUrl,
        });
      }
    }
  };

  // 画像処理共通関数（クロップUIを表示）
  const handleImageFile = async (file: File) => {
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setRawImageSrc(dataUrl);
      setShowCropper(true);
      setShowMenu(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '画像処理に失敗しました';
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('画像処理に失敗しました:', err);
      }
    }
  };

  // クロップ完了ハンドラ（即時反映）
  const handleCropComplete = useCallback((croppedImage: string) => {
    setImageDataUrl(croppedImage);
    setShowCropper(false);
    setRawImageSrc(null);

    // 即座にストアを更新
    updatePerson(person.id, {
      name: name.trim() || person.name, // 空の場合は元の名前を使用
      imageDataUrl: croppedImage,
    });
  }, [person.id, person.name, name, updatePerson]);

  // クロップキャンセルハンドラ
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setRawImageSrc(null);
  }, []);

  // ドラッグオーバーハンドラ
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  // ドラッグリーブハンドラ
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // ドロップハンドラ
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((file) => file.type.startsWith('image/'));

    if (imageFile) {
      handleImageFile(imageFile);
    } else if (files.length > 0) {
      // 非画像ファイルがドロップされた場合
      setError('画像ファイルのみアップロード可能です');
    }
  };

  // アイコンクリックハンドラ
  const handleIconClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // アイコンキーダウンハンドラ（Enter/Spaceキー対応）
  const handleIconKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setShowMenu(!showMenu);
    }
  };

  // メニューアイテムのキーボードナビゲーションハンドラ
  const handleMenuItemKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, isFirst: boolean) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isFirst && secondMenuItemRef.current) {
        secondMenuItemRef.current.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isFirst && firstMenuItemRef.current) {
        firstMenuItemRef.current.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      firstMenuItemRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      if (secondMenuItemRef.current) {
        secondMenuItemRef.current.focus();
      } else {
        firstMenuItemRef.current?.focus();
      }
    }
  };

  // ファイル選択ハンドラ
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImageFile(file);
      }
    }
    // 同じファイルを再度選択できるようにinput valueをクリア
    e.target.value = '';
  };

  // アップロードボタンクリックハンドラ
  const handleUploadClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fileInputRef.current?.click();
    setShowMenu(false);
  };

  // 画像削除ハンドラ（即時反映）
  const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setImageDataUrl(undefined);
    setShowMenu(false);

    // 即座にストアを更新
    updatePerson(person.id, {
      name: name.trim() || person.name, // 空の場合は元の名前を使用
      imageDataUrl: undefined,
    });
  };

  // メニューの外側をクリックした時にメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMenu &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Escキーでメニューを閉じる
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showMenu]);

  // メニューが開いた時に最初のメニューアイテムにフォーカスを移動
  useEffect(() => {
    if (showMenu && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [showMenu]);

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
          onChange={handleNameChange}
          onKeyDown={handleNameKeyDown}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="名前を入力"
        />
      </div>

      {/* 画像編集 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">画像</label>
        <div className="relative">
          {/* アイコン領域（D&D対応 + クリックメニュー） */}
          <div
            data-testid="person-icon-area"
            role="button"
            tabIndex={0}
            aria-label="画像を変更"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleIconClick}
            onKeyDown={handleIconKeyDown}
            className={`
              w-32 h-32 rounded-full mx-auto cursor-pointer
              transition-all duration-200
              ${
                isDragging
                  ? 'ring-4 ring-blue-500 ring-offset-2'
                  : 'border-4 border-gray-200 hover:border-gray-300'
              }
              shadow-md
            `}
          >
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt={name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-400 flex items-center justify-center">
                <span className="text-white text-4xl font-bold">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* メニュー */}
          {showMenu && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-[160px]"
            >
              <button
                ref={firstMenuItemRef}
                role="menuitem"
                onClick={handleUploadClick}
                onKeyDown={(e) => handleMenuItemKeyDown(e, true)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
              >
                画像をアップロード
              </button>
              {imageDataUrl && (
                <button
                  ref={secondMenuItemRef}
                  role="menuitem"
                  onClick={handleRemoveImage}
                  onKeyDown={(e) => handleMenuItemKeyDown(e, false)}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50 border-t border-gray-200"
                >
                  画像を削除
                </button>
              )}
            </div>
          )}

          {/* 非表示のファイル入力 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* エラーメッセージ */}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </div>

      {/* ImageCropperモーダル */}
      {showCropper && rawImageSrc && (
        <ImageCropper
          imageSrc={rawImageSrc}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
