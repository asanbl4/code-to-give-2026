import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import "./GlareHover.css";

/**
 * Vendored from reactbits.dev, converted to TypeScript. Third-party in origin —
 * kept here rather than in `features/` so it is obvious this is not our design
 * system, and so nobody edits it expecting the tokens to apply.
 */

interface GlareHoverProps {
  width?: string;
  height?: string;
  /** Any CSS `background` shorthand, including `url(...)`. */
  background?: string;
  borderRadius?: string;
  borderColor?: string;
  glareColor?: string;
  glareOpacity?: number;
  glareAngle?: number;
  glareSize?: number;
  transitionDuration?: number;
  playOnce?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** `#rgb` / `#rrggbb` → `rgba(r, g, b, opacity)`; anything else passes through. */
function toRgba(color: string, opacity: number): string {
  const hex = color.replace("#", "");
  const expanded =
    /^[0-9a-f]{3}$/i.test(hex)
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return color;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function GlareHover({
  width = "100%",
  height = "100%",
  background = "#000",
  borderRadius = "10px",
  borderColor = "#333",
  glareColor = "#ffffff",
  glareOpacity = 0.5,
  glareAngle = -45,
  glareSize = 250,
  transitionDuration = 650,
  playOnce = false,
  className,
  style,
  children,
}: GlareHoverProps) {
  const vars = {
    "--gh-width": width,
    "--gh-height": height,
    "--gh-bg": background,
    "--gh-br": borderRadius,
    "--gh-angle": `${glareAngle}deg`,
    "--gh-duration": `${transitionDuration}ms`,
    "--gh-size": `${glareSize}%`,
    "--gh-rgba": toRgba(glareColor, glareOpacity),
    "--gh-border": borderColor,
  } as CSSProperties;

  return (
    <div
      className={cn("glare-hover", playOnce && "glare-hover--play-once", className)}
      style={{ ...vars, ...style }}
    >
      {children}
    </div>
  );
}
