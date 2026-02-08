/**
 * BidirectionalArrowアイコン
 * 双方向（bidirectional）用のカスタムアイコン
 * 1本の線の両端に矢印
 */

interface BidirectionalArrowProps {
  className?: string;
}

export function BidirectionalArrow({ className }: BidirectionalArrowProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 中央の線 */}
      <path d="M5 12h14" />
      {/* 左の矢印頭 */}
      <path d="M11 6l-6 6 6 6" />
      {/* 右の矢印頭 */}
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
