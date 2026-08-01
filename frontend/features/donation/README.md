# Donation feature

Standalone accessible donation prototype for `/donate`.

## Scope

- Pure frontend prototype.
- No backend calls.
- No payment integration.
- No personal data collection.
- No local storage, cookies, analytics, or persistence.
- Thank-you state links to the separate demo supporter profile at `/profile`.

## Files

| File | Role |
|------|------|
| `types.ts` | Donation-specific TypeScript types. |
| `data.ts` | Donation options and verified impact statements. |
| `components/DonationExperience.tsx` | Client Component for state, validation, review, and confirmation flow. |
| `components/DonationProgress.tsx` | Compact three-step progress indicator. |
| `components/DonationSummary.tsx` | Dynamic summary card. |
| `components/DonationReview.tsx` | Review step. |
| `components/DonationThankYou.tsx` | Prototype thank-you step. |

## Content rules

Custom amounts do not generate impact descriptions. Programme selection is
presented as an area of interest, not a restricted fund allocation.
