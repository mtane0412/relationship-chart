/**
 * PersonRegistrationModalコンポーネント
 * キャンバスにD&D/ペーストされた画像から人物を登録するためのモーダル
 * クロップUIを組み込み、クロップ後に名前入力へ遷移する
 */

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import ImageCropper from '@/components/ui/ImageCropper';
import { readFileAsDataUrl } from '@/lib/image-utils';
import type { NodeKind } from '@/types/person';

/**
 * PersonRegistrationModalのProps
 */
type PersonRegistrationModalProps = {
  /** モーダルの表示/非表示 */
  isOpen: boolean;
  /** ドロップ/ペーストされた元画像のData URL（オプショナル） */
  rawImageSrc?: string;
  /** 登録ボタンが押されたときのコールバック */
  onSubmit: (name: string, croppedImageDataUrl: string | null, kind: NodeKind) => void;
  /** キャンセルボタンが押されたときのコールバック */
  onCancel: () => void;
};

/**
 * 人物登録モーダルコンポーネント
 * クロップUIで画像を調整後、名前入力フォームを表示する
 */
export function PersonRegistrationModal({
  isOpen,
  rawImageSrc,
  onSubmit,
  onCancel,
}: PersonRegistrationModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<NodeKind>('person');
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const secondMenuItemRef = useRef<HTMLButtonElement>(null);
  const thirdMenuItemRef = useRef<HTMLButtonElement>(null);

  // モーダルが開かれたときに状態をリセット
  useEffect(() => {
    if (isOpen) {
      setName(''); // 名前をリセット
      setKind('person'); // 種別をリセット
      setCroppedImageDataUrl(null); // クロップ済み画像をリセット
      setShowMenu(false); // メニューを閉じる
      setError(''); // エラーをリセット
      setShowCropper(false); // クロッパーを閉じる
      setRawImageForCrop(null); // クロップ用画像をリセット

      // 初回のrawImageSrcがある場合はクロップUIを表示
      if (rawImageSrc) {
        setRawImageForCrop(rawImageSrc);
        setShowCropper(true);
      }
    }
  }, [isOpen, rawImageSrc]);

  // クロップ完了後に名前入力フィールドにフォーカス
  useEffect(() => {
    if (croppedImageDataUrl && !showCropper) {
      inputRef.current?.focus();
    }
  }, [croppedImageDataUrl, showCropper]);

  // Escapeキーでキャンセル（メニュー表示中は抑止）
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !showCropper && !showMenu) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, showCropper, showMenu]);

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

  // 画像処理共通関数（クロップUIを表示）
  const handleImageFile = async (file: File) => {
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setRawImageForCrop(dataUrl);
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

  // クロップ完了ハンドラ
  const handleCropComplete = useCallback((croppedImage: string) => {
    setCroppedImageDataUrl(croppedImage);
    setShowCropper(false);
    setRawImageForCrop(null);
  }, []);

  // クロップキャンセルハンドラ
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setRawImageForCrop(null);
    // 初回表示でrawImageSrc由来のクロップをキャンセルした場合のみ親モーダルを閉じる
    if (!croppedImageDataUrl && rawImageSrc) {
      onCancel();
    }
  }, [croppedImageDataUrl, onCancel, rawImageSrc]);

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

  // クリップボードから画像を貼り付けるハンドラ
  const handleClipboardPaste = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowMenu(false);
    setError('');

    try {
      // Clipboard APIの対応チェック
      if (!navigator.clipboard?.read) {
        setError('このブラウザではクリップボードからの貼り付けに対応していません');
        return;
      }

      // Clipboard APIで画像を取得
      const clipboardItems = await navigator.clipboard.read();

      // 画像アイテムを検索
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));

        if (imageType) {
          const blob = await item.getType(imageType);
          // BlobをFileに変換
          const file = new File([blob], 'clipboard.png', { type: blob.type });
          await handleImageFile(file);
          return;
        }
      }

      // 画像が見つからなかった場合
      setError('クリップボードに画像がありません');
    } catch (err) {
      // エラーハンドリング
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('クリップボードへのアクセスが許可されていません');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'クリップボードからの貼り付けに失敗しました';
        setError(errorMessage);
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('クリップボードエラー:', err);
      }
    }
  };

  // メニューアイテムのキーボードナビゲーションハンドラ
  const handleMenuItemKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, menuIndex: number) => {
    // メニューの表示状態に応じてref配列を動的に構築
    const menuRefs = [firstMenuItemRef, secondMenuItemRef];
    if (croppedImageDataUrl) {
      menuRefs.push(thirdMenuItemRef);
    }

    const menuCount = menuRefs.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (menuIndex + 1) % menuCount;
      menuRefs[nextIndex].current?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (menuIndex - 1 + menuCount) % menuCount;
      menuRefs[prevIndex].current?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      firstMenuItemRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      menuRefs[menuCount - 1].current?.focus();
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

  // 画像削除ハンドラ
  const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setCroppedImageDataUrl(null);
    setShowMenu(false);
  };

  // フォーム送信ハンドラ
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), croppedImageDataUrl, kind);
    }
  };

  if (!isOpen) return null;

  // クロップ中の場合はImageCropperを表示
  if (showCropper && rawImageForCrop) {
    return (
      <ImageCropper
        imageSrc={rawImageForCrop}
        cropShape={kind === 'item' ? 'rect' : 'round'}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    );
  }

  // クロップ後は名前入力フォームを表示
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          ノードを登録
        </h2>

        {/* 種別選択トグル */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">種別</label>
          <div role="radiogroup" className="flex gap-2">
            <label className="flex-1">
              <input
                type="radio"
                name="kind"
                value="person"
                checked={kind === 'person'}
                onChange={() => setKind('person')}
                className="sr-only"
              />
              <div
                className={`px-4 py-2 text-center rounded-md border-2 cursor-pointer transition-all ${
                  kind === 'person'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                人物
              </div>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="kind"
                value="item"
                checked={kind === 'item'}
                onChange={() => setKind('item')}
                className="sr-only"
              />
              <div
                className={`px-4 py-2 text-center rounded-md border-2 cursor-pointer transition-all ${
                  kind === 'item'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                物
              </div>
            </label>
          </div>
        </div>

        {/* 画像編集 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">画像</label>
          <div className="relative">
            {/* アイコン領域（クリックメニュー） */}
            <div
              role="button"
              tabIndex={0}
              aria-label="画像を変更"
              onClick={handleIconClick}
              onKeyDown={handleIconKeyDown}
              className={`
                w-32 h-32 mx-auto cursor-pointer
                transition-all duration-200
                ${kind === 'item' ? 'rounded-xl' : 'rounded-full'}
                border-4 border-gray-200 hover:border-gray-300
                shadow-md
              `}
            >
              {croppedImageDataUrl ? (
                <img
                  src={croppedImageDataUrl}
                  alt={name || 'プレビュー'}
                  className={`w-full h-full object-cover ${kind === 'item' ? 'rounded-xl' : 'rounded-full'}`}
                />
              ) : (
                <div className={`w-full h-full bg-gray-400 flex items-center justify-center ${kind === 'item' ? 'rounded-xl' : 'rounded-full'}`}>
                  <span className="text-white text-4xl font-bold">
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
              )}
            </div>

            {/* メニュー */}
            {showMenu && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-[200px]"
              >
                <button
                  ref={firstMenuItemRef}
                  role="menuitem"
                  onClick={handleUploadClick}
                  onKeyDown={(e) => handleMenuItemKeyDown(e, 0)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                >
                  画像をアップロード
                </button>
                <button
                  ref={secondMenuItemRef}
                  role="menuitem"
                  onClick={handleClipboardPaste}
                  onKeyDown={(e) => handleMenuItemKeyDown(e, 1)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 border-t border-gray-200"
                >
                  クリップボードから貼り付け
                </button>
                {croppedImageDataUrl && (
                  <button
                    ref={thirdMenuItemRef}
                    role="menuitem"
                    onClick={handleRemoveImage}
                    onKeyDown={(e) => handleMenuItemKeyDown(e, 2)}
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
            {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
          </div>
        </div>

        {/* 名前入力フォーム */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="person-name" className="block text-sm font-medium text-gray-700 mb-2">
              名前
            </label>
            <input
              id="person-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="名前を入力してください"
              required
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim()}
            >
              登録
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
