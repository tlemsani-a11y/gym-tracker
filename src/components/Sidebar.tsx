"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav-items";

export function Sidebar({ profileName }: { profileName: string }) {
  const pathname = usePathname();
  const initial = profileName.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand">
        <span className="brand-mark"></span>
        <span>Gym Tracker</span>
      </Link>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link key={item.route} href={item.route} className={`sidebar-nav-item ${item.match(pathname) ? "active" : ""}`}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <Link href="/profiles" className="sidebar-profile">
        <span className="profile-chip-avatar">{initial}</span>
        <span className="sidebar-profile-name">{profileName}</span>
      </Link>
    </aside>
  );
}
