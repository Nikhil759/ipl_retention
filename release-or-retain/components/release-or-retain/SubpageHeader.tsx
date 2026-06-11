import { faChevronLeft, faHouse } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { ReactNode } from "react";
import "@/lib/fontawesome";

export const subpageBackClassName =
  "inline-flex items-center gap-1.5 py-2 -ml-0.5 text-sm font-medium text-gray-400 hover:text-white transition-colors touch-manipulation";

const allTeamsBackClassName =
  "inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] pl-2 pr-2.5 py-1.5 text-sm font-medium text-gray-300 hover:bg-white/[0.08] hover:text-white hover:border-white/15 transition-colors touch-manipulation";

function AllTeamsBackContent() {
  return (
    <>
      <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      All teams
      <FontAwesomeIcon icon={faHouse} className="h-2.5 w-2.5 shrink-0 opacity-50 ml-0.5" aria-hidden />
    </>
  );
}

export function BackToTeamsLink({ href = "/release-or-retain" }: { href?: string }) {
  return (
    <Link href={href} className={allTeamsBackClassName}>
      <AllTeamsBackContent />
    </Link>
  );
}

export function BackToTeamsButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={allTeamsBackClassName}>
      <AllTeamsBackContent />
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
    <header className="w-full self-stretch border-b border-amber-500/20 mb-4 md:mb-6 pt-[max(0.75rem,env(safe-area-inset-top))] bg-white/[0.02]">
      {back && (
        <div className="w-full px-4 sm:px-6 pb-3 md:pb-4 flex justify-start">
          {back}
        </div>
      )}

      <div
        className={`max-w-xs md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 sm:px-6 pb-4 md:pb-5${
          back ? "" : " pt-3 md:pt-4"
        }`}
      >
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="text-[11px] md:text-xs text-gray-400 uppercase tracking-widest mt-1.5">
            {subtitle}
          </p>
          {badge && <div className="mt-2.5 flex justify-center">{badge}</div>}
          {accent && (
            <p
              className="text-sm md:text-base mt-2 font-medium"
              style={{ color: "#FFA500" }}
            >
              {accent}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
