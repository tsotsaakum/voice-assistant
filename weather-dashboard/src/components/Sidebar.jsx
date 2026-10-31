import { useEffect, useState } from "react";
import {
  BookOpen,
  CloudSun,
  Headphones,
  Home,
  Languages,
  Layers,
  MoreHorizontal,
  Newspaper,
  Quote,
  Sparkles,
  StickyNote,
} from "lucide-react";

const ITEMS = [
  { id: "top", label: "Home", icon: Home },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "learn", label: "Learn", icon: Languages },
  { id: "cards", label: "Cards", icon: Layers },
  { id: "sky", label: "Sky", icon: Sparkles },
  { id: "news", label: "News", icon: Newspaper },
  { id: "weather", label: "Weather", icon: CloudSun },
  { id: "listen", label: "Listen", icon: Headphones },
  { id: "notes", label: "Notes", icon: StickyNote },
];

function go(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Sidebar() {
  const [active, setActive] = useState("top");
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const nodes = ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-15% 0px -60% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const nav = (className) =>
    ITEMS.map((item) => {
      const Icon = item.icon;
      const on = active === item.id;
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            setActive(item.id);
            go(item.id);
          }}
          aria-current={on ? "page" : undefined}
          className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] tracking-wide ${
            on ? "bg-white/18 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
          } ${className}`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
          {!compact && <span>{item.label}</span>}
        </button>
      );
    });

  return (
    <>
      <aside className={`sticky top-4 hidden h-[calc(100dvh-2rem)] shrink-0 md:block ${compact ? "w-[68px]" : "w-[92px]"}`}>
        <div className="glass flex h-full flex-col items-center gap-2 px-2 py-3">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10"
            aria-label={compact ? "Show navigation labels" : "Hide navigation labels"}
            onClick={() => setCompact((value) => !value)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <nav className="flex w-full flex-1 flex-col items-stretch gap-1 overflow-y-auto">{nav("w-full")}</nav>
        </div>
      </aside>
      <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <div className="glass flex gap-1 overflow-x-auto px-2 py-2">{nav("min-w-[64px] shrink-0")}</div>
      </nav>
    </>
  );
}
