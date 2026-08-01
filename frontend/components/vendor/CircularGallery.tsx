"use client";

import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import type { OGLRenderingContext } from "ogl";
import { useEffect, useRef } from "react";
import "./CircularGallery.css";

/**
 * Vendored from reactbits.dev, converted to TypeScript.
 *
 * A WebGL carousel: planes laid out along an arc, dragged or scrolled
 * horizontally, with each item's caption rendered to a canvas texture.
 *
 * KNOWN ISSUE, carried over from the original: the drag and wheel listeners are
 * attached to `window`, not to the container, so scrolling or dragging anywhere
 * on the page also moves this gallery.
 */

interface Size {
  width: number;
  height: number;
}

interface ScrollState {
  ease: number;
  current: number;
  target: number;
  last: number;
  position: number;
}

export interface GalleryItem {
  image: string;
  text: string;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function debounce(run: () => void, wait: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(run, wait);
  };
}

const DEFAULT_FONT = "bold 30px Figtree";
const DEFAULT_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&display=swap";

function deriveFontFamilyFromUrl(url: string): string {
  const fileName = (url.split("/").pop() || "custom-font").split("?")[0];
  const base = fileName.replace(/\.(woff2?|ttf|otf|eot)$/i, "");
  return base.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "CircularGalleryFont";
}

