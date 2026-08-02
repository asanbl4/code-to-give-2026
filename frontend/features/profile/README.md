# Profile feature

Standalone supporter impact profile prototype for `/profile`.

## Scope

- Uses typed local demonstration data.
- Represents a supporter's own impact, not a Love 21 member story.
- No authentication.
- No backend calls.
- No database writes.
- No local storage, cookies, analytics, or persistent tracking.
- Does not imply that `/donate` automatically updates the profile.

## Files

| File | Role |
|------|------|
| `types.ts` | Supporter profile, donation, volunteer, activity, and badge types. |
| `data.ts` | Local demo profile data. |
| `components/ProfileHeader.tsx` | Demo profile header and account label. |
| `components/ImpactSummaryCards.tsx` | Summary cards for donation, volunteer, and milestone metrics. |
| `components/CommunityRecognition.tsx` | Client Component for the accessible Community Recognition tabs. |
| `components/RecognitionTabs.tsx` | ARIA tab controls with Left/Right Arrow support. |
| `components/LeaderboardList.tsx` | Renders the visible top five demo leaderboard rows. |
| `components/LeaderboardRow.tsx` | Accessible stacked leaderboard row for mobile and desktop. |
| `components/CurrentUserPosition.tsx` | Separate current demo profile row when outside the top five. |
| `components/DonationImpactSection.tsx` | Donation totals grouped by supporter interest. |
| `components/VolunteerImpactSection.tsx` | Volunteer hours, activities, and interests. |
| `components/RecentActivitySection.tsx` | Demo donation and volunteer activity. |
| `components/MilestonesSection.tsx` | Participation-positive demo badges. |
| `components/ShareImpact.tsx` | Client Component for copying a privacy-safe impact summary. |
| `components/PrivacyAccountNote.tsx` | Placeholder account and privacy controls explanation. |

## Content rules

All names, totals, activities, dates, leaderboard rows, and badges are demo data.
Badges recognise participation without ranking supporters by donation size.
Community Recognition is fictional, optional in concept, and not live supporter
data.
