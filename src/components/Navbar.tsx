import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router";
import { Logo, IBookmark, ICompass, IDownload, IHome, ISearch } from "./Icons";
import { cn } from "../lib/cn";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/browse/MOVIE", label: "Movies" },
  { to: "/browse/TV_SERIES", label: "Series" },
  { to: "/browse/trending", label: "New & Popular" },
  { to: "/my-list", label: "My List" },
];

export function Navbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 transition-all duration-500",
        scrolled ? "glass-strong shadow-card" : "bg-gradient-to-b from-canvas-deep/90 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-8">
        <Link to="/" className="ring-focus rounded-lg" aria-label="Jagflix home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "ring-focus relative rounded-lg px-3 py-2 font-display text-[13px] font-medium tracking-wide transition-colors",
                  isActive ? "text-ink" : "text-ink-dim hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  <span
                    className={cn(
                      "absolute inset-x-3 -bottom-[3px] h-[2px] rounded-full bg-accent-gradient transition-opacity",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="ring-focus group flex cursor-pointer items-center gap-3 rounded-full border border-hairline bg-canvas-raise/40 px-3 py-2 text-ink-dim transition-colors hover:border-hairline-strong hover:text-ink"
            aria-label="Search"
          >
            <ISearch width={17} height={17} />
            <span className="hidden items-center gap-1 lg:flex">
              <span className="kbd">⌘</span>
              <span className="kbd">K</span>
            </span>
          </button>
          <Link
            to="/downloads"
            aria-label="Downloads"
            className="ring-focus hidden size-10 place-items-center rounded-full text-ink-dim transition-colors hover:text-ink md:grid"
          >
            <IDownload width={18} height={18} />
          </Link>
          <span
            className="grid size-9 place-items-center rounded-full bg-accent-gradient font-display text-sm font-bold text-white shadow-(--shadow-neon)"
            title="Guest"
          >
            J
          </span>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------ Mobile tab bar ------------------------------ */

const tabs = [
  { to: "/", label: "Home", icon: IHome, end: true },
  { to: "/browse/trending", label: "Explore", icon: ICompass },
  { to: "/my-list", label: "My List", icon: IBookmark },
  { to: "/downloads", label: "Downloads", icon: IDownload },
];

export function MobileTabBar() {
  return (
    <nav className="glass-strong fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl px-2 py-2 md:hidden">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              "ring-focus flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 font-display text-[10px] font-medium tracking-wide transition-colors",
              isActive ? "text-cyan" : "text-ink-faint hover:text-ink-dim",
            )
          }
        >
          <t.icon width={19} height={19} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