async function loadFontFromStylesheet(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch font stylesheet (${response.status})`);

  const cssText = await response.text();
  const faceBlocks = cssText.match(/@font-face\s*{[^}]*}/g) ?? [];
  let family: string | null = null;
  const fontFaces: FontFace[] = [];

  for (const block of faceBlocks) {
    const familyMatch = block.match(/font-family:\s*['"]?([^;'"]+)['"]?/);
    const urlMatch = block.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (!familyMatch || !urlMatch) continue;

    family = familyMatch[1].trim();
    const descriptors: FontFaceDescriptors = {};
    const weightMatch = block.match(/font-weight:\s*([^;]+);/);
    const styleMatch = block.match(/font-style:\s*([^;]+);/);
    const rangeMatch = block.match(/unicode-range:\s*([^;]+);/);
    if (weightMatch) descriptors.weight = weightMatch[1].trim();
    if (styleMatch) descriptors.style = styleMatch[1].trim();
    if (rangeMatch) descriptors.unicodeRange = rangeMatch[1].trim();

    fontFaces.push(new FontFace(family, `url(${urlMatch[1]})`, descriptors));
  }

  if (!family) throw new Error("No @font-face rule found in the stylesheet");

  await Promise.allSettled(
    fontFaces.map(async (face) => {
      await face.load();
      document.fonts.add(face);
    }),
  );
  return family;
}

async function loadFontFromFile(url: string): Promise<string> {
  const family = deriveFontFamilyFromUrl(url);
  const fontFace = new FontFace(family, `url(${url})`);
  await fontFace.load();
  document.fonts.add(fontFace);
  return family;
}

async function resolveFont(font: string, fontUrl?: string): Promise<string> {
  const effectiveUrl = fontUrl || (font === DEFAULT_FONT ? DEFAULT_FONT_URL : null);

  if (!effectiveUrl) {
    try {
      await document.fonts.load(font);
      await document.fonts.ready;
    } catch {
      // A font that will not load is not a reason to skip the gallery.
    }
    return font;
  }

  try {
    const isStylesheet =
      effectiveUrl.includes("fonts.googleapis.com") || /\.css(\?.*)?$/i.test(effectiveUrl);
    const family = isStylesheet
      ? await loadFontFromStylesheet(effectiveUrl)
      : await loadFontFromFile(effectiveUrl);
    const sizeMatch = font.match(/^\s*(.*?\d+px)/);
    const resolved = `${sizeMatch ? sizeMatch[1].trim() : "bold 30px"} "${family}"`;
    try {
      await document.fonts.load(resolved);
    } catch {
      // As above.
    }
    return resolved;
  } catch (error) {
    console.error("CircularGallery: unable to load font from", effectiveUrl, error);
    return font;
  }
}

function getFontSize(font: string): number {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(
  gl: OGLRenderingContext,
  text: string,
  font: string,
  color: string,
): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CircularGallery: 2D canvas context unavailable");

  context.font = font;
  const textWidth = Math.ceil(context.measureText(text).width);
  const textHeight = Math.ceil(getFontSize(font) * 1.2);

  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;

  // Resizing the canvas resets the context, so the font has to be set again.
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

const TITLE_VERTEX = `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TITLE_FRAGMENT = `
  precision highp float;
  uniform sampler2D tMap;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(tMap, vUv);
    if (color.a < 0.1) discard;
    gl_FragColor = color;
  }
`;

const MEDIA_VERTEX = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpeed;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const MEDIA_FRAGMENT = `
  precision highp float;
  uniform vec2 uImageSizes;
  uniform vec2 uPlaneSizes;
  uniform sampler2D tMap;
  uniform float uBorderRadius;
  varying vec2 vUv;

  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b;
    return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
  }

  void main() {
    vec2 ratio = vec2(
      min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
      min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
    );
    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
    vec4 color = texture2D(tMap, uv);

    float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
    float edgeSmooth = 0.002;
    float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);

    gl_FragColor = vec4(color.rgb, alpha);
  }
`;

/** The caption plane parented under each image plane. */
class Title {
  constructor(
    gl: OGLRenderingContext,
    private readonly plane: Mesh,
    text: string,
    textColor: string,
    font: string,
  ) {
    const { texture, width, height } = createTextTexture(gl, text, font, textColor);
    const program = new Program(gl, {
      vertex: TITLE_VERTEX,
      fragment: TITLE_FRAGMENT,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry: new Plane(gl), program });
    const textHeight = this.plane.scale.y * 0.15;
    mesh.scale.set(textHeight * (width / height), textHeight, 1);
    mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    mesh.setParent(this.plane);
  }
}

interface MediaOptions {
  geometry: Plane;
  gl: OGLRenderingContext;
  image: string;
  index: number;
  length: number;
  scene: Transform;
  screen: Size;
  text: string;
  viewport: Size;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
}

/** One image plane, its caption, and its position on the arc. */
class Media {
  private readonly gl: OGLRenderingContext;
  private readonly index: number;
  private readonly length: number;
  private readonly bend: number;
  private readonly borderRadius: number;
  private readonly program: Program;
  private readonly plane: Mesh;

  private screen: Size;
  private viewport: Size;
  private extra = 0;
  private x = 0;
  private widthTotal = 0;

  /** Wrap-around bookkeeping, read by `update`. */
  width = 0;

  constructor(options: MediaOptions) {
    this.gl = options.gl;
    this.index = options.index;
    this.length = options.length;
    this.bend = options.bend;
    this.borderRadius = options.borderRadius;
    this.screen = options.screen;
    this.viewport = options.viewport;

    const texture = new Texture(this.gl, { generateMipmaps: true });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: MEDIA_VERTEX,
      fragment: MEDIA_FRAGMENT,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = options.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };

    this.plane = new Mesh(this.gl, { geometry: options.geometry, program: this.program });
    this.plane.setParent(options.scene);

    new Title(this.gl, this.plane, options.text, options.textColor, options.font);

    this.onResize();
  }

  update(scroll: ScrollState, direction: "left" | "right"): void {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const halfWidth = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const bendAbs = Math.abs(this.bend);
      const radius = (halfWidth * halfWidth + bendAbs * bendAbs) / (2 * bendAbs);
      const effectiveX = Math.min(Math.abs(x), halfWidth);
      const arc = radius - Math.sqrt(radius * radius - effectiveX * effectiveX);
      const angle = Math.asin(effectiveX / radius);

      this.plane.position.y = this.bend > 0 ? -arc : arc;
      this.plane.rotation.z = (this.bend > 0 ? -1 : 1) * Math.sign(x) * angle;
    }

    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = scroll.current - scroll.last;

    // Recycle a plane the moment it leaves the viewport on the trailing side,
    // which is what makes the strip feel endless.
    const planeOffset = this.plane.scale.x / 2;
    if (direction === "right" && this.plane.position.x + planeOffset < -halfWidth) {
      this.extra -= this.widthTotal;
    }
    if (direction === "left" && this.plane.position.x - planeOffset > halfWidth) {
      this.extra += this.widthTotal;
    }
  }

  onResize(size?: { screen: Size; viewport: Size }): void {
    if (size) {
      this.screen = size.screen;
      this.viewport = size.viewport;
    }

    const scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (900 * scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * scale)) / this.screen.width;
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];

    const padding = 2;
    this.width = this.plane.scale.x + padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

interface AppOptions {
  items: readonly GalleryItem[];
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  scrollSpeed: number;
  scrollEase: number;
}

class App {
  private readonly renderer: Renderer;
  private readonly gl: OGLRenderingContext;
  private readonly camera: Camera;
  private readonly scene = new Transform();
  private readonly planeGeometry: Plane;
  private readonly medias: Media[];
  private readonly scrollSpeed: number;
  private readonly onCheckDebounced: () => void;

  private screen: Size = { width: 0, height: 0 };
  private viewport: Size = { width: 0, height: 0 };
  private scroll: ScrollState;
  private isDown = false;
  private start = 0;
  private raf = 0;

