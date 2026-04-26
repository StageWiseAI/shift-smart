import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "./Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, Truck, HardHat, ClipboardList, FileQuestion,
  Mail, Building2, Hash, ArrowRight, AlertCircle, CheckCircle2,
  Clock, CircleDashed, ChevronRight, Package
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(date: string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function DueBadge({ days }: { days: number }) {
  if (days < 0) return <Badge className="text-[10px] h-5 bg-red-500/10 text-red-600 border-red-400/30">Overdue {Math.abs(days)}d</Badge>;
  if (days === 0) return <Badge className="text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-400/30">Today</Badge>;
  if (days <= 3) return <Badge className="text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-400/30">In {days}d</Badge>;
  return <Badge variant="outline" className="text-[10px] h-5">{fmt(new Date(Date.now() + days * 86400000).toISOString())}</Badge>;
}

// ── Module nav tiles ──────────────────────────────────────────────────────────
const MODULE_TILES = [
  { href: "programme",  icon: CalendarDays, label: "Programme",           color: "bg-blue-500/10 text-blue-600" },
  { href: "materials",  icon: Truck,        label: "Material Handling",    color: "bg-amber-500/10 text-amber-600" },
  { href: "prestart",   icon: HardHat,      label: "Pre-Start Meetings",   color: "bg-orange-500/10 text-orange-600" },
  { href: "meetings",   icon: ClipboardList,label: "Meetings & Minutes",   color: "bg-green-500/10 text-green-600" },
  { href: "rfis",       icon: FileQuestion, label: "RFIs",                 color: "bg-violet-500/10 text-violet-600" },
  { href: "emails",     icon: Mail,         label: "Emails",               color: "bg-sky-500/10 text-sky-600" },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const pid = parseInt(id);

  const { data: project, isLoading: loadingProject } = useQuery<any>({
    queryKey: [`/api/projects/${pid}`],
  });

  // Live data queries
  const { data: rfis = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/rfis`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/rfis`).then(r => r.json()),
  });

  const { data: deliveries = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/deliveries`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/deliveries`).then(r => r.json()),
  });

  const { data: prestarts = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/prestart`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/prestart`).then(r => r.json()),
  });

  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/meetings`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/meetings`).then(r => r.json()),
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today.getTime() + 7 * 86400000);

  // Open + in-review RFIs
  const openRfis = rfis.filter(r => r.status === "open" || r.status === "in_review");

  // Deliveries in the next 7 days (scheduled only)
  const upcomingDeliveries = deliveries
    .filter(d => d.status === "scheduled" && d.delivery_date)
    .filter(d => {
      const dd = new Date(d.delivery_date);
      return dd >= today && dd <= in7;
    })
    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));

  // Today's + upcoming pre-start meetings (draft)
  const upcomingPrestarts = prestarts
    .filter(p => p.status === "draft" && p.meeting_date)
    .filter(p => new Date(p.meeting_date) >= today)
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
    .slice(0, 5);

  // Open meeting actions
  const openActions: { item: string; owner: string; due: string; meetingTitle: string }[] = [];
  for (const m of meetings) {
    let actions: any[] = [];
    try { actions = JSON.parse(m.actions_json ?? "[]"); } catch {}
    for (const a of actions) {
      if (a.status !== "done" && a.item) {
        openActions.push({ item: a.item, owner: a.owner ?? "", due: a.due ?? "", meetingTitle: m.title });
      }
    }
  }
  const upcomingActions = openActions
    .filter(a => a.due)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  if (loadingProject) return <Layout><div className="p-8 text-muted-foreground text-sm">Loading…</div></Layout>;
  if (!project) return <Layout><div className="p-8 text-muted-foreground text-sm">Project not found.</div></Layout>;

  return (
    <Layout projectId={pid} projectName={project.name}>
      <div className="px-6 py-6 space-y-6 max-w-5xl">

        {/* Project header */}
        <div>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
            {project.contractNumber && (
              <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{project.contractNumber}</span>
            )}
            {project.client && (
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{project.client}</span>
            )}
            {project.startDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {fmt(project.startDate)}
                {project.endDate && ` – ${fmt(project.endDate)}`}
              </span>
            )}
          </div>
        </div>

        {/* ── Live summary grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Open RFIs */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-violet-500" />
                  Open RFIs
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground gap-1"
                  onClick={() => navigate(`/projects/${pid}/rfis`)}
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {openRfis.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No open RFIs
                </p>
              ) : (
                <ul className="space-y-2">
                  {openRfis.slice(0, 5).map(r => (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-2 cursor-pointer hover:text-foreground"
                      onClick={() => navigate(`/projects/${pid}/rfis`)}
                    >
                      <span className="text-xs text-foreground/80 leading-snug flex-1 min-w-0 truncate">{r.title}</span>
                      {r.status === "in_review"
                        ? <Badge className="text-[10px] h-5 shrink-0 bg-amber-500/10 text-amber-600 border-amber-400/30 gap-1"><Clock className="h-3 w-3" />In Review</Badge>
                        : <Badge className="text-[10px] h-5 shrink-0 bg-blue-500/10 text-blue-600 border-blue-400/30 gap-1"><CircleDashed className="h-3 w-3" />Open</Badge>
                      }
                    </li>
                  ))}
                  {openRfis.length > 5 && (
                    <li className="text-xs text-muted-foreground">+{openRfis.length - 5} more</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Upcoming deliveries */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-amber-500" />
                  Deliveries — Next 7 Days
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground gap-1"
                  onClick={() => navigate(`/projects/${pid}/materials`)}
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingDeliveries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> No deliveries scheduled this week
                </p>
              ) : (
                <ul className="space-y-2">
                  {upcomingDeliveries.map(d => (
                    <li
                      key={d.id}
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => navigate(`/projects/${pid}/materials`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground/80 truncate">{d.material}</p>
                        {d.supplier && <p className="text-[10px] text-muted-foreground truncate">{d.supplier}</p>}
                      </div>
                      <DueBadge days={daysUntil(d.delivery_date)} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Upcoming pre-starts */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <HardHat className="h-4 w-4 text-orange-500" />
                  Upcoming Pre-Starts
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground gap-1"
                  onClick={() => navigate(`/projects/${pid}/prestart`)}
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingPrestarts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No upcoming pre-start meetings</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingPrestarts.map(p => (
                    <li
                      key={p.id}
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => navigate(`/projects/${pid}/prestart`)}
                    >
                      <p className="text-xs text-foreground/80 flex-1 min-w-0 truncate">{p.title}</p>
                      <DueBadge days={daysUntil(p.meeting_date)} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Open meeting actions */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-green-500" />
                  Open Meeting Actions
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground gap-1"
                  onClick={() => navigate(`/projects/${pid}/meetings`)}
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {openActions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No outstanding actions
                </p>
              ) : (
                <ul className="space-y-2">
                  {upcomingActions.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => navigate(`/projects/${pid}/meetings`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground/80 truncate">{a.item}</p>
                        {a.owner && <p className="text-[10px] text-muted-foreground">{a.owner}</p>}
                      </div>
                      {a.due && <DueBadge days={daysUntil(a.due)} />}
                    </li>
                  ))}
                  {openActions.length > upcomingActions.length && (
                    <li className="text-xs text-muted-foreground">+{openActions.length - upcomingActions.length} more without due dates</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Module nav tiles ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Modules</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MODULE_TILES.map(m => (
              <button
                key={m.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
                onClick={() => navigate(`/projects/${pid}/${m.href}`)}
                data-testid={`tile-module-${m.href}`}
              >
                <div className={`p-1.5 rounded-md shrink-0 ${m.color}`}>
                  <m.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground leading-tight">{m.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
