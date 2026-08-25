import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Caption, PlaybackSource } from "../lib/types";
import { formatClock } from "../lib/format";
import { cn } from "../lib/cn";
import {
  IArrowL,
  ICaptions,
  IChevronD,
  ICheck,
  IFwd10,
  IMaximize,
  IMinimize,
  IPause,
  IPip,
  IPlay,
  IRew10,
  ISkipF,
  IVolume,
  IVolumeX,
} from "../components/Icons";

interface Cue {
  start: number;
  end: number;
  text: string;
}

function parseSrt(raw: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = raw.replace(/\r/g, "").split(/\n\n+/);
  const toSec = (t: string) => {
    const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) return 0;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
  };
  for (const b of blocks) {
    const lines = b.split("\n").filter(Boolean);
    const ti = lines.findIndex((l) => l.includes("-->"));
    if (ti === -1) continue;
    const [a, c] = lines[ti].split("-->");
    cues.push({ start: toSec(a), end: toSec(c), text: lines.slice(ti + 1).join("\n") });
  }
  return cues;
}

export interface PlayerProps {
  sources: PlaybackSource[];
  captions: Caption[];
  title: string;
  episodeLabel?: string;
  resumeAt?: number;
  onProgress?: (t: number, duration: number) => void;
  onEnded?: () => void;
  onNext?: () => void;
  onBack: () => void;
}

