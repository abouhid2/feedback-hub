"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/batch-reviews", label: "Batch Reviews" },
  { href: "/notifications", label: "Notifications" },
  { href: "/metrics", label: "Metrics" },
  { href: "/dead-letters", label: "Dead Letters" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar border-r">
      <div className="sidebar-header py-6">
        <h1 className="text-3xl font-bold text-white">Feedback Hub</h1>
      </div>

      <nav className="p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Navigation</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={pathname === item.href ? "nav-link-active" : "nav-link"}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
