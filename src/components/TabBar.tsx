"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav-items";

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tab-bar" id="tab-bar">
      {NAV_ITEMS.map((item) => (
        <Link key={item.route} href={item.route} className={`tab-item ${item.match(pathname) ? "active" : ""}`}>
          {item.icon}
          <span>{item.label === "Plate calculator" ? "Plates" : item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
