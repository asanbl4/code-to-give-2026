import '../features/landing/landing.css';
import Nav from '../features/landing/components/Nav';
import Hero from '../features/landing/components/Hero';
import StatsStrip from '../features/landing/components/StatsStrip';
import FinancialBanner from '../features/landing/components/FinancialBanner';
import ProgrammesPreview from '../features/landing/components/ProgrammesPreview';
import { CommunityGoalWidget } from '../app/homepage/community-goal-widget';
import StoriesSection from '../features/landing/components/StoriesSection';
import RecentEvents from '../features/landing/components/RecentEvents';
import Footer from '../features/landing/components/Footer';
import DonationToast from '../features/landing/components/DonationToast';

export default function Page() {
  return (
    <main>
      <Nav />
      <Hero />
      <StatsStrip />
      <FinancialBanner />
      <ProgrammesPreview />
      <CommunityGoalWidget />
      <StoriesSection />
      <RecentEvents />
      <Footer />
      <DonationToast />
    </main>
  );
}