  constructor(
    private readonly container: HTMLElement,
    options: AppOptions,
  ) {
    this.scrollSpeed = options.scrollSpeed;
    this.scroll = { ease: options.scrollEase, current: 0, target: 0, last: 0, position: 0 };
    this.onCheckDebounced = debounce(() => this.onCheck(), 200);

    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);

    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;

    this.measure();

    this.planeGeometry = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 });

    // Doubled, so the strip can wrap without a visible gap.
    const looped = [...options.items, ...options.items];
    this.medias = looped.map(
      (item, index) =>
        new Media({
          geometry: this.planeGeometry,
          gl: this.gl,
          image: item.image,
          index,
          length: looped.length,
          scene: this.scene,
          screen: this.screen,
          text: item.text,
          viewport: this.viewport,
          bend: options.bend,
          textColor: options.textColor,
          borderRadius: options.borderRadius,
          font: options.font,
        }),
    );

    this.update();
    this.addEventListeners();
  }

  private onTouchDown = (event: MouseEvent | TouchEvent): void => {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = "touches" in event ? event.touches[0].clientX : event.clientX;
  };

  private onTouchMove = (event: MouseEvent | TouchEvent): void => {
    if (!this.isDown) return;
    const x = "touches" in event ? event.touches[0].clientX : event.clientX;
    this.scroll.target = this.scroll.position + (this.start - x) * (this.scrollSpeed * 0.025);
  };

  private onTouchUp = (): void => {
    this.isDown = false;
    this.onCheck();
  };

  private onWheel = (event: WheelEvent): void => {
    this.scroll.target += (event.deltaY > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounced();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const steps: Record<string, number | "home"> = {
      ArrowRight: this.scrollSpeed * 5,
      ArrowLeft: -this.scrollSpeed * 5,
      Home: "home",
    };
    const step = steps[event.key];
    if (step === undefined) return;

    event.preventDefault();
    if (step === "home") this.scroll.target = 0;
    else this.scroll.target += step;
    this.onCheckDebounced();
  };

  private onResize = (): void => {
    this.measure();
    this.medias.forEach((media) =>
      media.onResize({ screen: this.screen, viewport: this.viewport }),
    );
  };

  /** Snap to the nearest item once the gesture ends. */
  private onCheck(): void {
    const width = this.medias?.[0]?.width;
    if (!width) return;
    const item = width * Math.round(Math.abs(this.scroll.target) / width);
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  private measure(): void {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });

    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: height * this.camera.aspect, height };
  }

  private update = (): void => {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias.forEach((media) => media.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update);
  };

  private addEventListeners(): void {
    window.addEventListener("resize", this.onResize);
    window.addEventListener("wheel", this.onWheel);
    window.addEventListener("mousedown", this.onTouchDown);
    window.addEventListener("mousemove", this.onTouchMove);
    window.addEventListener("mouseup", this.onTouchUp);
    window.addEventListener("touchstart", this.onTouchDown);
    window.addEventListener("touchmove", this.onTouchMove);
    window.addEventListener("touchend", this.onTouchUp);
    this.container.addEventListener("keydown", this.onKeyDown);
  }

  destroy(): void {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("mousedown", this.onTouchDown);
    window.removeEventListener("mousemove", this.onTouchMove);
    window.removeEventListener("mouseup", this.onTouchUp);
    window.removeEventListener("touchstart", this.onTouchDown);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchUp);
    this.container.removeEventListener("keydown", this.onKeyDown);
    this.gl.canvas.parentNode?.removeChild(this.gl.canvas);
  }
}

interface CircularGalleryProps {
  items: readonly GalleryItem[];
  /** 0 is a flat strip; higher values curve it more. */
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  fontUrl?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  /** Describes the gallery's contents to assistive tech. */
  label?: string;
}

export function CircularGallery({
  items,
  bend = 3,
  textColor = "#333333",
  borderRadius = 0.05,
  font = "bold 24px Figtree",
  fontUrl,
  scrollSpeed = 2,
  scrollEase = 0.05,
  label = "Image gallery. Use left and right arrow keys to navigate.",
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let app: App | undefined;
    let cancelled = false;

    void resolveFont(font, fontUrl).then((resolvedFont) => {
      if (cancelled) return;
      app = new App(container, {
        items,
        bend,
        textColor,
        borderRadius,
        font: resolvedFont,
        scrollSpeed,
        scrollEase,
      });
    });

    return () => {
      cancelled = true;
      app?.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, fontUrl, scrollSpeed, scrollEase]);

  return (
    <div className="circular-gallery" ref={containerRef} tabIndex={0} role="region" aria-label={label} />
  );
}
