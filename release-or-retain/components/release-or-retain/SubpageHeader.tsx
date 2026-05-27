import Link from "next/link";
import { ReactNode } from "react";

const backButtonClassName =
  "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-xs md:text-sm font-medium text-gray-200 hover:bg-white/15 hover:text-white hover:border-white/30 transition-colors touch-manipulation w-fit";

export function BackToTeamsLink({ href = "/release-or-retain" }: { href?: string }) {
  return (
    <Link href={href} className={backButtonClassName}>
      <span aria-hidden className="text-gray-400">←</span>
      All teams
    </Link>
  );
}

export function BackToTeamsButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={backButtonClassName}>
      <span aria-hidden className="text-gray-400">←</span>
      All teams
    </button>
  );
}

interface SubpageHeaderProps {
  title: string;
  subtitle: string;
  accent?: string;
  back?: ReactNode;
}

export function SubpageHeader({ title, subtitle, accent, back }: SubpageHeaderProps) {
  return (
    <header className="w-full py-4 md:py-5 px-4 sm:px-6 border-b border-amber-500/20 mb-4 md:mb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4 max-w-xs md:max-w-3xl lg:max-w-4xl mx-auto w-full">
        <div className="md:justify-self-start">{back}</div>
        <div className="text-center md:col-start-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">{title}</h1>
          <p className="text-xs text-gray-400 tracking-widest mt-0.5">{subtitle}</p>
          {accent && (
            <p className="text-xs mt-1" style={{ color: "#FFA500" }}>
              {accent}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
