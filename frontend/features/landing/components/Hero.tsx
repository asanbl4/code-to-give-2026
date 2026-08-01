"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, SelectField } from "@/components/ui";
import { RotatingText } from "@/components/vendor/RotatingText";
import { cn } from "@/lib/cn";
import { HERO_SLIDES, ROLE_ROUTES, ROTATING_WORDS } from "../data";
import "../landing.css";

const SLIDE_INTERVAL = 5500;

export function Hero() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);

  const currentIsVideo = HERO_SLIDES[activeSlide].type === "video";

  useEffect(() => {
    // Auto-advance pauses on a video slide: nobody wants to be moved off a
    // video they just started watching.
    if (currentIsVideo) return;

    // Functional update, so the interval does not close over `activeSlide` and
    // does not need to be torn down and rebuilt on every single slide change.
    const id = setInterval(
      () => setActiveSlide((current) => (current + 1) % HERO_SLIDES.length),
      SLIDE_INTERVAL,
    );
    return () => clearInterval(id);
  }, [currentIsVideo]);

  const goTo = (index: number) => setActiveSlide((index + HERO_SLIDES.length) % HERO_SLIDES.length);

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

      <section className="mx-auto w-full max-w-4xl px-5 py-14 text-center sm:px-8">
        <h1 className="flex flex-wrap items-center justify-center gap-x-3 font-display text-4xl font-bold leading-tight text-ink sm:text-6xl">
          <span>Ability to</span>
          <RotatingText
            texts={ROTATING_WORDS}
            className="text-signal"
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
              if (target) router.push(target.href);
            }}
          >
            Go
          </Button>
        </div>
      </section>
    </>
  );
}
