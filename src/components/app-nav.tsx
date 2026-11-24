import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserButton } from "@/lib/auth/gates";
import { useCensus } from "@/lib/census";
import { tx, type CopyKey } from "@/lib/i18n";
import { NAV, SETTINGS_NAV } from "@/lib/nav";
import { SEARCH_INDEX } from "@/lib/search-index.gen";
import { canEditSettings, useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

/**
 * The one side menu used on every Insights and Settings page.
 * Same groups, same order everywhere; only the highlighted item moves.
 */

const ADMIN_ONLY = new Set(["/insights/invitations", "/insights/reminders", "/insights/monitor"]);

type MenuItem = {
  to: string;
  key: CopyKey;
  icon: (typeof NAV)[number]["items"][number]["icon"];
  exact: boolean;
  also?: readonly string[];
};
type MenuGroup = { group: CopyKey; items: MenuItem[] };

function useMenu(): MenuGroup[] {
  const role = useCensus().currentRole;
  const hasFileQuestion = useSettings((s) => s.questions.some((q) => q.type === "file" && q.visible));
  const admin = canEditSettings(role);
  return useMemo(() => {
    const groups: MenuGroup[] = NAV.map((g) => ({
      group: g.group,
      items: (g.items as readonly (MenuItem & { onlyWithFiles?: boolean })[])
        .filter((item) => admin || !ADMIN_ONLY.has(item.to))
        .filter((item) => !item.onlyWithFiles || hasFileQuestion),
    }));
    if (admin) groups.push({ group: "groupSettings", items: SETTINGS_NAV as unknown as MenuItem[] });
    // A heading with nothing under it for this role is hidden.
    return groups.filter((g) => g.items.length > 0);
  }, [admin, hasFileQuestion]);
}

/** The menu item a page belongs to (pages merged into another page count as that page). */
function ownerOf(menu: MenuGroup[], path: string): { item: MenuItem; group: CopyKey } | undefined {
  for (const g of menu)
    for (const item of g.items) if (item.to === path || item.also?.includes(path)) return { item, group: g.group };
  return undefined;
}

export function AppSideNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const { t } = useT();
  const menu = useMenu();
  return (
    <>
      <Link to="/" className="mb-4 flex items-center gap-2.5" onClick={onNavigate}>
        <Mark className="size-8" />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">{t("app")}</div>
          <div className="text-xs text-muted">{t("liveCycle")}</div>
        </div>
      </Link>
      <NavSearch menu={menu} onNavigate={onNavigate} />
      <nav className="mt-5 flex flex-col gap-5">
        {menu.map((group) => (
          <div key={group.group}>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
              {t(group.group)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    activeOptions={{ exact: item.exact }}
                    className={`flex h-10 items-center gap-2 rounded-lg px-2 text-sm text-muted hover:bg-sand-2 hover:text-ink ${item.also?.includes(pathname) ? "bg-sand-2 font-medium text-ink [&_svg]:text-accent" : ""}`}
                    activeProps={{ className: "bg-sand-2 font-medium text-ink [&_svg]:text-accent" }}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

export function AppMobileNav() {
  const [open, setOpen] = useState(false);
  const { loc } = useT();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={loc({ en: "Menu", ar: "القائمة" })}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="start" className="overflow-y-auto pt-12">
        <AppSideNav onNavigate={() => setOpen(false)} />
        <div className="mt-6 border-t border-border pt-4">
          <UserButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------------------------------- search --------------------------------- */

/** Lower-case, drop Arabic diacritics and tatweel, unify alef/ya/ta marbuta forms. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, " ")
    .trim();
}

type Hit = { to: string; hash?: string; label: string; where: string; kind: "menu" | "page" | "section" | "field"; text?: string };

const KIND_RANK = { menu: 0, page: 1, section: 2, field: 3 } as const;

function useSearchHits(menu: MenuGroup[], query: string): Hit[] {
  const { t, lang } = useT();
  return useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    const words = q.split(" ");
    const allowed = new Set<string>();
    for (const g of menu) for (const item of g.items) [item.to, ...(item.also ?? [])].forEach((p) => allowed.add(p));
    const scored: { hit: Hit; score: number }[] = [];
    const consider = (hit: Hit, en: string, ar: string) => {
      const hay = `${norm(en)} | ${norm(ar)}`;
      if (!words.every((w) => hay.includes(w))) return;
      const first = norm(lang === "ar" ? ar : en);
      const score = (first.startsWith(q) ? 0 : first.includes(q) ? 1 : 2) * 10 + KIND_RANK[hit.kind];
      scored.push({ hit, score });
    };
    for (const g of menu)
      for (const item of g.items)
        consider({ to: item.to, label: t(item.key), where: t(g.group), kind: "menu" }, tLang("en", item.key), tLang("ar", item.key));
    const seen = new Set<string>();
    for (const e of SEARCH_INDEX) {
      if (!allowed.has(e.to)) continue;
      const label = lang === "ar" ? e.ar : e.en;
      const key = `${e.to}#${e.hash ?? ""}|${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const owner = ownerOf(menu, e.to);
      if (e.kind === "page" && owner && owner.item.to === e.to && t(owner.item.key) === label) continue;
      consider(
        { to: e.to, hash: e.hash, label, where: owner ? t(owner.item.key) : "", kind: e.kind, text: e.kind === "page" ? undefined : label },
        e.en,
        e.ar,
      );
    }
    return scored
      .sort((a, b) => a.score - b.score)
      .slice(0, 12)
      .map((s) => s.hit);
  }, [menu, query, t, lang]);
}

// Both languages are searched whatever the screen language is.
function tLang(lang: "en" | "ar", key: CopyKey): string {
  return tx(lang, key).replace(/\{[^}]*\}/g, "");
}

/** After moving to a page, scroll to the matching heading or field and flash it. */
function revealOnPage(hash: string | undefined, text: string | undefined) {
  const started = Date.now();
  const find = (): HTMLElement | null => {
    if (text) {
      const want = norm(text);
      const nodes = document.querySelectorAll<HTMLElement>("main h1, main h2, main h3, main h4, main label, h1, h2, h3, h4, label, th");
      for (const el of nodes) if (norm(el.textContent ?? "") === want) return el;
      for (const el of nodes) if (norm(el.textContent ?? "").includes(want)) return el;
    }
    return hash ? document.getElementById(hash) : null;
  };
  const tick = () => {
    const el = find();
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("nav-search-flash");
      window.setTimeout(() => el.classList.remove("nav-search-flash"), 1800);
      const control = el instanceof HTMLLabelElement && el.htmlFor ? document.getElementById(el.htmlFor) : null;
      control?.focus({ preventScroll: true });
      return;
    }
    if (Date.now() - started < 3000) window.setTimeout(tick, 120);
  };
  window.setTimeout(tick, 60);
}

function NavSearch({ menu, onNavigate }: { menu: MenuGroup[]; onNavigate?: () => void }) {
  const { loc } = useT();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useSearchHits(menu, query);

  useEffect(() => setActive(0), [query]);

  // Ctrl/⌘+K or "/" jumps to the search box (the visible one, desktop or phone menu).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        const el = inputRef.current;
        if (!el || el.offsetParent === null) return;
        e.preventDefault();
        el.focus();
        el.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (hit: Hit) => {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    onNavigate?.();
    void navigate({ to: hit.to, hash: hit.hash } as never).then(() => revealOnPage(hit.hash, hit.text));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const kindLabel = (k: Hit["kind"]) =>
    loc(
      k === "menu"
        ? { en: "Menu", ar: "القائمة" }
        : k === "page"
          ? { en: "Page", ar: "صفحة" }
          : k === "section"
            ? { en: "Section", ar: "قسم" }
            : { en: "Field", ar: "حقل" },
    );

  const listId = "nav-search-results";
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={loc({ en: "Search…", ar: "بحث…" })}
        aria-label={loc({ en: "Search menu and pages", ar: "البحث في القائمة والصفحات" })}
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined}
        className="h-10 w-full rounded-lg border border-border bg-paper ps-8 pe-12 text-sm text-ink outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring"
      />
      <kbd className="pointer-events-none absolute end-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-[10px] text-subtle md:block">
        Ctrl K
      </kbd>
      {open && query.trim() ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-paper p-1 shadow-lg"
        >
          {hits.length === 0 ? (
            <li className="px-2 py-3 text-sm text-subtle">{loc({ en: "Nothing found", ar: "لا توجد نتائج" })}</li>
          ) : (
            hits.map((hit, i) => (
              <li
                key={`${hit.kind}|${hit.to}|${hit.hash ?? ""}|${hit.label}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(hit)}
                className={`flex cursor-pointer flex-col rounded-md px-2 py-1.5 ${i === active ? "bg-sand-2" : ""}`}
              >
                <span className="text-sm text-ink">{hit.label}</span>
                <span className="text-[11px] text-subtle">
                  {kindLabel(hit.kind)}
                  {hit.where ? ` · ${hit.where}` : ""}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
