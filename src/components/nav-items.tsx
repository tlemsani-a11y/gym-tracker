export type NavItem = {
  route: string;
  label: string;
  match: (pathname: string) => boolean;
  icon: React.ReactNode;
};

export const NAV_ITEMS: NavItem[] = [
  {
    route: "/",
    label: "Dashboard",
    match: (p) => p === "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"></rect>
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"></rect>
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"></rect>
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"></rect>
      </svg>
    ),
  },
  {
    route: "/programs",
    label: "Programs",
    match: (p) => p.startsWith("/programs") || p.startsWith("/session"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5"></rect>
        <line x1="8" y1="3.5" x2="8" y2="20.5"></line>
        <line x1="3.5" y1="9" x2="20.5" y2="9"></line>
      </svg>
    ),
  },
  {
    route: "/stats",
    label: "Stats",
    match: (p) => p === "/stats",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="20" x2="5" y2="13"></line>
        <line x1="12" y1="20" x2="12" y2="8"></line>
        <line x1="19" y1="20" x2="19" y2="4"></line>
      </svg>
    ),
  },
  {
    route: "/plates",
    label: "Plate calculator",
    match: (p) => p === "/plates",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8"></circle>
        <circle cx="12" cy="12" r="2.75"></circle>
      </svg>
    ),
  },
  {
    route: "/history",
    label: "History",
    match: (p) => p === "/history",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5"></circle>
        <polyline points="12 7.5 12 12 15.5 14"></polyline>
      </svg>
    ),
  },
];
