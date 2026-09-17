import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", label: "Opportunity Map", end: true },
  { to: "/finder", label: "Opportunity Finder" },
  { to: "/explorer", label: "Market Explorer" },
  { to: "/validator", label: "Concept Validator" },
  { to: "/team", label: "Team Profile" },
];

export function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-edge bg-panel/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-[1400px] px-5 h-14 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-ink font-semibold tracking-tight">
              Steam Opportunity Finder
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted border border-edge rounded px-1.5 py-0.5">
              v0.1
            </span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? "bg-panel2 text-ink"
                      : "text-muted hover:text-ink hover:bg-panel2/50"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-5 py-5">
        <Outlet />
      </main>
    </div>
  );
}