export function Player({
  sources,
  captions,
  title,
  episodeLabel,
  resumeAt,
  onProgress,
  onEnded,
  onNext,
  onBack,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [controls, setControls] = useState(true);
  const [menu, setMenu] = useState<null | "quality" | "cc">(null);
  const [ccOn, setCcOn] = useState(false);
  const [ccLang, setCcLang] = useState<string>(captions[0]?.lang ?? "");
  const [cue, setCue] = useState("");
  const [toast, setToast] = useState("");
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [fs, setFs] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const hideTimer = useRef<number>(0);
  const pendingSeek = useRef<number | null>(null);
  const pendingPlay = useRef(false);
  const consumedResume = useRef(false);
  const stallTimer = useRef<number>(0);
  const lastTap = useRef<{ t: number; x: number }>({ t: 0, x: 0 });
  const lastSave = useRef(0);
  const cueCache = useRef<Map<string, Cue[]>>(new Map());

  const source = sources[idx];

  /* ------------------------------ controls hide ------------------------------ */
  const poke = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) {
        setControls(false);
        setMenu(null);
      }
    }, 2800);
  }, []);
  useEffect(() => {
    poke();
    return () => window.clearTimeout(hideTimer.current);
  }, [poke, playing]);

  /* --------------------------------- toast ---------------------------------- */
  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  /* --------------------------- quality ladder on failure --------------------------- */
  const stepDown = useCallback(
    (reason: string) => {
      setIdx((cur) => {
        const next = sources.findIndex((s, i) => i > cur);
        if (next === -1) {
          setFailed(true);
          return cur;
        }
        const v = videoRef.current;
        if (v) {
          pendingSeek.current = v.currentTime;
          pendingPlay.current = !v.paused;
        }
        flash(`${reason} — switching to ${sources[next].resolution}p`);
        return next;
      });
    },
    [sources, flash],
  );

  /* ------------------------------ video element wiring ------------------------------ */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted, idx]);

  const onLoadedMeta = () => {
    const v = videoRef.current!;
    setDuration(v.duration || 0);
    setFailed(false);
    if (pendingSeek.current != null) {
      v.currentTime = pendingSeek.current;
      pendingSeek.current = null;
      if (pendingPlay.current) v.play().catch(() => undefined);
    } else if (!consumedResume.current && resumeAt && resumeAt > 8 && resumeAt < (v.duration || 0) * 0.95) {
      consumedResume.current = true;
      v.currentTime = resumeAt;
      flash(`Resumed from ${formatClock(resumeAt)}`);
    }
    consumedResume.current = true;
  };

  const onTime = () => {
    const v = videoRef.current!;
    setCurrent(v.currentTime);
    if (v.duration) {
      try {
        const b = v.buffered;
        for (let i = 0; i < b.length; i++) {
          if (b.start(i) <= v.currentTime && v.currentTime <= b.end(i)) {
            setBuffered(b.end(i));
            break;
          }
        }
      } catch {
        /* noop */
      }
    }
    const now = Date.now();
    if (onProgress && now - lastSave.current > 5000) {
      lastSave.current = now;
      onProgress(v.currentTime, v.duration || 0);
    }
  };

  /* stall watchdog */
  const onWaiting = () => {
    window.clearTimeout(stallTimer.current);
    stallTimer.current = window.setTimeout(() => stepDown("Stream stalled"), 8000);
  };
  const onPlaying = () => {
    window.clearTimeout(stallTimer.current);
    setPlaying(true);
    poke();
  };

  /* ------------------------------- captions fetch ------------------------------- */
  const activeCaption = captions.find((c) => c.lang === ccLang) ?? captions[0];
  useEffect(() => {
    setCue("");
    if (!ccOn || !activeCaption) return;
    let dead = false;
    const cached = cueCache.current.get(activeCaption.lang);
    if (cached) return;
    fetch(activeCaption.url)
      .then((r) => (r.ok ? r.text() : ""))
      .then((txt) => {
        if (dead || !txt) return;
        cueCache.current.set(activeCaption.lang, parseSrt(txt));
      })
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [ccOn, activeCaption?.lang, activeCaption?.url]);

  useEffect(() => {
    if (!ccOn || !activeCaption) {
      setCue("");
      return;
    }
    const cues = cueCache.current.get(activeCaption.lang) ?? [];
    const c = cues.find((c) => current >= c.start && current <= c.end);
    setCue(c?.text ?? "");
  }, [current, ccOn, activeCaption]);

  /* --------------------------------- shortcuts --------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          v.paused ? v.play().catch(() => undefined) : v.pause();
          break;
        case "ArrowLeft":
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case "ArrowRight":
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((x) => Math.min(1, x + 0.1));
          setMuted(false);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((x) => Math.max(0, x - 0.1));
          break;
        case "f":
          toggleFs();
          break;
        case "m":
          setMuted((m) => !m);
          break;
        case "c":
          setCcOn((c) => !c && captions.length > 0);
          break;
      }
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captions.length, poke]);

  /* --------------------------------- fullscreen -------------------------------- */
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else boxRef.current?.requestFullscreen().catch(() => undefined);
  };
  useEffect(() => {
    const fn = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      flash("Picture-in-Picture unavailable");
    }
  };

  /* ------------------------- double-tap seek (mobile) ------------------------- */
  const onTap = (e: React.MouseEvent) => {
    const rect = boxRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const now = Date.now();
    const isDouble = now - lastTap.current.t < 320 && Math.abs(x - lastTap.current.x) < 80;
    lastTap.current = { t: now, x };
    if (isDouble) {
      const v = videoRef.current!;
      const leftHalf = x < rect.width / 2;
      v.currentTime = leftHalf ? Math.max(0, v.currentTime - 10) : Math.min(v.duration || 0, v.currentTime + 10);
      setRipple({ x, y: e.clientY - rect.top, id: now });
      flash(leftHalf ? "−10s" : "+10s");
    }
  };

  /* ---------------------------------- scrubber ---------------------------------- */
  const seekFromEvent = (clientX: number) => {
    const bar = barRef.current!;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const v = videoRef.current!;
    if (v.duration) v.currentTime = ratio * v.duration;
  };
  const onBarDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromEvent(e.clientX);
    const move = (ev: PointerEvent) => seekFromEvent(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onBarHover = (e: React.MouseEvent) => {
    const bar = barRef.current!;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover({ x: e.clientX - rect.left, t: ratio * (duration || 0) });
  };

  const switchQuality = (i: number) => {
    if (i === idx) return;
    const v = videoRef.current;
    if (v) {
      pendingSeek.current = v.currentTime;
      pendingPlay.current = !v.paused;
    }
    setIdx(i);
    setMenu(null);
    flash(`Quality · ${sources[i].resolution}p`);
  };

  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  const qualityLabel = useMemo(() => {
    const r = source?.resolution ?? 0;
    return r >= 1080 ? "Full HD" : r >= 720 ? "HD" : "SD";
  }, [source]);

  if (!source) {
    return (
      <div className="grid aspect-video w-full place-items-center bg-black">
        <p className="text-sm text-ink-dim">No playable source for this selection.</p>
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className={cn("group relative w-full overflow-hidden bg-black", fs ? "h-full" : "aspect-video")}
      onMouseMove={poke}
      onTouchStart={poke}
      onClick={onTap}
    >
      <video
        key={source.streamUrl}
        ref={videoRef}
        src={source.streamUrl}
        className="h-full w-full"
        playsInline
        autoPlay
        onLoadedMetadata={onLoadedMeta}
        onTimeUpdate={onTime}
        onProgress={onTime}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          onProgress?.(videoRef.current?.duration ?? 0, videoRef.current?.duration ?? 0);
          onEnded?.();
        }}
        onError={() => stepDown("Source busy")}
      />

      {/* ripple */}
      <AnimatePresence>
        {ripple && (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute size-24 rounded-full border-2 border-cyan"
            style={{ left: ripple.x - 48, top: ripple.y - 48 }}
          />
        )}
      </AnimatePresence>

      {/* big center play state */}
      <AnimatePresence>
        {!playing && !failed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            onClick={(e) => {
              e.stopPropagation();
              videoRef.current?.play().catch(() => undefined);
            }}
            className="ring-focus absolute top-1/2 left-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full glass-strong text-ink shadow-(--shadow-neon)"
            aria-label="Play"
          >
            <IPlay width={30} height={30} className="ml-1" />
          </motion.button>
        )}
      </AnimatePresence>

      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-black/80">
          <div className="text-center">
            <p className="font-serif text-xl text-ink">Playback failed</p>
            <p className="mt-1 text-sm text-ink-dim">All qualities exhausted. The upstream CDN may be throttling.</p>
            <button
              onClick={() => {
                setFailed(false);
                setIdx(0);
                videoRef.current?.load();
              }}
              className="bg-accent-gradient mt-4 cursor-pointer rounded-xl px-6 py-2.5 font-display text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-strong absolute top-16 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 font-display text-xs text-ink"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* subtitles */}
      {ccOn && cue && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4">
          <p className="max-w-[80%] rounded-lg bg-black/60 px-3 py-1.5 text-center text-[15px] leading-snug text-white backdrop-blur-sm">
            {cue}
          </p>
        </div>
      )}

      {/* top bar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pt-4 pb-8 transition-opacity duration-300",
          controls ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onBack} className="ring-focus cursor-pointer rounded-full p-2 text-ink hover:text-cyan" aria-label="Back">
          <IArrowL width={22} height={22} />
        </button>
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-semibold text-ink">{title}</div>
          {episodeLabel && <div className="truncate text-xs text-ink-dim">{episodeLabel}</div>}
        </div>
      </div>

      {/* bottom control bar */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 px-4 pb-4 transition-opacity duration-300",
          controls ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-strong rounded-2xl px-4 pt-3 pb-3">
          {/* scrubber */}
          <div
            ref={barRef}
            className="group/bar relative h-6 cursor-pointer touch-none"
            onPointerDown={onBarDown}
            onMouseMove={onBarHover}
            onMouseLeave={() => setHover(null)}
          >
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/15" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/20"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent-gradient"
              style={{ width: `${progressPct}%`, boxShadow: "0 0 12px color-mix(in oklch, var(--color-cyan) 60%, transparent)" }}
            />
            <div
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-soft shadow-(--shadow-neon)"
              style={{ left: `${progressPct}%` }}
            />
            {hover && (
              <div
                className="glass-strong pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md px-2 py-0.5 font-display text-[11px] text-ink"
                style={{ left: hover.x }}
              >
                {formatClock(hover.t)}
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-dim">
            <span className="font-display text-xs text-ink">{formatClock(current)}</span>
            <span className="text-ink-faint">/</span>
            <span className="font-display text-xs">{formatClock(duration)}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const v = videoRef.current!;
                v.paused ? v.play().catch(() => undefined) : v.pause();
              }}
              className="ring-focus cursor-pointer rounded-xl p-2 text-ink hover:text-cyan"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <IPause width={22} height={22} /> : <IPlay width={22} height={22} />}
            </button>
            {onNext && (
              <button onClick={onNext} className="ring-focus cursor-pointer rounded-xl p-2 text-ink-dim hover:text-ink" aria-label="Next episode">
                <ISkipF width={20} height={20} />
              </button>
            )}
            <button
              onClick={() => {
                const v = videoRef.current!;
                v.currentTime = Math.max(0, v.currentTime - 10);
              }}
              className="ring-focus hidden cursor-pointer rounded-xl p-2 text-ink-dim hover:text-ink sm:block"
              aria-label="Back 10 seconds"
            >
              <IRew10 width={20} height={20} />
            </button>
            <button
              onClick={() => {
                const v = videoRef.current!;
                v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
              }}
              className="ring-focus hidden cursor-pointer rounded-xl p-2 text-ink-dim hover:text-ink sm:block"
              aria-label="Forward 10 seconds"
            >
              <IFwd10 width={20} height={20} />
            </button>

            <div className="ml-1 hidden items-center gap-2 sm:flex">
              <button onClick={() => setMuted((m) => !m)} className="ring-focus cursor-pointer p-1.5 text-ink-dim hover:text-ink" aria-label="Mute">
                {muted || volume === 0 ? <IVolumeX width={19} height={19} /> : <IVolume width={19} height={19} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(false);
                }}
                className="jf-range w-24"
                style={{ ["--fill" as any]: `${(muted ? 0 : volume) * 100}%` }}
                aria-label="Volume"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* quality */}
              <div className="relative">
                <button
                  onClick={() => setMenu(menu === "quality" ? null : "quality")}
                  className={cn(
                    "ring-focus flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 font-display text-xs font-semibold transition-colors",
                    menu === "quality" ? "border-cyan/60 text-cyan" : "border-hairline-strong text-ink-dim hover:text-ink",
                  )}
                >
                  {source.resolution}p <IChevronD width={13} height={13} />
                </button>
                <AnimatePresence>
                  {menu === "quality" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="glass-strong absolute right-0 bottom-12 z-10 w-48 rounded-xl p-1.5"
                    >
                      <div className="px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.2em] text-ink-faint uppercase">
                        Quality
                      </div>
                      {sources.map((s, i) => (
                        <button
                          key={s.id + s.resolution}
                          onClick={() => switchQuality(i)}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left font-display text-xs transition-colors",
                            i === idx ? "bg-cyan/10 text-cyan" : "text-ink-dim hover:bg-canvas-raise hover:text-ink",
                          )}
                        >
                          <span>
                            {s.resolution}p
                            <span className="ml-2 text-[10px] text-ink-faint">
                              {s.resolution >= 1080 ? "Full HD" : s.resolution >= 720 ? "HD" : "SD"}
                            </span>
                          </span>
                          {i === idx && <ICheck width={14} height={14} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* subtitles */}
              {captions.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setMenu(menu === "cc" ? null : "cc")}
                    className={cn(
                      "ring-focus flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 font-display text-xs font-semibold transition-colors",
                      ccOn || menu === "cc" ? "border-cyan/60 text-cyan" : "border-hairline-strong text-ink-dim hover:text-ink",
                    )}
                    aria-label="Subtitles"
                  >
                    <ICaptions width={15} height={15} /> {ccOn ? (activeCaption?.label ?? "CC") : "CC"}
                  </button>
                  <AnimatePresence>
                    {menu === "cc" && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="glass-strong absolute right-0 bottom-12 z-10 max-h-64 w-52 overflow-y-auto rounded-xl p-1.5"
                      >
                        <button
                          onClick={() => {
                            setCcOn(false);
                            setMenu(null);
                          }}
                          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left font-display text-xs text-ink-dim hover:bg-canvas-raise hover:text-ink"
                        >
                          Off {!ccOn && <ICheck width={14} height={14} />}
                        </button>
                        {captions.map((c) => (
                          <button
                            key={c.lang}
                            onClick={() => {
                              setCcOn(true);
                              setCcLang(c.lang);
                              setMenu(null);
                            }}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left font-display text-xs transition-colors",
                              ccOn && c.lang === activeCaption?.lang
                                ? "bg-cyan/10 text-cyan"
                                : "text-ink-dim hover:bg-canvas-raise hover:text-ink",
                            )}
                          >
                            {c.label}
                            {ccOn && c.lang === activeCaption?.lang && <ICheck width={14} height={14} />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <button onClick={togglePip} className="ring-focus hidden cursor-pointer rounded-xl p-2 text-ink-dim hover:text-ink sm:block" aria-label="Picture in picture">
                <IPip width={18} height={18} />
              </button>
              <button onClick={toggleFs} className="ring-focus cursor-pointer rounded-xl p-2 text-ink-dim hover:text-ink" aria-label="Fullscreen">
                {fs ? <IMinimize width={18} height={18} /> : <IMaximize width={18} height={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* quality label chip */}
      <div
        className={cn(
          "absolute top-4 right-4 rounded-full border border-hairline bg-black/40 px-2.5 py-1 font-display text-[10px] tracking-wider text-ink-dim backdrop-blur transition-opacity",
          controls ? "opacity-100" : "opacity-0",
        )}
      >
        {source.resolution}p · {qualityLabel}
      </div>
    </div>
  );
}
