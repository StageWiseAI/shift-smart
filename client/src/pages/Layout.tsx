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
      
      <rect x="4" y="43" width="40" height="2" rx="1" fill="hsl(38,95%,52%)" opacity="0.4"/>
      
      <rect x="8" y="14" width="22" height="29" rx="1" fill="hsl(38,95%,52%)"/>
      
      <rect x="9" y="15" width="20" height="27" rx="1" fill="hsl(215,60%,22%)"/>
      
      <rect x="11" y="17" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      <rect x="17" y="17" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      <rect x="23" y="17" width="4" height="3" rx="0.5" fill="white" opacity="0.5"/>
      
      <rect x="11" y="22" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      <rect x="17" y="22" width="4" height="3" rx="0.5" fill="white" opacity="0.5"/>
      <rect x="23" y="22" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      
      <rect x="11" y="27" width="4" height="3" rx="0.5" fill="white" opacity="0.5"/>
      <rect x="17" y="27" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      <rect x="23" y="27" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      
      <rect x="11" y="32" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.7"/>
      <rect x="17" y="32" width="4" height="3" rx="0.5" fill="white" opacity="0.5"/>
      <rect x="23" y="32" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.7"/>
      
      <rect x="16" y="37" width="6" height="6" rx="0.5" fill="hsl(215,60%,18%)"/>
      
      <rect x="35" y="8" width="3" height="35" rx="0.5" fill="hsl(38,95%,52%)"/>
      
      <rect x="10" y="8" width="28" height="2.5" rx="0.5" fill="hsl(38,95%,52%)"/>
      
      <rect x="38" y="8" width="6" height="2.5" rx="0.5" fill="hsl(38,95%,52%)"/>
      
      <rect x="33" y="6" width="7" height="5" rx="0.5" fill="hsl(38,80%,40%)"/>
      
      <line x1="20" y1="10.5" x2="20" y2="20" stroke="white" stroke-width="0.8" opacity="0.7"/>
      
      <path d="M18.5 20 Q18.5 22.5 20 22.5 Q21.5 22.5 21.5 20" stroke="white" stroke-width="0.8" fill="none" opacity="0.7"/>
      
      <rect x="40" y="10" width="3" height="4" rx="0.5" fill="hsl(215,60%,35%)"/>
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
