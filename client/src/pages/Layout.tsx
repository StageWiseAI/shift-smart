import { useState } from "react";
import { useAuth } from "../App";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, HardHat, Truck, ClipboardList, LogOut, ChevronRight,
  Settings, CalendarDays, Mail, FileQuestion, Menu, X
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
      <rect x="2" y="45" width="44" height="2" rx="1" fill="hsl(38,95%,52%)" opacity="0.4"/>
      <rect x="4" y="10" width="18" height="35" rx="1" fill="hsl(38,95%,52%)"/>
      <rect x="5" y="11" width="16" height="33" rx="0.5" fill="hsl(215,60%,24%)"/>
      <rect x="7" y="13" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.95"/>
      <rect x="13" y="13" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.95"/>
      <rect x="7" y="18" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.85"/>
      <rect x="13" y="18" width="4" height="3" rx="0.3" fill="white" opacity="0.35"/>
      <rect x="7" y="23" width="4" height="3" rx="0.3" fill="white" opacity="0.35"/>
      <rect x="13" y="23" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.85"/>
      <rect x="7" y="28" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.7"/>
      <rect x="13" y="28" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.7"/>
      <rect x="7" y="33" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.55"/>
      <rect x="13" y="33" width="4" height="3" rx="0.3" fill="white" opacity="0.3"/>
      <rect x="10" y="40" width="4" height="4" rx="0.3" fill="hsl(215,60%,18%)"/>
      <rect x="33" y="5" width="4" height="40" rx="0.5" fill="hsl(38,95%,52%)"/>
      <rect x="10" y="5" width="27" height="3" rx="0.5" fill="hsl(38,95%,52%)"/>
      <rect x="37" y="5" width="8" height="3" rx="0.5" fill="hsl(38,80%,42%)"/>
      <rect x="30" y="3" width="8" height="6" rx="0.5" fill="hsl(38,70%,36%)"/>
      <line x1="16" y1="8" x2="16" y2="18" stroke="white" strokeWidth="1.2" opacity="0.9"/>
      <rect x="14" y="17" width="4" height="3" rx="0.5" fill="white" opacity="0.8"/>
      <line x1="35" y1="12" x2="24" y2="8" stroke="hsl(38,95%,52%)" strokeWidth="1" opacity="0.55"/>
      <line x1="35" y1="12" x2="44" y2="8" stroke="hsl(38,95%,52%)" strokeWidth="1" opacity="0.55"/>
    </svg>
  );
}

export default function Layout({ children, projectId, projectName, breadcrumb }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const closeSidebar = () => setSidebarOpen(false);

  const navLinkClass = (href: string, exact?: boolean) => cn(
    "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer",
    isActive(href, exact)
      ? "bg-[hsl(var(--sidebar-accent))] text-white font-medium"
      : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
  );

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-2.5">
          <SiteLogo />
          <div>
            <div className="text-sm font-bold text-white leading-none">Site Smart</div>
            <div className="text-[10px] text-white/40 leading-none mt-0.5">powered by TrustShyft™</div>
          </div>
        </div>
        <button
          className="lg:hidden p-1.5 rounded text-white/50 hover:text-white"
          onClick={closeSidebar}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {globalNav.map(item => (
          <Link key={item.href} href={item.href}>
            <a onClick={closeSidebar} className={navLinkClass(item.href, item.exact)}>
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
                <a onClick={closeSidebar} className={navLinkClass(item.href, item.exact)}>
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
                <a onClick={closeSidebar} className={navLinkClass(item.href)}>
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
          variant="ghost" size="sm"
          className="w-full justify-start gap-2 text-white/50 hover:text-white hover:bg-[hsl(var(--sidebar-accent))] text-xs"
          onClick={logout}
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — slide-over on mobile/tablet, static on desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col",
        "bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]",
        "transition-transform duration-300 ease-in-out",
        "lg:static lg:w-56 lg:translate-x-0 lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarInner />
      </aside>

      {/* Page area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile/tablet top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <SiteLogo />
            <span className="text-sm font-bold text-white">Site Smart</span>
          </div>
          {breadcrumb && (
            <span className="ml-auto text-xs text-white/50 truncate max-w-[120px]">{breadcrumb}</span>
          )}
        </header>

        {/* Breadcrumb — desktop only */}
        {breadcrumb && (
          <div className="hidden lg:flex items-center gap-1 px-6 py-3 text-xs text-muted-foreground border-b bg-card shrink-0">
            <Link href="/"><a className="hover:text-foreground cursor-pointer">Dashboard</a></Link>
            {projectName && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link href={`/projects/${projectId}`}><a className="hover:text-foreground cursor-pointer">{projectName}</a></Link>
              </>
            )}
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{breadcrumb}</span>
            </>
          </div>
        )}

        {/* Mobile breadcrumb — compact under topbar */}
        {breadcrumb && projectName && (
          <div className="lg:hidden flex items-center gap-1 px-4 py-2 text-xs text-muted-foreground border-b bg-card shrink-0">
            <Link href="/"><a className="hover:text-foreground cursor-pointer">Dashboard</a></Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/projects/${projectId}`}><a className="hover:text-foreground cursor-pointer truncate max-w-[120px]">{projectName}</a></Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium truncate">{breadcrumb}</span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
