import type { EventSession } from "./types";

export const eventSessions: EventSession[] = [
  {
    id: "football-friends",
    title: "Football Friends Session",
    summary: "A welcoming sports session focused on movement, teamwork, and confidence.",
    startsAt: "2026-08-08T10:00:00+08:00",
    endsAt: "2026-08-08T11:30:00+08:00",
    location: "Happy Valley Recreation Ground",
    capacityLabel: "8 volunteers needed",
    eligibleAgeGroups: ["16-17", "18-plus"],
  },
  {
    id: "creative-club",
    title: "Creative Club Session",
    summary: "An inclusive art and craft hour for young people, helpers, and families.",
    startsAt: "2026-08-15T14:00:00+08:00",
    endsAt: "2026-08-15T15:30:00+08:00",
    location: "Sheung Wan Community Studio",
    capacityLabel: "6 volunteers needed",
    eligibleAgeGroups: ["14-15", "16-17", "18-plus"],
  },
  {
    id: "family-wellbeing",
    title: "Family Wellbeing Session",
    summary: "A calm weekend session with games, support, and time for families to connect.",
    startsAt: "2026-08-22T09:30:00+08:00",
    endsAt: "2026-08-22T11:00:00+08:00",
    location: "Kowloon Bay Youth Centre",
    capacityLabel: "10 volunteers needed",
    eligibleAgeGroups: ["14-15", "16-17", "18-plus"],
  },
];
