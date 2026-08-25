import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const IPlay = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M7 4.5a1 1 0 0 1 1.53-.85l12 7.5a1 1 0 0 1 0 1.7l-12 7.5A1 1 0 0 1 7 19.5z" />
  </svg>
);
export const IPause = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1.2" />
    <rect x="14" y="4" width="4" height="16" rx="1.2" />
  </svg>
);
export const IPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const ICheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const IX = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const ISearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
export const IInfo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
export const IChevronR = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
export const IChevronL = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
export const IChevronD = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IArrowL = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
export const IVolume = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
export const IVolumeX = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
);
export const IMaximize = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);
export const IMinimize = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
  </svg>
);
export const IPip = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
export const ICaptions = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M7 12h4M7 15.5h7M14 12h3" />
  </svg>
);
export const IDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 19h16" />
  </svg>
);
export const ITrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);
export const IHome = (p: P) => (
  <svg {...base(p)}>
    <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);
export const ICompass = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15 9-2 5-4 1 2-5z" fill="currentColor" stroke="none" />
  </svg>
);
export const IBookmark = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
export const ISkipF = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M5 5.5a1 1 0 0 1 1.55-.83l9 6a1 1 0 0 1 0 1.66l-9 6A1 1 0 0 1 5 17.5z" />
    <rect x="17" y="5" width="2.5" height="14" rx="1" />
  </svg>
);
export const IRew10 = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8V3M3 8h5M3 8a9 9 0 1 1-1 6" transform="rotate(0)" />
    <text x="8.5" y="16.5" fontSize="7.5" fill="currentColor" stroke="none" fontFamily="inherit">
      10
    </text>
  </svg>
);
export const IFwd10 = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 8V3M21 8h-5M21 8a9 9 0 1 0 1 6" />
    <text x="8.5" y="16.5" fontSize="7.5" fill="currentColor" stroke="none" fontFamily="inherit">
      10
    </text>
  </svg>
);
export const IStar = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z" />
  </svg>
);
export const IFilm = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
  </svg>
);
export const ITv = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="m17 2-5 5-5-5" />
  </svg>
);
export const ICommand = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 9V6a3 3 0 1 0-3 3zm0 0v6m0-6h6m-6 6v3a3 3 0 1 1-3-3zm6-6h3a3 3 0 1 0-3-3zm0 0v6m0 0h3a3 3 0 1 1-3 3z" />
  </svg>
);

/** Jagflix wordmark */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id="jfg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-cyan)" />
            <stop offset="1" stopColor="var(--color-violet)" />
          </linearGradient>
        </defs>
        <path d="M40 6v34a12 12 0 0 1-12 12H18v-9h10a3 3 0 0 0 3-3V6z" fill="url(#jfg)" />
        <path d="M44 24l12 7-12 7z" fill="url(#jfg)" />
      </svg>
      {!compact && (
        <span className="font-display text-xl font-bold tracking-tight">
          <span className="text-ink">Jag</span>
          <span className="text-gradient">flix</span>
        </span>
      )}
    </span>
  );
}
