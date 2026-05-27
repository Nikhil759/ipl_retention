import Link from "next/link";
import { ReactNode } from "react";

const backLinkClassName =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/25 transition-colors touch-manipulation";

export function BackToTeamsLink({ href = "/release-or-retain" }: { href?: string }) {
  return (
    <Link href={href} className={backLinkClassName}>
      <span aria-hidden>←</span>
      All teams
    </Link>
  );
}

export function BackToTeamsButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={backLinkClassName}>
      <span aria-hidden>←</span>
      All teams
    </button>
  );
}

interface SubpageHeaderProps {
  title: string;
  subtitle: string;
  accent?: string;
  back?: ReactNode;
  badge?: ReactNode;
}

export function SubpageHeader({ title, subtitle, accent, back, badge }: SubpageHeaderProps) {
  return (
    <header className="w-full border-b border-amber-500/20 mb-4 md:mb-6 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="relative max-w-xs md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 sm:px-6 pb-3 md:pb-4 pt-2 md:pt-3">
        {back && (
          <div className="absolute top-2 md:top-3 left-0 z-10">
            {back}
          </div>
        )}
        <div className={`text-center ${back ? "pt-9 md:pt-10" : ""}`}>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="text-[11px] md:text-xs text-gray-400 tracking-widest mt-1">
            {subtitle}
          </p>
          {badge && <div className="mt-2 flex justify-center">{badge}</div>}
          {accent && (
            <p className="text-xs md:text-sm mt-1.5 font-medium" style={{ color: "#FFA500" }}>
              {accent}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
