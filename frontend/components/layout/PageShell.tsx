import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
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
 */
export function PageShell({ children, width = "wide", className }: PageShellProps) {
  return (
    <>
      <SiteHeader />
      <main className={cn("flex-1", WIDTHS[width], className)}>{children}</main>
      <SiteFooter />
    </>
  );
}
