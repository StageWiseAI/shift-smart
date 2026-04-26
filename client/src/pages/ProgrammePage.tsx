import { useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "./Layout";
import { useAuth } from "../App";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Upload, CloudRain, RefreshCw, Eye, AlertTriangle, CheckCircle2,
  Loader2, Printer, Calendar, ChevronRight, ArrowRight, TrendingDown, TrendingUp,
  Search, X, Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface Task {
  uid: string;
  name: string;
  start?: string;
  finish?: string;
  percentComplete?: number;
  isMilestone?: boolean;
  isSummary?: boolean;
  outlineLevel?: number;
  isCritical?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function daysBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function weekLabel(weekStart: Date) {
  const end = new Date(weekStart.getTime() + 6 * 86400000);
  return `Week of ${weekStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
}

// ── Plain task table row ─────────────────────────────────────────────────────
function TaskRow({ task, depth, onEdit }: { task: Task; depth: number; onEdit?: (t: Task) => void }) {
  return (
    <tr className={cn(
      "border-b border-border/40 hover:bg-muted/20 transition-colors group",
      task.isSummary && "bg-muted/30 font-medium",
      task.isMilestone && "bg-amber-50/60 dark:bg-amber-950/20",
    )}>
      <td className="py-1.5 px-3 text-sm" style={{ paddingLeft: `${12 + (depth) * 16}px` }}>
        <div className="flex items-center gap-1.5">
          {task.isMilestone && <div className="w-2 h-2 rotate-45 bg-amber-500 flex-shrink-0" />}
          {task.isSummary && !task.isMilestone && <div className="w-2 h-2 rounded-sm bg-primary flex-shrink-0" />}
          <span className="leading-tight">{task.name}</span>
          {task.isCritical && <Badge className="text-[9px] px-1 py-0 h-3.5 bg-red-500/15 text-red-600 border-red-300 ml-1">Critical</Badge>}
        </div>
      </td>
      <td className="py-1.5 px-3 text-sm text-muted-foreground whitespace-nowrap">{fmtDate(task.start)}</td>
      <td className="py-1.5 px-3 text-sm text-muted-foreground whitespace-nowrap">{fmtDate(task.finish)}</td>
      <td className="py-1.5 px-3 text-sm text-muted-foreground">
        {task.percentComplete != null && task.percentComplete > 0
          ? <div className="flex items-center gap-1.5"><div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${task.percentComplete}%` }} /></div><span className="text-xs">{task.percentComplete}%</span></div>
          : null}
      </td>
      <td className="py-1.5 px-3">
        {task.isMilestone && <Badge variant="outline" className="text-[10px] h-4 text-amber-600 border-amber-300">Milestone</Badge>}
        {task.isSummary && !task.isMilestone && <Badge variant="outline" className="text-[10px] h-4">Summary</Badge>}
      </td>
      <td className="py-1.5 px-2 w-8">
        {onEdit && (
          <button
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
            onClick={() => onEdit(task)}
            title="Edit dates"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Look-ahead view ──────────────────────────────────────────────────────────
// Groups tasks by calendar week, shows section label
function LookaheadView({
  tasks,
  fromDate,
  weeks,
  section,
}: {
  tasks: Task[];
  fromDate: string;
  weeks: number;
  section?: string;
}) {
  const from = new Date(fromDate);
  // Build week buckets
  const buckets: { label: string; start: Date; tasks: Task[] }[] = [];
  for (let w = 0; w < weeks; w++) {
    const wStart = addDays(from, w * 7);
    const wEnd = addDays(wStart, 6);
    buckets.push({
      label: weekLabel(wStart),
      start: wStart,
      tasks: tasks.filter(t => {
        if (!t.start) return false;
        const s = new Date(t.start);
        return s >= wStart && s <= wEnd;
      }),
    });
  }

  const totalTaskCount = tasks.length;

  return (
    <div className="mt-4 space-y-1">
      {/* Header bar */}
      <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{weeks}-Week Look-ahead</strong>
            {section && <> · Section: <strong>{section}</strong></>}
            {" "}· From <strong>{fmtDate(fromDate)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-amber-700 dark:text-amber-300">{totalTaskCount} task{totalTaskCount !== 1 ? "s" : ""} in window</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => window.print()}
          >
            <Printer className="h-3 w-3" /> Print
          </Button>
        </div>
      </div>

      {totalTaskCount === 0 ? (
        <div className="text-center py-14 text-muted-foreground border-2 border-dashed rounded-lg">
          <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No tasks fall in this look-ahead window</p>
          <p className="text-xs mt-1 opacity-60">Try a broader window or change the From date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {buckets.map((bucket, bi) => (
            <div key={bi} className="border rounded-lg overflow-hidden">
              {/* Week header */}
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">{bucket.label}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {bucket.tasks.length} task{bucket.tasks.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              {bucket.tasks.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground italic">No tasks starting this week</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Activity</th>
                      <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Start</th>
                      <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Finish</th>
                      <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Progress</th>
                      <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bucket.tasks.map(t => (
                      <tr key={t.uid} className={cn(
                        "border-b border-border/30 last:border-0",
                        t.isSummary && "bg-muted/20 font-medium",
                        t.isMilestone && "bg-amber-50/60 dark:bg-amber-950/20",
                      )}>
                        <td className="py-2 px-3 text-sm" style={{ paddingLeft: `${12 + ((t.outlineLevel ?? 1) - 1) * 14}px` }}>
                          <div className="flex items-center gap-1.5">
                            {t.isMilestone && <div className="w-2 h-2 rotate-45 bg-amber-500 flex-shrink-0" />}
                            <span>{t.name}</span>
                            {t.isCritical && <Badge className="text-[9px] px-1 py-0 h-3.5 bg-red-500/15 text-red-600 border-red-300">Crit</Badge>}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-sm text-muted-foreground whitespace-nowrap">{fmtShort(t.start)}</td>
                        <td className="py-2 px-3 text-sm text-muted-foreground whitespace-nowrap">{fmtShort(t.finish)}</td>
                        <td className="py-2 px-3">
                          {t.percentComplete != null && t.percentComplete > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${t.percentComplete}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{t.percentComplete}%</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2 px-3">
                          {t.isMilestone && <Badge variant="outline" className="text-[10px] h-4 text-amber-600 border-amber-300">Milestone</Badge>}
                          {t.isSummary && !t.isMilestone && <Badge variant="outline" className="text-[10px] h-4">Summary</Badge>}
                          {!t.isMilestone && !t.isSummary && <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">Activity</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Cycle Overlay view ───────────────────────────────────────────────────────
// Shows contract (baseline) alongside target (cycle-adjusted) — side by side
function CycleOverlayView({
  baselineTasks,
  targetTasks,
  originalCycleDays,
  newCycleDays,
}: {
  baselineTasks: Task[];
  targetTasks: Task[];
  originalCycleDays: number;
  newCycleDays: number;
}) {
  // Build a merged view matching tasks by uid
  const merged = baselineTasks.map(bt => ({
    bt,
    tt: targetTasks.find(t => t.uid === bt.uid),
  }));

  const isAccelerated = newCycleDays < originalCycleDays;
  const changedCount = merged.filter(({ bt, tt }) => {
    if (!tt) return false;
    return bt.start !== tt.start || bt.finish !== tt.finish;
  }).length;

  return (
    <div className="mt-4 space-y-3">
      {/* Summary banner */}
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border text-sm",
        isAccelerated
          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
          : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
      )}>
        <RefreshCw className="h-4 w-4 flex-shrink-0" />
        <div>
          <span className="font-semibold">Acceleration Overlay:</span>{" "}
          Contract programme ({originalCycleDays}-day cycle) vs Target programme ({newCycleDays}-day cycle)
          {isAccelerated
            ? <span className="ml-1">— programme <strong>accelerated</strong> by {Math.round((1 - newCycleDays / originalCycleDays) * 100)}%</span>
            : <span className="ml-1">— programme <strong>extended</strong></span>}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          {isAccelerated ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          <span>{changedCount} tasks shifted</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-muted/60 border" /> Contract (baseline)</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/40" /> Target (adjusted)</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-400" /> Earlier finish</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-400" /> Later finish</div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[200px]">Activity</th>
              {/* Contract columns */}
              <th className="py-2 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/20" colSpan={2}>
                Contract ({originalCycleDays}-day)
              </th>
              {/* Arrow */}
              <th className="py-1 px-1 w-6" />
              {/* Target columns */}
              <th className="py-2 px-3 text-center text-[10px] font-semibold text-primary/80 uppercase tracking-wide bg-primary/5" colSpan={2}>
                Target ({newCycleDays}-day)
              </th>
              <th className="py-2 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Diff</th>
            </tr>
            <tr className="border-t border-border/30">
              <th className="py-1 px-3" />
              <th className="py-1 px-3 text-left text-[10px] text-muted-foreground font-normal bg-muted/20 whitespace-nowrap">Start</th>
              <th className="py-1 px-3 text-left text-[10px] text-muted-foreground font-normal bg-muted/20 whitespace-nowrap">Finish</th>
              <th className="py-1 px-1 bg-muted/10" />
              <th className="py-1 px-3 text-left text-[10px] text-primary/70 font-normal bg-primary/5 whitespace-nowrap">Start</th>
              <th className="py-1 px-3 text-left text-[10px] text-primary/70 font-normal bg-primary/5 whitespace-nowrap">Finish</th>
              <th className="py-1 px-3 text-center text-[10px] text-muted-foreground font-normal whitespace-nowrap">days</th>
            </tr>
          </thead>
          <tbody>
            {merged.map(({ bt, tt }, i) => {
              const diff = daysBetween(tt?.finish, bt?.finish); // positive = target is earlier (good)
              const hasChange = tt && (bt.start !== tt.start || bt.finish !== tt.finish);
              return (
                <tr
                  key={bt.uid}
                  className={cn(
                    "border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors",
                    bt.isSummary && "font-medium",
                    bt.isMilestone && "bg-amber-50/40 dark:bg-amber-950/20",
                  )}
                >
                  {/* Activity name */}
                  <td className="py-1.5 px-3 text-sm" style={{ paddingLeft: `${12 + ((bt.outlineLevel ?? 1) - 1) * 14}px` }}>
                    <div className="flex items-center gap-1.5">
                      {bt.isMilestone && <div className="w-2 h-2 rotate-45 bg-amber-500 flex-shrink-0" />}
                      {bt.isSummary && !bt.isMilestone && <div className="w-2 h-2 rounded-sm bg-muted-foreground/50 flex-shrink-0" />}
                      <span className="leading-tight">{bt.name}</span>
                    </div>
                  </td>
                  {/* Contract */}
                  <td className="py-1.5 px-3 text-xs text-muted-foreground whitespace-nowrap bg-muted/10">{fmtShort(bt.start)}</td>
                  <td className="py-1.5 px-3 text-xs text-muted-foreground whitespace-nowrap bg-muted/10">{fmtShort(bt.finish)}</td>
                  {/* Arrow */}
                  <td className="py-1 px-0 text-center">
                    {hasChange && <ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" />}
                  </td>
                  {/* Target */}
                  <td className={cn(
                    "py-1.5 px-3 text-xs whitespace-nowrap",
                    hasChange ? "text-primary font-medium bg-primary/5" : "text-muted-foreground bg-primary/3"
                  )}>{tt ? fmtShort(tt.start) : "—"}</td>
                  <td className={cn(
                    "py-1.5 px-3 text-xs whitespace-nowrap",
                    hasChange ? "text-primary font-medium bg-primary/5" : "text-muted-foreground bg-primary/3"
                  )}>{tt ? fmtShort(tt.finish) : "—"}</td>
                  {/* Diff */}
                  <td className="py-1.5 px-3 text-center">
                    {diff != null && hasChange ? (
                      <span className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded",
                        diff > 0 ? "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40"
                          : diff < 0 ? "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40"
                            : "text-muted-foreground"
                      )}>
                        {diff > 0 ? `-${diff}d` : diff < 0 ? `+${Math.abs(diff)}d` : "±0"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground px-1">
        Diff column: negative days = target is earlier than contract (accelerated). Positive days = target is later.
        Green = programme gains, Red = programme slips.
      </p>
    </div>
  );
}

// ── EOT Result view ──────────────────────────────────────────────────────────
function EOTResultView({
  originalTasks,
  adjustedTasks,
  delayHours,
  appliedFrom,
  description,
}: {
  originalTasks: Task[];
  adjustedTasks: Task[];
  delayHours: number;
  appliedFrom: string;
  description: string;
}) {
  const shiftedCount = adjustedTasks.filter((at, i) => {
    const ot = originalTasks[i];
    return ot && at.start !== ot.start;
  }).length;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <div>
          <span className="font-semibold">Delay logged:</span> {description} — {delayHours}h shift from{" "}
          <strong>{fmtDate(appliedFrom)}</strong>
        </div>
        <span className="ml-auto text-xs">{shiftedCount} tasks pushed out</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-muted/60 border" /> Original date</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-400" /> Shifted date</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-muted/20 border border-border/40" /> Unaffected</div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Activity</th>
              <th className="py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Original Start</th>
              <th className="py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Shifted Start</th>
              <th className="py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Original Finish</th>
              <th className="py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Shifted Finish</th>
              <th className="py-2 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Impact</th>
            </tr>
          </thead>
          <tbody>
            {adjustedTasks.map((at, i) => {
              const ot = originalTasks[i];
              const shifted = ot && at.start !== ot.start;
              return (
                <tr
                  key={at.uid}
                  className={cn(
                    "border-b border-border/30 last:border-0",
                    shifted ? "bg-blue-50/40 dark:bg-blue-950/10" : "",
                    at.isSummary && "font-medium bg-muted/20",
                  )}
                >
                  <td className="py-1.5 px-3 text-sm" style={{ paddingLeft: `${12 + ((at.outlineLevel ?? 1) - 1) * 14}px` }}>
                    <div className="flex items-center gap-1.5">
                      {at.isMilestone && <div className="w-2 h-2 rotate-45 bg-amber-500 flex-shrink-0" />}
                      <span>{at.name}</span>
                    </div>
                  </td>
                  {/* Original dates */}
                  <td className="py-1.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {shifted ? <span className="line-through opacity-50">{fmtShort(ot?.start)}</span> : fmtShort(ot?.start)}
                  </td>
                  {/* Shifted start */}
                  <td className={cn("py-1.5 px-3 text-xs whitespace-nowrap", shifted ? "text-blue-700 dark:text-blue-300 font-medium" : "text-muted-foreground")}>
                    {fmtShort(at.start)}
                  </td>
                  {/* Original finish */}
                  <td className="py-1.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {shifted ? <span className="line-through opacity-50">{fmtShort(ot?.finish)}</span> : fmtShort(ot?.finish)}
                  </td>
                  {/* Shifted finish */}
                  <td className={cn("py-1.5 px-3 text-xs whitespace-nowrap", shifted ? "text-blue-700 dark:text-blue-300 font-medium" : "text-muted-foreground")}>
                    {fmtShort(at.finish)}
                  </td>
                  {/* Impact badge */}
                  <td className="py-1.5 px-3 text-center">
                    {shifted
                      ? <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300">Shifted</Badge>
                      : <span className="text-[10px] text-muted-foreground/40">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProgrammePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const pid = parseInt(id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedProgId, setSelectedProgId] = useState<number | null>(null);
  const [tab, setTab] = useState("tasks");
  const [showEOT, setShowEOT] = useState(false);
  const [showCycle, setShowCycle] = useState(false);
  const [showLookahead, setShowLookahead] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Task date edit
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editDateForm, setEditDateForm] = useState({ newStart: "", newFinish: "" });

  // EOT form
  const [eotForm, setEotForm] = useState({ type: "weather", description: "", delayHours: "8", appliedFrom: "" });
  // Cycle form
  const [cycleForm, setCycleForm] = useState({ newCycleDays: "" });
  // Lookahead form
  const [lookaheadForm, setLookaheadForm] = useState({ weeks: "2", section: "", from: "" });
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadType, setUploadType] = useState("baseline");

  // Results
  const [lookaheadResult, setLookaheadResult] = useState<{ tasks: Task[]; from: string; weeks: number; section?: string } | null>(null);
  const [cycleResult, setCycleResult] = useState<{ baseline: Task[]; target: Task[]; originalCycleDays: number; newCycleDays: number } | null>(null);
  const [eotResult, setEotResult] = useState<{ original: Task[]; adjusted: Task[]; delayHours: number; appliedFrom: string; description: string } | null>(null);

  const { data: project } = useQuery<any>({ queryKey: [`/api/projects/${pid}`] });
  const { data: programmes = [], isLoading: progsLoading } = useQuery<any[]>({ queryKey: [`/api/projects/${pid}/programmes`] });

  const activeProg = selectedProgId ?? (programmes[0]?.id ?? null);

  const { data: taskData, isLoading: tasksLoading } = useQuery<{ tasks: Task[]; cycleDetectedDays: number | null }>({
    queryKey: [`/api/projects/${pid}/programmes/${activeProg}/tasks`],
    enabled: !!activeProg,
  });

  const eotEvents = useQuery<any[]>({ queryKey: [`/api/projects/${pid}/eot`] });

  const tasks = taskData?.tasks ?? [];
  const cycle = taskData?.cycleDetectedDays;

  // ── Upload ───────────────────────────────────────────────────────────────
  const uploadMut = useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest("POST", `/api/projects/${pid}/programmes/upload`, formData),
    onSuccess: (d: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/programmes`] });
      setSelectedProgId(d.id);
      toast({ title: "Programme uploaded", description: `Cycle detected: ${d.cycleDetected ? `${d.cycleDetected} days` : "not detected"}` });
      setUploadLabel("");
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", uploadLabel || file.name);
    formData.append("type", uploadType);
    uploadMut.mutate(formData);
    e.target.value = "";
  }

  // ── EOT ──────────────────────────────────────────────────────────────────
  const eotMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${pid}/eot`, data),
    onSuccess: (d: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/eot`] });
      setEotResult({
        original: tasks,
        adjusted: d.tasks,
        delayHours: parseFloat(eotForm.delayHours),
        appliedFrom: eotForm.appliedFrom,
        description: eotForm.description || eotForm.type,
      });
      setShowEOT(false);
      setTab("eot-result");
      toast({ title: "Delay saved", description: `Programme shifted by ${eotForm.delayHours}h` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleEOT(e: React.FormEvent) {
    e.preventDefault();
    eotMut.mutate({ ...eotForm, programmeId: activeProg, delayHours: parseFloat(eotForm.delayHours) });
  }

  // ── Cycle ─────────────────────────────────────────────────────────────────
  const cycleMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${pid}/programmes/${activeProg}/cycle`, data),
    onSuccess: (d: any) => {
      setCycleResult({
        baseline: tasks,
        target: d.tasks,
        originalCycleDays: d.originalCycleDays,
        newCycleDays: parseFloat(cycleForm.newCycleDays),
      });
      setShowCycle(false);
      setTab("cycle-overlay");
      toast({ title: "Cycle overlay generated", description: `${d.originalCycleDays}-day vs ${cycleForm.newCycleDays}-day comparison ready` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleCycle(e: React.FormEvent) {
    e.preventDefault();
    cycleMut.mutate({ newCycleDays: parseFloat(cycleForm.newCycleDays) });
  }


  // ── Task date edit ───────────────────────────────────────────────────────────
  const taskDateMut = useMutation({
    mutationFn: (data: { uid: string; newStart: string; newFinish?: string }) =>
      apiRequest("PATCH", `/api/projects/${pid}/programmes/${activeProg}/tasks/${encodeURIComponent(data.uid)}`, {
        newStart: data.newStart,
        newFinish: data.newFinish || undefined,
      }).then((r: any) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/programmes/${activeProg}/tasks`] });
      setEditTask(null);
      toast({ title: "Task dates updated", description: "Downstream tasks shifted accordingly" });
    },
    onError: (e: any) => toast({ title: "Error updating task", description: e.message, variant: "destructive" }),
  });

  function handleTaskDateEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTask || !editDateForm.newStart) return;
    taskDateMut.mutate({
      uid: editTask.uid,
      newStart: editDateForm.newStart,
      newFinish: editDateForm.newFinish || undefined,
    });
  }

  function openTaskEdit(task: Task) {
    setEditTask(task);
    setEditDateForm({
      newStart: task.start?.split("T")[0] ?? "",
      newFinish: task.finish?.split("T")[0] ?? "",
    });
  }

  // ── Lookahead ─────────────────────────────────────────────────────────────
  async function handleLookahead(e: React.FormEvent) {
    e.preventDefault();
    try {
      const params = new URLSearchParams({
        weeks: lookaheadForm.weeks,
        ...(lookaheadForm.from && { from: lookaheadForm.from }),
        ...(lookaheadForm.section && { section: lookaheadForm.section }),
      });
      const data = await apiRequest("GET", `/api/projects/${pid}/programmes/${activeProg}/lookahead?${params}`);
      setLookaheadResult({
        tasks: data.tasks,
        from: data.from,
        weeks: parseInt(lookaheadForm.weeks),
        section: lookaheadForm.section || undefined,
      });
      setShowLookahead(false);
      setTab("lookahead");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <Layout projectId={pid} projectName={project?.name} breadcrumb="Programme">
      <div className="px-6 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Programme</h1>
            {cycle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Structural cycle detected: <span className="font-semibold text-foreground">{cycle} days</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {activeProg && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowLookahead(true)}>
                  <Eye className="h-4 w-4 mr-1" /> Look-ahead
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowEOT(true)} title="Record a weather, IR or other delay that pushes the programme out">
                  <CloudRain className="h-4 w-4 mr-1" /> Log a Delay
                </Button>
                {cycle && (
                  <Button size="sm" variant="outline" onClick={() => setShowCycle(true)} title="See the programme side-by-side at a shorter cycle time">
                    <RefreshCw className="h-4 w-4 mr-1" /> Acceleration Overlay
                  </Button>
                )}
              </>
            )}
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>
              {uploadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload Programme
            </Button>
            <input ref={fileRef} type="file" accept=".xml,.mpp" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Programme version selector */}
        {programmes.length > 1 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-muted-foreground">Viewing:</span>
            {programmes.map((p: any) => (
              <Button
                key={p.id}
                size="sm"
                variant={activeProg === p.id ? "default" : "outline"}
                className="text-xs h-7"
                onClick={() => { setSelectedProgId(p.id); setTab("tasks"); }}
              >
                {p.label}
                <Badge variant="outline" className="ml-1 text-[10px] h-4">{p.type}</Badge>
              </Button>
            ))}
          </div>
        )}

        {/* Main content */}
        {progsLoading ? (
          <div className="h-40 bg-muted rounded-lg animate-pulse" />
        ) : programmes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-center">
            <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No programme uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload an MS Project XML or Asta XML file to get started</p>
            <div className="mt-4 flex gap-2">
              <Input placeholder="Label (e.g. Baseline)" className="w-48 h-8 text-xs" value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} />
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Upload
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="eot-log">Delay Log</TabsTrigger>
              {eotResult && <TabsTrigger value="eot-result">Delay Result</TabsTrigger>}
              {cycleResult && <TabsTrigger value="cycle-overlay">Acceleration Overlay</TabsTrigger>}
              {lookaheadResult && <TabsTrigger value="lookahead">Look-ahead</TabsTrigger>}
            </TabsList>

            {/* ── Tasks tab ── */}
            <TabsContent value="tasks">
              {tasksLoading ? (
                <div className="h-40 bg-muted rounded-lg animate-pulse mt-4" />
              ) : (
                <div className="mt-4 space-y-3">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search tasks, milestones, sections…"
                      className="pl-9 pr-9 h-9"
                      data-testid="programme-search"
                    />
                    {search && (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearch("")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="py-2 px-3 text-left font-semibold text-muted-foreground text-xs">Activity</th>
                          <th className="py-2 px-3 text-left font-semibold text-muted-foreground text-xs whitespace-nowrap">Start</th>
                          <th className="py-2 px-3 text-left font-semibold text-muted-foreground text-xs whitespace-nowrap">Finish</th>
                          <th className="py-2 px-3 text-left font-semibold text-muted-foreground text-xs">Progress</th>
                          <th className="py-2 px-3 text-left font-semibold text-muted-foreground text-xs">Type</th>
                          <th className="py-2 px-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filtered = search.trim()
                            ? tasks.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
                            : tasks;
                          if (filtered.length === 0) return (
                            <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                              {search ? `No tasks matching "${search}"` : "No tasks found in programme"}
                            </td></tr>
                          );
                          return filtered.map(t => (
                            <TaskRow key={t.uid} task={t} depth={(t.outlineLevel ?? 1) - 1} onEdit={openTaskEdit} />
                          ));
                        })()}
                      </tbody>
                    </table>
                    <div className="p-3 text-xs text-muted-foreground border-t bg-muted/20 flex items-center gap-3">
                      <span>{tasks.length} tasks</span>
                      <span>·</span>
                      <span>{tasks.filter(t => t.isMilestone).length} milestones</span>
                      <span>·</span>
                      <span>{tasks.filter(t => t.isCritical).length} critical path</span>
                      {search && <span className="ml-auto text-primary font-medium">{tasks.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).length} matching</span>}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Delay Log tab ── */}
            <TabsContent value="eot-log">
              <div className="mt-4 space-y-3">
                {eotEvents.isLoading ? (
                  <div className="h-20 bg-muted rounded-lg animate-pulse" />
                ) : (eotEvents.data ?? []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <CloudRain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No delays recorded yet</p>
                  </div>
                ) : (eotEvents.data ?? []).map((e: any) => (
                  <Card key={e.id}>
                    <CardContent className="py-3 px-4 flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", e.type === "weather" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600")}>
                        <CloudRain className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{e.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.delayHours}h delay from {fmtDate(e.applied_from)} · {e.type === "weather" ? "Weather Event" : "IR Event"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">{e.type === "weather" ? "Weather" : "IR"}</Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── Delay Result tab ── */}
            {eotResult && (
              <TabsContent value="eot-result">
                <EOTResultView
                  originalTasks={eotResult.original}
                  adjustedTasks={eotResult.adjusted}
                  delayHours={eotResult.delayHours}
                  appliedFrom={eotResult.appliedFrom}
                  description={eotResult.description}
                />
              </TabsContent>
            )}

            {/* ── Acceleration Overlay tab ── */}
            {cycleResult && (
              <TabsContent value="cycle-overlay">
                <CycleOverlayView
                  baselineTasks={cycleResult.baseline}
                  targetTasks={cycleResult.target}
                  originalCycleDays={cycleResult.originalCycleDays}
                  newCycleDays={cycleResult.newCycleDays}
                />
              </TabsContent>
            )}

            {/* ── Look-ahead tab ── */}
            {lookaheadResult && (
              <TabsContent value="lookahead">
                <LookaheadView
                  tasks={lookaheadResult.tasks}
                  fromDate={lookaheadResult.from}
                  weeks={lookaheadResult.weeks}
                  section={lookaheadResult.section}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {/* Upload revision strip */}
      {programmes.length > 0 && (
        <div className="px-6 pb-4">
          <Separator className="mb-4" />
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Upload new revision:</span>
            <Input placeholder="Label" className="w-40 h-7 text-xs" value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} />
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline">Baseline</SelectItem>
                <SelectItem value="revision">Revision</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>
              <Upload className="h-3 w-3 mr-1" /> Upload
            </Button>
          </div>
        </div>
      )}

      {/* ── Task Date Edit Dialog ── */}
      <Dialog open={!!editTask} onOpenChange={open => { if (!open) setEditTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Dates</DialogTitle>
          </DialogHeader>
          {editTask && (
            <form onSubmit={handleTaskDateEdit} className="space-y-4 mt-2">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium truncate">{editTask.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current: {fmtDate(editTask.start)} → {fmtDate(editTask.finish)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>New Start Date <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={editDateForm.newStart}
                    onChange={e => setEditDateForm(f => ({ ...f, newStart: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>New Finish Date</Label>
                  <Input
                    type="date"
                    value={editDateForm.newFinish}
                    onChange={e => setEditDateForm(f => ({ ...f, newFinish: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to keep original duration</p>
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                All tasks that follow this task will be shifted by the same number of days to maintain programme sequencing.
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
                <Button type="submit" disabled={taskDateMut.isPending || !editDateForm.newStart}>
                  {taskDateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Update Dates
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── EOT Dialog ── */}
      <Dialog open={showEOT} onOpenChange={setShowEOT}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log a Site Delay</DialogTitle></DialogHeader>
          <form onSubmit={handleEOT} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>What caused the delay?</Label>
              <Select value={eotForm.type} onValueChange={v => setEotForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weather">Bad Weather</SelectItem>
                  <SelectItem value="ir">Industrial Relations (IR)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Brief description</Label>
              <Input value={eotForm.description} onChange={e => setEotForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Rain event — site shutdown 14:00" />
            </div>
            <div className="space-y-1.5">
              <Label>How long was lost?</Label>
              <Select value={eotForm.delayHours} onValueChange={v => setEotForm(f => ({ ...f, delayHours: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Half day (4 hours)</SelectItem>
                  <SelectItem value="8">Full day (8 hours)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Based on an 8-hour working day</p>
            </div>
            <div className="space-y-1.5">
              <Label>From which date did this delay start?</Label>
              <Input type="date" value={eotForm.appliedFrom} onChange={e => setEotForm(f => ({ ...f, appliedFrom: e.target.value }))} required />
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              All tasks from this date onwards will shift by the time lost. You'll see a before/after comparison.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEOT(false)}>Cancel</Button>
              <Button type="submit" disabled={eotMut.isPending}>
                {eotMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Delay
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Cycle Overlay Dialog ── */}
      <Dialog open={showCycle} onOpenChange={setShowCycle}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acceleration Overlay</DialogTitle></DialogHeader>
          <form onSubmit={handleCycle} className="space-y-4 mt-2">
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p>Your contract cycle is <strong>{cycle} days</strong> per floor.</p>
              <p className="text-xs text-muted-foreground">
                Enter a faster target cycle to see the whole programme side-by-side — contract dates on the left,
                accelerated target dates on the right. All tasks scale proportionally.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Target cycle (days per floor)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                step="0.5"
                value={cycleForm.newCycleDays}
                onChange={e => setCycleForm({ newCycleDays: e.target.value })}
                placeholder={`e.g. 7 (contract is ${cycle} days)`}
                required
              />
              <p className="text-xs text-muted-foreground">
                e.g. enter 7 to see what the programme looks like at a 7-day cycle instead of {cycle} days
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCycle(false)}>Cancel</Button>
              <Button type="submit" disabled={cycleMut.isPending}>
                {cycleMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Generate Overlay
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Look-ahead Dialog ── */}
      <Dialog open={showLookahead} onOpenChange={setShowLookahead}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Look-ahead</DialogTitle></DialogHeader>
          <form onSubmit={handleLookahead} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>How many weeks ahead?</Label>
              <Select value={lookaheadForm.weeks} onValueChange={v => setLookaheadForm(f => ({ ...f, weeks: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 week</SelectItem>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="3">3 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Filter by trade or section (optional)</Label>
              <Input
                value={lookaheadForm.section}
                onChange={e => setLookaheadForm(f => ({ ...f, section: e.target.value }))}
                placeholder="e.g. Structure, Facade, Services, Concrete"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to show all trades, or type a trade name to filter — e.g. "Facade"
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Starting from (leave blank for today)</Label>
              <Input type="date" value={lookaheadForm.from} onChange={e => setLookaheadForm(f => ({ ...f, from: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLookahead(false)}>Cancel</Button>
              <Button type="submit">Generate Look-ahead</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
