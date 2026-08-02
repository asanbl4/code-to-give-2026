import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { MascotProvider } from "@/features/mascot/MascotContext";
import { MascotFaqOverlay } from "@/features/mascot/components/MascotFaqOverlay";
import { MascotIntroOverlay } from "@/features/mascot/components/MascotIntroOverlay";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

interface PageShellProps {
  children: ReactNode;
  /** `wide` for dashboards and grids, `narrow` for reading. */
  width?: "wide" | "narrow" | "full";
  className?: string;
}

const WIDTHS = {
  wide: "mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14",
  narrow: "mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14",
  /** No container at all — for pages whose sections manage their own width. */
  full: "",
};

/**
 * Header, content, footer. Every page uses it, so the header and footer cannot
 * be forgotten on a new route the way they were on events, stories and
 * get-involved.
 *
 * Also wraps everything in MascotProvider here rather than in the root
 * layout, so the Love 21 mascot (its header badge in SiteHeader, its intro
 * overlay below) rides along on every real content page but stays off the
 * bare admin/auth screens that don't use PageShell.
 */
export function PageShell({ children, width = "wide", className }: PageShellProps) {
  return (
    <MascotProvider>
      <div className="relative isolate flex min-h-screen flex-1 flex-col">
        <div aria-hidden="true" className="page-doodle-backdrop" />
        <SiteHeader />
        <main className={cn("relative z-10 flex-1", WIDTHS[width], className)}>{children}</main>
        <div className="relative z-10">
          <SiteFooter />
        </div>
      </div>
      <MascotIntroOverlay />
      <MascotFaqOverlay />
    </MascotProvider>
  );
}
