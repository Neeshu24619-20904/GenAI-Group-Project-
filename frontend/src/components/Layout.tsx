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
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-950">
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-white/10 bg-slate-950 text-slate-300 shadow-2xl shadow-slate-950/10 transition-all md:w-64">
        <div className="flex h-20 items-center gap-3 px-3 md:px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-300/20">
            <ShieldCheck className="h-6 w-6 shrink-0 text-cyan-300" />
          </div>
          <div className="hidden md:block">
            <span className="block text-sm font-semibold leading-tight text-white">
              Content Moderation
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              AI review console
            </span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 px-2 py-2">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? "text-cyan-600" : ""
                  }`}
                />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-5 py-5 text-xs leading-5 text-slate-500 md:block">
          Confidence routing, policy checks, and human review in one workspace.
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28rem),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
        {children}
      </main>
    </div>
  );
}
