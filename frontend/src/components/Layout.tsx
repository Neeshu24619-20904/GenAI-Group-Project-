import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  ClipboardList,
  Sliders,
  BarChart2,
  Search,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Playground", icon: Home, exact: true },
  { to: "/queue", label: "Review Queue", icon: ClipboardList, exact: false },
  { to: "/policy", label: "Policy Config", icon: Sliders, exact: false },
  { to: "/analytics", label: "Analytics", icon: BarChart2, exact: false },
  { to: "/decisions", label: "Audit Log", icon: Search, exact: false },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen w-full bg-gray-50 text-gray-900">
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col bg-gray-900 text-gray-300 transition-all md:w-60">
        <div className="flex h-16 items-center gap-2 px-3 md:px-5">
          <ShieldCheck className="h-7 w-7 shrink-0 text-indigo-500" />
          <span className="hidden text-sm font-bold leading-tight text-white md:block">
            Content
            <br />
            Moderation
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-5 py-4 text-xs text-gray-600 md:block">
          AI Moderation Pipeline
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
