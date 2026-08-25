import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router";
import { Navbar, MobileTabBar } from "./components/Navbar";
import { Palette } from "./components/Palette";
import { Home } from "./pages/Home";
import { SearchPage } from "./pages/Search";
import { TitlePage } from "./pages/Title";
import { WatchPage } from "./pages/Watch";
import { MyListPage } from "./pages/MyList";
import { DownloadsPage } from "./pages/Downloads";

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
    </div>
  );
}
