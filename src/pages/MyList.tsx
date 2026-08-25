import { motion } from "motion/react";
import { useMyList, getProgress, toggleMyList } from "../lib/store";
import { useHead } from "../hooks/useHead";
import { PosterCard } from "../components/Cards";
import { EmptyState } from "../components/ui";
import { IX } from "../components/Icons";

export function MyListPage() {
  useHead("My List — Jagflix", "Everything you saved on Jagflix.");
  const list = useMyList();
  const progress = getProgress();

  return (
    <main className="mx-auto min-h-[80vh] w-full max-w-[1440px] px-4 pt-24 pb-28 sm:px-8 md:pb-16">
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-serif text-4xl font-semibold text-ink sm:text-5xl"
      >
        My List
      </motion.h1>
      <div className="mt-2 mb-8 h-px w-24 bg-accent-gradient" />

      {list.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          hint="Tap “My List” on any title to keep it here for later."
        />
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((entry, i) => {
            const p = progress.find((pr) => pr.subjectId === entry.item.subjectId);
            return (
              <div key={entry.item.subjectId} className="relative">
                <PosterCard
                  item={entry.item}
                  index={i % 6}
                  className="w-full sm:w-full md:w-full"
                  progress={p && p.duration > 0 ? p.t / p.duration : undefined}
                />
                <button
                  onClick={() => toggleMyList(entry.item)}
                  aria-label={`Remove ${entry.item.title} from My List`}
                  className="ring-focus absolute top-2 right-2 z-10 grid size-8 cursor-pointer place-items-center rounded-full border border-violet/60 bg-canvas-deep/70 text-ink backdrop-blur transition-colors hover:border-danger hover:text-danger"
                >
                  <IX width={15} height={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
