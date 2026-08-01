'use client';

import { useState } from 'react';

const NAV_LINKS = [
  { label: 'Who We Are', href: '/who-we-are' },
  { label: 'What We Do', href: '/what-we-do' },
  { label: 'Get Involved', href: '/get-involved' },
  { label: 'News & Stories', href: '/news-stories' }
];

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="/" className="nav-logo">
          Love 21 Foundation
        </a>

        <button
          className="nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          Menu
        </button>

        <div className={`nav-links ${menuOpen ? 'nav-links--open' : ''}`}>
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
          <a href="/donate" className="nav-donate">
            Donate
          </a>
        </div>
      </div>
    </nav>
  );
}
