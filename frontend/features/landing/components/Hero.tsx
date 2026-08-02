"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, SelectField } from "@/components/ui";
import { RotatingText } from "@/components/vendor/RotatingText";
import Grainient from "@/components/vendor/Grainient/Grainient";
import { cn } from "@/lib/cn";
import { HERO_FACE_SLIDE_ID, HERO_SLIDES, ROLE_ROUTES, ROTATING_WORDS } from "../data";
import { HeroFaceTags } from "./HeroFaceTags";
import "../landing.css";

const SLIDE_INTERVAL = 5500;

/**
 * The tagged slide gets a much longer dwell. The whole point of it is that
 * somebody notices a highlighted face, reaches for it, and reads a story;
 * 5.5 seconds is not enough time to do the first of those, let alone all three.
 */
const TAGGED_SLIDE_INTERVAL = 30_000;

/**
 * Whether a ROLE_ROUTES href leaves this app.
 *
 * Read off the scheme rather than a flag on each route: a flag is something
 * you can forget to set when adding a URL, and forgetting it would hand an
 * absolute URL to the Next router, which is exactly the bug this replaced.
 */
const isExternalHref = (href: string) => /^https?:\/\//i.test(href);

export function Hero() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [openFaceId, setOpenFaceId] = useState<string | null>(null);

  const current = HERO_SLIDES[activeSlide];
  const currentIsVideo = current.type === "video";
  const currentIsTagged = current.id === HERO_FACE_SLIDE_ID;
  // Auto-advance pauses on a video slide -- nobody wants to be moved off a
  // video they just started watching -- and while a face's story is open,
  // which is the same argument.
  const paused = currentIsVideo || openFaceId !== null;

  useEffect(() => {
    if (paused) return;

    // Functional update, so the interval does not close over `activeSlide` and
    // does not need to be torn down and rebuilt on every single slide change.
    const id = setInterval(
      () => setActiveSlide((slide) => (slide + 1) % HERO_SLIDES.length),
      currentIsTagged ? TAGGED_SLIDE_INTERVAL : SLIDE_INTERVAL,
    );
    return () => clearInterval(id);
  }, [paused, currentIsTagged]);

  const goTo = (index: number) => {
    // A card left open on a slide nobody is looking at would keep the carousel
    // paused for good.
    setOpenFaceId(null);
    setActiveSlide((index + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  return (
    <>
      <section className="hero-carousel" aria-roledescription="carousel" aria-label="Love 21 in action">
        <div
          className="hero-carousel-track"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className="hero-carousel-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${HERO_SLIDES.length}`}
              aria-hidden={index !== activeSlide}
            >
              {slide.type === "image" ? (
                <div
                  className="hero-carousel-bg"
                  style={{ backgroundImage: `url(${slide.image})` }}
                />
              ) : (
                <div className="hero-carousel-video-wrap">
                  {/* Only mount the iframe when it is on or next to the screen. */}
                  {Math.abs(index - activeSlide) <= 1 && (
                    <iframe
                      className="hero-carousel-video"
                      src={`https://www.youtube.com/embed/${slide.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${slide.youtubeId}&controls=1&modestbranding=1&rel=0`}
                      title="Love 21 Foundation intro video"
                      allow="autoplay; encrypted-media"
                    />
                  )}
                </div>
              )}
              <div className="hero-carousel-overlay">
                <span className="hero-carousel-caption">{slide.caption}</span>
                <Button href={slide.href} tabIndex={index === activeSlide ? undefined : -1}>
                  Learn more
                </Button>
              </div>

              {/* After the overlay, deliberately: the overlay is `inset: 0` and
                  would otherwise take every tap meant for a face. */}
              {slide.id === HERO_FACE_SLIDE_ID && (
                <HeroFaceTags
                  active={index === activeSlide}
                  openId={openFaceId}
                  onOpen={setOpenFaceId}
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="hero-carousel-arrow hero-carousel-arrow--left"
          onClick={() => goTo(activeSlide - 1)}
          aria-label="Previous slide"
        >
          <span aria-hidden="true">&#8249;</span>
        </button>
        <button
          type="button"
          className="hero-carousel-arrow hero-carousel-arrow--right"
          onClick={() => goTo(activeSlide + 1)}
          aria-label="Next slide"
        >
          <span aria-hidden="true">&#8250;</span>
        </button>

        <div className="hero-carousel-dots">
          {HERO_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={cn(
                "hero-carousel-dot",
                index === activeSlide && "hero-carousel-dot--active",
              )}
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeSlide}
            />
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-4xl overflow-hidden px-5 py-14 text-center sm:px-8">
        {/* Subtle, slow-moving gradient behind the hero text — pale enough
            that dark ink text stays fully readable over it. Purely
            decorative: aria-hidden, pointer-events none, sits behind the
            content via -z-10. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <Grainient
            color1="#FFF8F1"
            color2="#FBE1E3"
            color3="#FFF0CC"
            timeSpeed={0.06}
            warpFrequency={3}
            warpAmplitude={25}
            grainAmount={0.04}
            contrast={1.05}
            saturation={0.9}
            zoom={1.3}
            blendSoftness={0.15}
          />
        </div>

        <h1 className="flex flex-wrap items-center justify-center gap-x-3 font-display text-4xl font-bold leading-tight text-ink sm:text-6xl">
          <span>Ability to</span>
          <RotatingText
            texts={ROTATING_WORDS}
            className="hero-rotating-word"
            staggerFrom="last"
            staggerDuration={0.025}
            rotationInterval={2200}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-120%" }}
          />
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-ink-soft">
          Love 21 empowers the Down syndrome, autistic, and neurodiverse community in Hong Kong
          through sport, nutrition, and family support.
        </p>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-stretch gap-3 text-left sm:flex-row sm:items-end">
          <SelectField
            id="hero-role"
            label="I am a(n)"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            fieldClassName="flex-1"
          >
            <option value="" disabled>
              Select one
            </option>
            {ROLE_ROUTES.map((route) => (
              <option key={route.value} value={route.value}>
                {route.label}
              </option>
            ))}
          </SelectField>
          <Button
            disabled={!role}
            onClick={() => {
              const target = ROLE_ROUTES.find((route) => route.value === role);
              if (!target) return;
              // The Next router owns this app's routes and nothing else, so an
              // off-site destination cannot go through it. Members sign in on
              // the main love21foundation.com WordPress site, which this app
              // does not host.
              //
              // New tab with noopener, the treatment every other external link
              // in this codebase gets — and it keeps the landing page, and
              // whatever the visitor had already picked, behind them.
              if (isExternalHref(target.href)) {
                window.open(target.href, "_blank", "noopener,noreferrer");
                return;
              }
              router.push(target.href);
            }}
          >
            Go
          </Button>
        </div>
      </section>
    </>
  );
}
