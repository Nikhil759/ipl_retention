import Image from "next/image";
import Link from "next/link";

export default function EncoreWavAssociation() {
  return (
    <div className="encore-assoc-strip w-full border-b border-amber-500/15 bg-gradient-to-r from-transparent via-amber-500/[0.04] to-transparent pt-[env(safe-area-inset-top)]">
      <div className="max-w-sm md:max-w-5xl lg:max-w-6xl mx-auto px-4 md:px-6">
        <Link
          href="https://www.encorewav.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-center gap-2.5 py-2 md:py-2.5 hover:bg-white/[0.03] transition-colors rounded-sm -mx-1 px-1"
        >
          <Image
            src="/logo_encore_trimmed.png"
            alt=""
            aria-hidden
            width={939}
            height={568}
            sizes="52px"
            quality={100}
            priority
            unoptimized
            className="h-7 md:h-8 w-auto object-contain flex-shrink-0 opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <p className="text-[11px] md:text-xs text-gray-400 leading-tight">
            In association with{" "}
            <span className="text-gray-200 font-medium group-hover:text-[#FFA500] transition-colors">
              Encore Wav
            </span>
            <span className="hidden sm:inline text-gray-500">
              {" · "}music, lifestyle &amp; merch
            </span>
          </p>
          <span
            aria-hidden
            className="text-[10px] text-gray-500 group-hover:text-[#FFA500]/80 transition-colors flex-shrink-0"
          >
            ↗
          </span>
        </Link>
      </div>
    </div>
  );
}
