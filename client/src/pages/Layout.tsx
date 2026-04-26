import { useAuth } from "../App";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, HardHat, Truck, ClipboardList, Users, LogOut, ChevronRight,
  Settings, CalendarDays, Mail, FileQuestion
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const globalNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Admin", icon: <Settings className="h-4 w-4" /> },
];

interface LayoutProps {
  children: React.ReactNode;
  projectId?: number;
  projectName?: string;
  breadcrumb?: string;
}

function SiteLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-label="Site Smart">
      {/* Ground */}
      <rect x="2" y="45" width="44" height="2" rx="1" fill="hsl(38,95%,52%)" opacity="0.4"/>
      {/* High-rise building — tall and narrow on left */}
      <rect x="4" y="10" width="18" height="35" rx="1" fill="hsl(38,95%,52%)"/>
      <rect x="5" y="11" width="16" height="33" rx="0.5" fill="hsl(215,60%,24%)"/>
      {/* Windows row 1 */}
      <rect x="7" y="13" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.95"/>
      <rect x="13" y="13" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.95"/>
      {/* Windows row 2 */}
      <rect x="7" y="18" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.85"/>
      <rect x="13" y="18" width="4" height="3" rx="0.3" fill="white" opacity="0.35"/>
      {/* Windows row 3 */}
      <rect x="7" y="23" width="4" height="3" rx="0.3" fill="white" opacity="0.35"/>
      <rect x="13" y="23" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.85"/>
      {/* Windows row 4 */}
      <rect x="7" y="28" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.7"/>
      <rect x="13" y="28" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.7"/>
      {/* Windows row 5 */}
      <rect x="7" y="33" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.55"/>
      <rect x="13" y="33" width="4" height="3" rx="0.3" fill="white" opacity="0.3"/>
      {/* Door */}
      <rect x="10" y="40" width="4" height="4" rx="0.3" fill="hsl(215,60%,18%)"/>
      {/* Tower crane mast — tall column on right */}
      <rect x="33" y="5" width="4" height="40" rx="0.5" fill="hsl(38,95%,52%)"/>
      {/* Crane jib — long arm sweeping left over building */}
      <rect x="10" y="5" width="27" height="3" rx="0.5" fill="hsl(38,95%,52%)"/>
      {/* Crane counter-jib — shorter arm right */}
      <rect x="37" y="5" width="8" height="3" rx="0.5" fill="hsl(38,80%,42%)"/>
      {/* Crane cab */}
      <rect x="30" y="3" width="8" height="6" rx="0.5" fill="hsl(38,70%,36%)"/>
      {/* Hoist rope down from jib */}
      <line x1="16" y1="8" x2="16" y2="18" stroke="white" strokeWidth="1.2" opacity="0.9"/>
      {/* Hook */}
      <rect x="14" y="17" width="4" height="3" rx="0.5" fill="white" opacity="0.8"/>
      {/* Mast brace diagonals */}
      <line x1="35" y1="12" x2="24" y2="8" stroke="hsl(38,95%,52%)" strokeWidth="1" opacity="0.55"/>
      <line x1="35" y1="12" x2="44" y2="8" stroke="hsl(38,95%,52%)" strokeWidth="1" opacity="0.55"/>
    </svg>
  );
}

export default function Layout({ children, projectId, projectName, breadcrumb }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const projectNav: NavItem[] = projectId ? [
    { href: `/projects/${projectId}`, label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    { href: `/projects/${projectId}/programme`, label: "Programme", icon: <CalendarDays className="h-4 w-4" /> },
    { href: `/projects/${projectId}/materials`, label: "Materials", icon: <Truck className="h-4 w-4" /> },
    { href: `/projects/${projectId}/prestart`, label: "Pre-Start", icon: <HardHat className="h-4 w-4" /> },
    { href: `/projects/${projectId}/meetings`, label: "Meetings", icon: <ClipboardList className="h-4 w-4" /> },
    { href: `/projects/${projectId}/emails`, label: "Emails", icon: <Mail className="h-4 w-4" /> },
    { href: `/projects/${projectId}/rfis`, label: "RFIs", icon: <FileQuestion className="h-4 w-4" /> },
  ] : [];

  function isActive(href: string, exact?: boolean) {
    const hash = location;
    if (exact) return hash === href || hash === href + "/";
    return hash.startsWith(href);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[hsl(var(--sidebar-border))]">
          <SiteLogo />
          <div>
            <div className="text-sm font-bold text-white leading-none">Site Smart</div>
            <div className="text-[10px] text-white/40 leading-none mt-0.5">powered by TrustShyft™</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {globalNav.map(item => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                isActive(item.href, item.exact)
                  ? "bg-[hsl(var(--sidebar-accent))] text-white font-medium"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
              )}>
                {item.icon}{item.label}
              </a>
            </Link>
          ))}

          {projectId && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Project</p>
                {projectName && <p className="text-xs text-white/60 mt-0.5 leading-tight">{projectName}</p>}
              </div>
              {projectNav.map(item => (
                <Link key={item.href} href={item.href}>
                  <a className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                    isActive(item.href, item.exact)
                      ? "bg-[hsl(var(--sidebar-accent))] text-white font-medium"
                      : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                  )}>
                    {item.icon}{item.label}
                  </a>
                </Link>
              ))}
            </>
          )}

          {user?.role === "admin" && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">System</p>
              </div>
              {adminNav.map(item => (
                <Link key={item.href} href={item.href}>
                  <a className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                    isActive(item.href)
                      ? "bg-[hsl(var(--sidebar-accent))] text-white font-medium"
                      : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                  )}>
                    {item.icon}{item.label}
                  </a>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-[hsl(var(--sidebar-border))] px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[hsl(38,95%,52%)] flex items-center justify-center text-xs font-bold text-[hsl(215,60%,18%)]">
              {user?.name?.[0] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.role === "admin" ? "Administrator" : "Site Manager"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-white/50 hover:text-white hover:bg-[hsl(var(--sidebar-accent))] text-xs"
            onClick={logout}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {breadcrumb && (
          <div className="flex items-center gap-1 px-6 py-3 text-xs text-muted-foreground border-b bg-card">
            <Link href="/"><a className="hover:text-foreground cursor-pointer">Dashboard</a></Link>
            {projectName && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link href={`/projects/${projectId}`}><a className="hover:text-foreground cursor-pointer">{projectName}</a></Link>
              </>
            )}
            {breadcrumb && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{breadcrumb}</span>
              </>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
