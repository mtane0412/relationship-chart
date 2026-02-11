/**
 * 作者のリンクを表示するコンポーネント
 * サイドパネルのヘッダー内にアイコンのみを表示する
 */
import { Github } from 'lucide-react';

/**
 * 作者のリンクを表示するコンポーネント（アイコンのみ）
 */
export function AuthorAttribution() {
  return (
    <div className="flex items-center gap-2">
      {/* Xリンク */}
      <a
        href="https://x.com/mtane0412"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="X (@mtane0412)"
      >
        {/* Xアイコン（インラインSVG） */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>

      {/* GitHubリンク */}
      <a
        href="https://github.com/mtane0412/relationship-chart"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="GitHub Repository"
      >
        <Github size={16} />
      </a>
    </div>
  );
}
