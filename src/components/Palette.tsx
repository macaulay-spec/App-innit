import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { getPopularSearches, getSuggestions } from "../lib/api";
import { IFilm, ISearch, ITv } from "./Icons";
import { cn } from "../lib/cn";

export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const suggestions = useQuery({
    queryKey: ["suggestions", q],
    queryFn: () => getSuggestions(q),
    enabled: open && q.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const popular = useQuery({
    queryKey: ["popular"],
    queryFn: getPopularSearches,
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const entries = useMemo(() => {
    if (q.trim()) {
      return (suggestions.data ?? []).map((s) => ({
        word: s.word,
        kind: s.type === 2 ? "series" : s.type === 1 ? "movie" : "search",
      }));
    }
    return (popular.data ?? []).map((w) => ({ word: w, kind: "search" as const }));
  }, [q, suggestions.data, popular.data]);

  useEffect(() => setActive(0), [entries.length, q]);

  const go = (word: string) => {
    onClose();
    navigate(`/search?q=${encodeURIComponent(word)}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      const word = entries[active]?.word ?? q.trim();
      if (word) go(word);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 grid place-items-start justify-center bg-canvas-deep/70 p-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass-strong w-full max-w-2xl overflow-hidden rounded-2xl shadow-card"
            style={{ borderColor: "color-mix(in oklch, var(--color-cyan) 25%, var(--color-hairline))" }}
          >
            <div className="flex items-center gap-4 border-b border-hairline px-5 py-4">
              <ISearch width={22} height={22} className="text-cyan" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search movies, series, actors…"
                className="w-full bg-transparent font-display text-lg text-ink outline-none placeholder:text-ink-faint"
              />
              <span className="kbd hidden sm:block">esc</span>
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-4">
              <div className="mb-3 font-display text-[11px] font-semibold tracking-[0.22em] text-cyan uppercase">
                {q.trim() ? "Suggestions" : "Popular right now"}
              </div>
              {entries.length === 0 ? (
                <div className="px-1 py-6 text-center text-sm text-ink-faint">
                  {q.trim() ? "No suggestions — press Enter to search." : "Loading…"}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {entries.map((e, i) => (
                    <button
                      key={e.word}
                      onClick={() => go(e.word)}
                      onMouseEnter={() => setActive(i)}
                      className={cn(
                        "ring-focus flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 font-display text-sm transition-all",
                        i === active
                          ? "border-cyan/60 bg-cyan/10 text-ink shadow-(--shadow-neon)"
                          : "border-hairline bg-canvas-raise/40 text-ink-dim hover:text-ink",
                      )}
                    >
                      {e.kind === "series" ? (
                        <ITv width={16} height={16} className="text-violet-soft" />
                      ) : (
                        <IFilm width={16} height={16} className="text-cyan" />
                      )}
                      {e.word}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-hairline px-5 py-3 text-xs text-ink-faint">
              <span className="flex items-center gap-1.5">
                <span className="kbd">⌘</span>
                <span className="kbd">K</span> Open search
              </span>
              <span className="flex items-center gap-1.5">
                <span className="kbd">esc</span> Close
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="kbd">↑↓</span> Navigate
                <span className="kbd">↵</span> Go
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
