'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import RotatingText from './RotatingText';

const ROLE_ROUTES = {
  family: { label: 'Family / Parent', href: '/what-we-do' },
  supporter: { label: 'Supporter / Donor', href: '/get-involved' },
  corporate: { label: 'Corporate Partner', href: '/get-involved#csr' },
  member: { label: 'Alum / Member', href: '/member-portal' } // placeholder, not built yet
};

const CAROUSEL_SLIDES = [
  {
    id: 1,
    type: 'image',
    image: 'https://love21foundation.com/wp-content/uploads/2021/08/IMG_1641-scaled.jpg',
    caption: '#SoMuchAbility',
    href: '/what-we-do'
  },
  {
    id: 2,
    type: 'video',
    youtubeId: '3U7jO4o3iAE',
    caption: 'Watch our story',
    href: '/who-we-are'
  },
  {
    id: 3,
    type: 'image',
    image: 'https://love21foundation.com/wp-content/uploads/2021/08/a19c3f56-b90d-4a19-b5b6-1f90b68bb103.jpg',
    caption: 'Sport without limitations',
    href: '/what-we-do#sports'
  },
  {
    id: 4,
    type: 'image',
    image: 'https://love21foundation.com/wp-content/uploads/2021/08/44548051-c7d1-4248-a0b5-a6243deb3644.jpg',
    caption: 'Family is at the heart of everything we do',
    href: '/what-we-do#family'
  },
  {
    id: 5,
    type: 'image',
    image: 'https://love21foundation.com/wp-content/uploads/2021/08/bc61bfd9-bdf8-4117-8394-9269df16c04d.jpg',
    caption: 'Corporate teams making a real difference',
    href: '/what-we-do#csr'
  }
];

export default function Hero() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const total = CAROUSEL_SLIDES.length;
  const currentIsVideo = CAROUSEL_SLIDES[activeSlide].type === 'video';
  const intervalRef = useRef(null);

  const goTo = index => {
    setActiveSlide((index + total) % total);
  };
  const next = () => goTo(activeSlide + 1);
  const prev = () => goTo(activeSlide - 1);

  useEffect(() => {
    // Pause auto-advance while a video slide is showing; resume on images.
    if (currentIsVideo) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(next, 5500);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlide, currentIsVideo]);

  const handleGo = () => {
    const target = ROLE_ROUTES[role];
    if (target) router.push(target.href);
  };

  return (
    <>
      <section className="hero-carousel">
        <div
          className="hero-carousel-track"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {CAROUSEL_SLIDES.map((slide, i) => (
            <div key={slide.id} className="hero-carousel-slide">
              {slide.type === 'image' && (
                <div
                  className="hero-carousel-bg"
                  style={{ backgroundImage: `url(${slide.image})` }}
                />
              )}
              {slide.type === 'video' && (
                <div className="hero-carousel-video-wrap">
                  {Math.abs(i - activeSlide) <= 1 && (
                    <iframe
                      className="hero-carousel-video"
                      src={`https://www.youtube.com/embed/${slide.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${slide.youtubeId}&controls=1&modestbranding=1&rel=0`}
                      title="Love 21 Foundation intro video"
                      allow="autoplay; encrypted-media"
                      frameBorder="0"
                    />
                  )}
                </div>
              )}
              <div className="hero-carousel-overlay">
                <span className="hero-carousel-caption">{slide.caption}</span>
                <a href={slide.href} className="hero-carousel-cta">
                  Learn more
                </a>
              </div>
            </div>
          ))}
        </div>

        <button className="hero-carousel-arrow hero-carousel-arrow--left" onClick={prev} aria-label="Previous slide">
          &#8249;
        </button>
        <button className="hero-carousel-arrow hero-carousel-arrow--right" onClick={next} aria-label="Next slide">
          &#8250;
        </button>

        <div className="hero-carousel-dots">
          {CAROUSEL_SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              className={`hero-carousel-dot ${i === activeSlide ? 'hero-carousel-dot--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="hero-body">
        <h1 className="hero-headline">
          <span>Ability to</span>
          <RotatingText
            texts={['play', 'cook', 'thrive', 'contribute']}
            mainClassName="hero-rotating-word"
            staggerFrom="last"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-120%' }}
            staggerDuration={0.025}
            rotationInterval={2200}
          />
        </h1>
        <p className="hero-subtext">
          Love 21 empowers the Down syndrome, autistic, and neurodiverse community in Hong Kong through
          sport, nutrition, and family support.
        </p>

        <div className="hero-role-selector">
          <label htmlFor="role-select">I am a(n)</label>
          <select id="role-select" value={role} onChange={e => setRole(e.target.value)}>
            <option value="" disabled>
              Select one
            </option>
            {Object.entries(ROLE_ROUTES).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <button onClick={handleGo} disabled={!role}>
            Go
          </button>
        </div>
      </section>
    </>
  );
}
