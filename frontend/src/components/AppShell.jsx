import { NavLink, useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { LayoutDashboard, ClipboardList, Plus, Users, Wallet, UsersRound, CreditCard, Building2, Crown } from "lucide-react";
import { useMe } from "@/lib/me";
import { Logo } from "@/pages/AuthLayout";

const OWNER_NAV = [
  { to: "/app", end: true, label: "Panel", icon: LayoutDashboard, id: "dashboard" },
  { to: "/app/isler", label: "İşler", icon: ClipboardList, id: "jobs" },
  { to: "/app/musteriler", label: "Müşteriler", icon: Users, id: "customers" },
  { to: "/app/tahsilat", label: "Tahsilat", icon: Wallet, id: "receivables" },
  { to: "/app/ekip", label: "Ekip", icon: UsersRound, id: "team" },
  { to: "/app/abonelik", label: "Abonelik", icon: CreditCard, id: "billing" },
  { to: "/app/firma", label: "Firma", icon: Building2, id: "company" },
];
const STAFF_NAV = [
  { to: "/app", end: true, label: "Bugün", icon: LayoutDashboard, id: "dashboard" },
  { to: "/app/isler", label: "İşlerim", icon: ClipboardList, id: "jobs" },
];

function Sidebar({ items }) {
  const me = useMe();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 p-5 md:flex">
      <Logo light />
      <p className="mt-6 truncate text-xs font-bold uppercase tracking-wider text-slate-400" data-testid="sidebar-company-name">{me.company.name}</p>
      <nav className="mt-3 flex flex-col gap-1">
        {items.map((n) => (
          <NavLink key={n.id} to={n.to} end={n.end} data-testid={`sidebar-${n.id}`}
            className={({ isActive }) => `tap flex h-12 items-center gap-3 rounded-xl px-4 font-semibold ${isActive ? "bg-yellow-400 text-slate-900" : "text-slate-200 hover:bg-slate-800"}`}>
            <n.icon className="h-5 w-5" /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-xl bg-slate-800 p-3">
        <UserButton />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{me.name || me.email}</p>
          <p className="text-xs text-slate-400">{me.owner ? "Yönetici" : "Saha personeli"}{me.company.plan === "pro" && " · Pro"}</p>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ owner }) {
  const navigate = useNavigate();
  const items = owner
    ? [OWNER_NAV[0], OWNER_NAV[1], null, OWNER_NAV[2], OWNER_NAV[3]]
    : [STAFF_NAV[0], STAFF_NAV[1]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-slate-900 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" data-testid="bottom-nav">
      <div className="flex h-[68px] items-stretch">
        {items.map((n, i) =>
          n ? (
            <NavLink key={n.id} to={n.to} end={n.end} data-testid={`bottom-nav-${n.id}`}
              className={({ isActive }) => `tap flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${isActive ? "text-blue-700" : "text-slate-600"}`}>
              {({ isActive }) => (<><span className={`grid h-8 w-12 place-items-center rounded-full ${isActive ? "bg-blue-100" : ""}`}><n.icon className="h-5 w-5" strokeWidth={2.4} /></span>{n.label}</>)}
            </NavLink>
          ) : (
            <div key={i} className="flex flex-1 items-center justify-center">
              <button onClick={() => navigate("/app/isler/yeni")} data-testid="bottom-nav-new-job" aria-label="Yeni iş"
                className="tap -mt-7 grid h-16 w-16 place-items-center rounded-2xl bg-yellow-400 text-slate-900 shadow-lg ring-4 ring-white">
                <Plus className="h-8 w-8" strokeWidth={3} />
              </button>
            </div>
          )
        )}
      </div>
    </nav>
  );
}

function MobileTop() {
  const me = useMe();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl md:hidden">
      <Logo />
      <div className="flex items-center gap-3">
        {me.owner && (
          <NavLink to="/app/ekip" data-testid="mobile-top-team" className="tap grid h-10 w-10 place-items-center rounded-xl border border-slate-300"><UsersRound className="h-5 w-5" /></NavLink>
        )}
        {me.owner && (
          <NavLink to="/app/abonelik" data-testid="mobile-top-billing" className="tap grid h-10 w-10 place-items-center rounded-xl border border-slate-300">
            <Crown className={`h-5 w-5 ${me.company.plan === "pro" ? "text-yellow-500" : ""}`} />
          </NavLink>
        )}
        {me.owner && (
          <NavLink to="/app/firma" data-testid="mobile-top-company" className="tap grid h-10 w-10 place-items-center rounded-xl border border-slate-300"><Building2 className="h-5 w-5" /></NavLink>
        )}
        <UserButton />
      </div>
    </header>
  );
}

export default function AppShell({ children }) {
  const me = useMe();
  return (
    <div className="min-h-screen">
      <Sidebar items={me.owner ? OWNER_NAV : STAFF_NAV} />
      <MobileTop />
      <main className="pb-safe md:pb-10 md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">{children}</div>
      </main>
      <BottomNav owner={me.owner} />
    </div>
  );
}
