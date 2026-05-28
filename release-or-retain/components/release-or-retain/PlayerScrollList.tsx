import { ReactNode } from "react";

/** Shared soft card styling for results + fan vote player rows. */
export const PLAYER_LIST_ROW_CLASS = "player-list-row";

const SCROLL_LIST_BASE =
  "player-scroll-list grid grid-cols-1 lg:grid-cols-2 gap-2.5 md:gap-3 py-1 pr-1";

interface PlayerScrollListProps {
  children: ReactNode;
  maxHeightClass: string;
}

export default function PlayerScrollList({
  children,
  maxHeightClass,
}: PlayerScrollListProps) {
  return (
    <div className={`${SCROLL_LIST_BASE} ${maxHeightClass}`}>{children}</div>
  );
}
