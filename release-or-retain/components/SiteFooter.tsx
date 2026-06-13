import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-amber-500/15 bg-white/[0.02] mt-auto">
      <div className="max-w-sm md:max-w-5xl lg:max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-sm font-medium text-white">Release or Retain</p>
            <p className="text-xs text-gray-500 mt-1">
              IPL 2026 · Fan picks for retention &amp; release
            </p>
          </div>

          <Link
            href="/release-or-retain"
            className="text-xs text-gray-400 hover:text-white transition-colors sm:text-right"
          >
            Make your picks
          </Link>
        </div>

        <Link
          href="https://www.encorewav.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-center sm:justify-start gap-2.5 mt-5 pt-4 border-t border-white/5 hover:opacity-90 transition-opacity"
        >
          <Image
            src="/logo_encore_trimmed.png"
            alt=""
            aria-hidden
            width={939}
            height={568}
            sizes="32px"
            quality={100}
            unoptimized
            className="h-7 w-auto object-contain flex-shrink-0 opacity-90"
          />
          <p className="text-xs text-gray-400 leading-tight">
            In association with{" "}
            <span className="text-gray-200 font-medium group-hover:text-[#FFA500] transition-colors">
              Encore Wav
            </span>
            <span className="hidden sm:inline text-gray-500">
              {" · "}music, lifestyle &amp; merch
            </span>
          </p>
          <span aria-hidden className="text-[10px] text-gray-500 group-hover:text-[#FFA500]/80 transition-colors">
            ↗
          </span>
        </Link>

        <p className="text-[11px] text-gray-600 text-center sm:text-left mt-4">
          © {year} Release or Retain. Not affiliated with the BCCI or IPL.
        </p>
      </div>
    </footer>
  );
}
