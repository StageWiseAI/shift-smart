import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "./Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, Truck, HardHat, ClipboardList, FileQuestion,
  Building2, Hash, CheckCircle2, Clock, CircleDashed,
  ChevronRight, Package, AlertTriangle, Eye
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const TZ = "Australia/Brisbane";

function fmt(date: string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

function fmtShort(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: TZ });
}

/** Returns a Date object representing midnight Brisbane time (as a UTC ms value). */
function brisbaneMidnight(): Date {
  const now = new Date();
  const brisbaneStr = now.toLocaleDateString("en-AU", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  // en-AU returns dd/mm/yyyy
  const [dd, mm, yyyy] = brisbaneStr.split("/");
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00+10:00`);
}

function daysUntil(date: string) {
  const today = brisbaneMidnight();
  // date is YYYY-MM-DD from programme; treat as Brisbane midnight
  const d = new Date(`${date}T00:00:00+10:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function DueBadge({ days }: { days: number }) {
  if (days < 0) return <Badge className="text-[10px] h-5 shrink-0 bg-red-500/10 text-red-600 border-red-400/30">Overdue {Math.abs(days)}d</Badge>;
  if (days === 0) return <Badge className="text-[10px] h-5 shrink-0 bg-amber-500/10 text-amber-600 border-amber-400/30">Today</Badge>;
  if (days <= 3) return <Badge className="text-[10px] h-5 shrink-0 bg-amber-500/10 text-amber-600 border-amber-400/30">In {days}d</Badge>;
  return <Badge variant="outline" className="text-[10px] h-5 shrink-0">{fmt(new Date(Date.now() + days * 86400000).toISOString())}</Badge>;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const pid = parseInt(id);

  const { data: project, isLoading: loadingProject } = useQuery<any>({
    queryKey: [`/api/projects/${pid}`],
  });

  // Live data queries — staleTime so navigating back doesn't re-fetch
  const STALE = 5 * 60 * 1000; // 5 min
  const { data: rfis = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/rfis`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/rfis`),
    staleTime: STALE,
  });

  const { data: deliveries = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/deliveries`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/deliveries`),
    staleTime: STALE,
  });

  const { data: prestarts = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/prestart`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/prestart`),
    staleTime: STALE,
  });

  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/meetings`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/meetings`),
    staleTime: STALE,
  });

  // Programme — long staleTime so tasks don’t reload on every navigation
  const { data: programmes = [], isLoading: progsLoading } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/programmes`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/programmes`),
    staleTime: STALE,
  });

  const latestProg = programmes[0] ?? null;

  const { data: taskData, isLoading: tasksLoading } = useQuery<{ tasks: any[]; cycleDetectedDays: number | null }>({
    queryKey: [`/api/projects/${pid}/programmes/${latestProg?.id}/tasks`],
    queryFn: () => apiRequest("GET", `/api/projects/${pid}/programmes/${latestProg.id}/tasks`),
    enabled: !!latestProg?.id,
    staleTime: STALE,
  });

  const allTasks = taskData?.tasks ?? [];

  // ── Derived data ──────────────────────────────────────────────────────────
  const today = brisbaneMidnight();
  const in7 = new Date(today.getTime() + 7 * 86400000);
  const in30 = new Date(today.getTime() + 30 * 86400000);

  // Programme health — Critical tasks (not complete, upcoming in next 30 days)
  const criticalTasks = allTasks
    .filter(t => t.isCritical && !t.isSummary && t.finish && (t.percentComplete ?? 0) < 100)
    .filter(t => {
      const f = new Date(t.finish);
      return f >= today && f <= in30;
    })
    .sort((a, b) => a.finish.localeCompare(b.finish))
    .slice(0, 6);

  // Monitor tasks — non-critical, non-summary, upcoming finish in next 14 days, <100% complete
  const monitorTasks = allTasks
    .filter(t => !t.isCritical && !t.isSummary && !t.isMilestone && t.finish && (t.percentComplete ?? 0) < 100)
    .filter(t => {
      const f = new Date(t.finish);
      return f >= today && f <= new Date(today.getTime() + 14 * 86400000);
    })
    .sort((a, b) => a.finish.localeCompare(b.finish))
    .slice(0, 5);

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

  // Upcoming pre-start meetings
  const upcomingPrestarts = prestarts
    .filter(p => p.meeting_date && new Date(p.meeting_date) >= today)
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

  // Show programme health card while loading OR if a programme exists
  const hasProgramme = !!latestProg || progsLoading;

  return (
    <Layout projectId={pid} projectName={project.name}>
      <div className="px-4 py-4 md:px-6 md:py-6 space-y-5 max-w-5xl">

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

        {/* ── Programme Health (Critical + Monitor) — full width ── */}
        {(hasProgramme || tasksLoading) && (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  Programme Health
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground gap-1"
                  onClick={() => navigate(`/projects/${pid}/programme`)}
                >
                  Open programme <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {tasksLoading ? (
                <div className="space-y-2 py-1">
                  {[1,2,3].map(i => <div key={i} className="h-5 bg-muted rounded animate-pulse" />)}
                </div>
              ) : criticalTasks.length === 0 && monitorTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No critical or monitor items due in the next 30 days
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                  {/* Critical */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-red-600 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3" /> Critical — next 30 days
                    </p>
                    {criticalTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No critical tasks due
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {criticalTasks.map(t => (
                          <li
                            key={t.uid}
                            className="flex items-start justify-between gap-2 cursor-pointer"
                            onClick={() => navigate(`/projects/${pid}/programme`)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground/80 truncate leading-snug">{t.name}</p>
                              {t.percentComplete != null && t.percentComplete > 0 && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${t.percentComplete}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">{t.percentComplete}%</span>
                                </div>
                              )}
                            </div>
                            <Badge className="text-[10px] h-5 shrink-0 bg-red-500/10 text-red-600 border-red-400/30 whitespace-nowrap">
                              {fmtShort(t.finish)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Monitor */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1.5">
                      <Eye className="h-3 w-3" /> Monitor — next 14 days
                    </p>
                    {monitorTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No tasks to monitor
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {monitorTasks.map(t => (
                          <li
                            key={t.uid}
                            className="flex items-start justify-between gap-2 cursor-pointer"
                            onClick={() => navigate(`/projects/${pid}/programme`)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground/80 truncate leading-snug">{t.name}</p>
                              {t.percentComplete != null && t.percentComplete > 0 && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${t.percentComplete}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">{t.percentComplete}%</span>
                                </div>
                              )}
                            </div>
                            <Badge className="text-[10px] h-5 shrink-0 bg-amber-500/10 text-amber-600 border-amber-400/30 whitespace-nowrap">
                              {fmtShort(t.finish)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── 2-col grid: Pre-starts + Deliveries ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Upcoming pre-starts — FIRST */}
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

          {/* Open RFIs — LAST */}
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
                      className="flex items-start justify-between gap-2 cursor-pointer"
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

        </div>
      </div>
    </Layout>
  );
}
