'use client';

import { useEffect, useState } from 'react';

// TODO: replace with a real feed of recent donations once the donation
// backend is wired up. For now this rotates through placeholder examples.
const PLACEHOLDER_DONATIONS = [
  { name: 'Janet', area: 'Kowloon', amount: 500, emoji: '💛' },
  { name: 'Marcus', area: 'Central', amount: 200, emoji: '🙌' },
  { name: 'Priya', area: 'Sha Tin', amount: 1000, emoji: '✨' }
];

export default function DonationToast() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % PLACEHOLDER_DONATIONS.length);
        setVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const donation = PLACEHOLDER_DONATIONS[index];

  return (
    <div className={`donation-toast ${visible ? 'donation-toast--visible' : ''}`}>
      <span className="donation-toast-emoji">{donation.emoji}</span>
      <div className="donation-toast-text">
        <span className="donation-toast-main">
          {donation.name} from {donation.area} just donated HK${donation.amount}
        </span>
        <a href="/donate" className="donation-toast-cta">
          Donate now &rarr;
        </a>
      </div>
    </div>
  );
}
