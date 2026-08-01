/**
 * The site's navigation, in one place, used by both the header and the footer.
 *
 * WARNING — four of these routes do not exist yet. `/who-we-are`,
 * `/what-we-do`, `/news-stories` and `/get-involved/quiz` all 404 today, and so
 * does `/member-portal` in the hero's role picker. They are left in place
 * because removing them was not part of this refactor's brief, but they are now
 * declared here rather than being retyped in four components, so deleting or
 * repointing them is a one-line change.
 *
 * Meanwhile `/stories` and `/events` are real, finished pages that nothing in
 * the navigation points at.
 */
export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Who We Are", href: "/who-we-are" },
  { label: "What We Do", href: "/what-we-do" },
  { label: "Get Involved", href: "/get-involved" },
  { label: "News & Stories", href: "/news-stories" },
];

export const FOOTER_LINKS: readonly NavLink[] = [...NAV_LINKS, { label: "Donate", href: "/donate" }];

export const CONTACT_EMAIL = "jeff@love21foundation.com";
