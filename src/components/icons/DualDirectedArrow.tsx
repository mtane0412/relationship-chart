/**
 * DualDirectedArrowアイコン
 * 片方向×2（dual-directed）用のカスタムアイコン
 * 上の矢印が右向き、下の矢印が左向き
 */

interface DualDirectedArrowProps {
  className?: string;
}

export function DualDirectedArrow({ className }: DualDirectedArrowProps) {
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
      {/* 上の線（右向き） */}
      <path d="M5 9h14" />
      {/* 上の矢印頭（右向き） */}
      <path d="M13 3l6 6-6 6" />
      {/* 下の線（左向き） */}
      <path d="M19 15h-14" />
      {/* 下の矢印頭（左向き） */}
      <path d="M11 21l-6-6 6-6" />
    </svg>
  );
}
