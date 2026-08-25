import { Component, useEffect, useState, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router";
import { Navbar, MobileTabBar } from "./components/Navbar";
import { Palette } from "./components/Palette";
import { Home } from "./pages/Home";
import { SearchPage } from "./pages/Search";
import { TitlePage } from "./pages/Title";
import { WatchPage } from "./pages/Watch";
import { MyListPage } from "./pages/MyList";
import { DownloadsPage } from "./pages/Downloads";

class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error; comp?: string }> {
  state: { error?: Error; comp?: string } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ comp: info.componentStack ?? undefined });
    const w = window as any;
    w.__jfShowErr?.(
      `RENDER CRASH: ${error.message}\nSTACK: ${(error.stack || "").split("\n").slice(0, 6).join("\n")}\nCOMPONENTS: ${(info.componentStack || "").split("\n").slice(0, 8).join("\n")}`,
    );
  }
  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-[70vh] place-items-center px-6 pt-16">
          <div className="glass max-w-lg rounded-2xl p-8 text-center">
            <div className="font-serif text-2xl text-ink">Something broke</div>
            <p className="mt-2 text-sm break-words text-ink-dim">{this.state.error.message}</p>
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-left text-[10px] leading-relaxed whitespace-pre-wrap text-ink-faint">
              {(this.state.error.stack || "").split("\n").slice(0, 8).join("\n")}
              {"\n"}
              {(this.state.comp || "").split("\n").slice(0, 10).join("\n")}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: undefined, comp: undefined });
                window.location.hash = "#/";
              }}
              className="bg-accent-gradient mt-5 cursor-pointer rounded-xl px-6 py-2.5 font-display text-sm font-semibold text-white"
            >
              Back home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 ml-2 cursor-pointer rounded-xl border border-hairline-strong px-6 py-2.5 font-display text-sm font-semibold text-ink-dim hover:text-ink"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0 }), [pathname]);
  return null;
}

export function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const watching = pathname.startsWith("/watch");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-full">
      <ErrorBoundary>
      <div className="aurora" aria-hidden>
        <i />
      </div>
      <div className="grain" aria-hidden />

      {!watching && <Navbar onOpenSearch={() => setPaletteOpen(true)} />}
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/browse/:kind" element={<SearchPage />} />
        <Route path="/title/:subjectId" element={<TitlePage />} />
        <Route path="/watch/:subjectId" element={<WatchPage />} />
        <Route path="/my-list" element={<MyListPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="*" element={<Home />} />
      </Routes>

      {!watching && <MobileTabBar />}
      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </ErrorBoundary>
    </div>
  );
}
