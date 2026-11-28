"use client";

// BoardUI PillTab 的 Peach 适配：集合宿主通过 Portal 承载同一选中层；来源见 docs/reference-snapshots/boardui-settings-tabs.md。

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ComponentType, CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import { cx, sortCx } from "@/utils/cx";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Figma source: Board UI → "ai_chat" → Changes / Browser panel switcher
 * (node 4030:5993 region) — the fully-rounded pill tab, in two styles:
 *
 *   pill      px 8, py 5, gap 4
 *   blue      fully rounded (40px); selected bg uses the semantic blue pill
 *             surface, icon + label color/blue/500 (the AI chat panel switcher)
 *   gray      radius/2lg (10px); selected bg background/tertiary, label
 *             text/primary (quieter — scope/filter rows like the settings
 *             Tools page)
 *   idle      label text/secondary, icon foreground/icon/secondary,
 *             background/primary/hover on hover (both styles)
 *   icon      optional 20px leading glyph
 *
 * `PillTabList` owns the animated selection background so it can slide
 * between pills with a subtle spring-like settle. `PillTab` remains a plain
 * button (not a React Aria Tabs collection): these switchers drive local view
 * state, not routed tab panels.
 */

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export type PillTabVariant = "blue" | "gray";

const styles = sortCx({
  radius: {
    blue: "rounded-full",
    gray: "rounded-2lg",
  },
  thumb: {
    blue: "bg-pill-tab-blue-selected-background",
    gray: "bg-background-tertiary-default",
  },
  hover: {
    blue: "bg-pill-tab-blue-hover-background",
    gray: "bg-background-primary-hover",
  },
  selectedIcon: {
    blue: "text-accent-500",
    gray: "text-foreground-icon-primary",
  },
  selectedLabel: {
    blue: "text-accent-500",
    gray: "text-text-primary",
  },
});

type Thumb = {
  left: number;
  top: number;
  width: number;
  height: number;
  variant: PillTabVariant;
};

export interface PillTabListProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  /** Peach：外部集合宿主承载装饰层，选项仍由 React Aria 管理。 */
  container?: HTMLDivElement | null;
}

export function PillTabList({ children, className, ref, container, ...props }: PillTabListProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = container === undefined ? innerRef.current : container;
    if (!el) return;
    const measure = () => {
      const selected = el.querySelector<HTMLElement>("[data-pill-selected]:not([data-navigation-drag-preview])");
      if (!selected) return;
      setThumb({
        left: selected.offsetLeft,
        top: selected.offsetTop,
        width: selected.offsetWidth,
        height: selected.offsetHeight,
        variant: selected.dataset.pillVariant === "gray" ? "gray" : "blue",
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const observeTabs = () => el.querySelectorAll(":is(button,[role=tab]):not([data-navigation-drag-preview])")
      .forEach(tab => ro.observe(tab));
    observeTabs();
    const mo = new MutationObserver(() => { observeTabs(); measure(); });
    mo.observe(el, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
      attributeFilter: ["data-pill-selected"],
    });
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, [props.dir, container]);

  const setRefs = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  };

  const selection = thumb && (
        <span
          aria-hidden
          data-pill-thumb=""
          className={cx(
            "pointer-events-none absolute left-0 top-0",
            styles.radius[thumb.variant],
            styles.thumb[thumb.variant],
          )}
          style={{
            '--pill-left': `${thumb.left}px`,
            '--pill-top': `${thumb.top}px`,
            '--pill-width': `${thumb.width}px`,
            '--pill-height': `${thumb.height}px`,
          } as CSSProperties}
        />
      );
  if (container !== undefined) return container ? createPortal(selection, container) : null;
  return (
    <div
      ref={setRefs}
      role="group"
      className={cx("relative inline-flex items-center gap-1", className)}
      {...props}
    >
      {selection}
      {children}
    </div>
  );
}

export function PillTab({
  variant = "blue",
  icon: Icon,
  isSelected,
  onSelect,
  children,
  className,
}: {
  variant?: PillTabVariant;
  icon?: IconComponent;
  isSelected: boolean;
  onSelect: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      data-pill-selected={isSelected ? "" : undefined}
      data-pill-variant={variant}
      onClick={onSelect}
      className={cx(
        "group relative z-10 flex shrink-0 cursor-pointer items-center gap-1 px-2 py-1.25 text-body-medium",
        styles.radius[variant],
        "outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute inset-0 opacity-0",
          "transition-opacity duration-200 ease-out",
          styles.radius[variant],
          styles.hover[variant],
          !isSelected && "group-hover:opacity-100",
        )}
      />
      {Icon && (
        <Icon
          className={cx(
            "relative z-10 size-(--icon-inline) shrink-0",
            isSelected ? styles.selectedIcon[variant] : "text-foreground-icon-secondary",
          )}
          aria-hidden
        />
      )}
      <span
        className={cx(
          "relative z-10 text-body-medium whitespace-nowrap",
          isSelected ? styles.selectedLabel[variant] : "text-text-secondary",
        )}
      >
        {children}
      </span>
    </button>
  );
}
