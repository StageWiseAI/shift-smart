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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Upload, CloudRain, RefreshCw, Eye, Calendar, AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  uid: string;
  name: string;
  start?: string;
  finish?: string;
  isMilestone?: boolean;
  isSummary?: boolean;
  outlineLevel?: number;
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function TaskRow({ task, depth }: { task: Task; depth: number }) {
  return (
    <tr className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors",
      task.isSummary && "bg-muted/40 font-medium",
      task.isMilestone && "bg-amber-50/60 dark:bg-amber-950/30"
    )}>
      <td className="py-1.5 px-3 text-sm" style={{ paddingLeft: `${12 + depth * 16}px` }}>
        <div className="flex items-center gap-1.5">
          {task.isMilestone && <div className="w-2 h-2 rotate-45 bg-amber-500 flex-shrink-0" />}
          {task.isSummary && !task.isMilestone && <div className="w-2 h-2 rounded-sm bg-primary flex-shrink-0" />}
          <span className="leading-tight">{task.name}</span>
        </div>
      </td>
      <td className="py-1.5 px-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(task.start)}</td>
      <td className="py-1.5 px-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(task.finish)}</td>
      <td className="py-1.5 px-3">
        {task.isMilestone && <Badge variant="outline" className="text-[10px] h-4 text-amber-600 border-amber-300">Milestone</Badge>}
        {task.isSummary && !task.isMilestone && <Badge variant="outline" className="text-[10px] h-4">Summary</Badge>}
      </td>
    </tr>
  );
}

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

  // EOT form
  const [eotForm, setEotForm] = useState({ type: "weather", description: "", delayHours: "8", appliedFrom: "" });
  // Cycle form
  const [cycleForm, setCycleForm] = useState({ newCycleDays: "" });
  // Lookahead
  const [lookaheadForm, setLookaheadForm] = useState({ weeks: "2", section: "", from: "" });
  const [lookaheadTasks, setLookaheadTasks] = useState<Task[] | null>(null);
  const [cycleResult, setCycleResult] = useState<{ tasks: Task[]; originalCycleDays: number; newCycleDays: number } | null>(null);
  const [eotTasks, setEotTasks] = useState<Task[] | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadType, setUploadType] = useState("baseline");

  const { data: project } = useQuery<any>({ queryKey: [`/api/projects/${pid}`] });
  const { data: programmes = [], isLoading: progsLoading } = useQuery<any[]>({ queryKey: [`/api/projects/${pid}/programmes`] });

  const activeProg = selectedProgId ?? (programmes[0]?.id ?? null);

  const { data: taskData, isLoading: tasksLoading } = useQuery<{ tasks: Task[]; cycleDetectedDays: number | null }>({
    queryKey: [`/api/projects/${pid}/programmes/${activeProg}/tasks`],
    enabled: !!activeProg,
  });

  const eotEvents = useQuery<any[]>({ queryKey: [`/api/projects/${pid}/eot`] });

  // Upload — send as multipart FormData to avoid JSON body size limits
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

  // EOT
  const eotMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${pid}/eot`, data),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/eot`] });
      setEotTasks(d.tasks);
      setShowEOT(false);
      setTab("eot-result");
      toast({ title: "EOT applied", description: `Programme shifted by ${eotForm.delayHours} hours` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleEOT(e: React.FormEvent) {
    e.preventDefault();
    eotMut.mutate({ ...eotForm, programmeId: activeProg, delayHours: parseFloat(eotForm.delayHours) });
  }

  // Cycle
  const cycleMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${pid}/programmes/${activeProg}/cycle`, data),
    onSuccess: (d) => {
      setCycleResult({ tasks: d.tasks, originalCycleDays: d.originalCycleDays, newCycleDays: parseFloat(cycleForm.newCycleDays) });
      setShowCycle(false);
      setTab("cycle-result");
      toast({ title: "Cycle recalculated", description: `Programme regenerated on ${cycleForm.newCycleDays}-day cycle` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleCycle(e: React.FormEvent) {
    e.preventDefault();
    cycleMut.mutate({ newCycleDays: parseFloat(cycleForm.newCycleDays) });
  }

  // Lookahead
  async function handleLookahead(e: React.FormEvent) {
    e.preventDefault();
    try {
      const params = new URLSearchParams({
        weeks: lookaheadForm.weeks,
        ...(lookaheadForm.from && { from: lookaheadForm.from }),
        ...(lookaheadForm.section && { section: lookaheadForm.section }),
      });
      const data = await apiRequest("GET", `/api/projects/${pid}/programmes/${activeProg}/lookahead?${params}`);
      setLookaheadTasks(data.tasks);
      setShowLookahead(false);
      setTab("lookahead");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  const tasks = taskData?.tasks ?? [];
  const cycle = taskData?.cycleDetectedDays;

  return (
    <Layout projectId={pid} projectName={project?.name} breadcrumb="Programme">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Programme</h1>
            {cycle && <p className="text-xs text-muted-foreground mt-0.5">Structural cycle detected: <span className="font-semibold text-foreground">{cycle} days</span></p>}
          </div>
          <div className="flex items-center gap-2">
            {activeProg && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowLookahead(true)}>
                  <Eye className="h-4 w-4 mr-1" /> Look-ahead
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowEOT(true)}>
                  <CloudRain className="h-4 w-4 mr-1" /> EOT Delay
                </Button>
                {cycle && (
                  <Button size="sm" variant="outline" onClick={() => setShowCycle(true)}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Adjust Cycle
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

        {/* Programme selector */}
        {programmes.length > 1 && (
          <div className="flex items-center gap-2 mb-4">
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

        {progsLoading ? (
          <div className="h-40 bg-muted rounded-lg animate-pulse" />
        ) : programmes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-center">
            <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No programme uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload an MS Project XML file to get started</p>
            <div className="mt-4 flex gap-2">
              <Input placeholder="Label (e.g. Baseline)" className="w-48 h-8 text-xs" value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} />
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Upload
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="eot-log">EOT Log</TabsTrigger>
              {eotTasks && <TabsTrigger value="eot-result">EOT Result</TabsTrigger>}
              {cycleResult && <TabsTrigger value="cycle-result">Cycle View</TabsTrigger>}
              {lookaheadTasks && <TabsTrigger value="lookahead">Look-ahead</TabsTrigger>}
            </TabsList>

            {/* Task list */}
            <TabsContent value="tasks">
              {tasksLoading ? <div className="h-40 bg-muted rounded-lg animate-pulse mt-4" /> : (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Task</th>
                        <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">Start</th>
                        <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">Finish</th>
                        <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No tasks found in programme</td></tr>
                      ) : tasks.map(t => (
                        <TaskRow key={t.uid} task={t} depth={(t.outlineLevel ?? 1) - 1} />
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 text-xs text-muted-foreground border-t">
                    {tasks.length} tasks · {tasks.filter(t => t.isMilestone).length} milestones
                  </div>
                </div>
              )}
            </TabsContent>

            {/* EOT Log */}
            <TabsContent value="eot-log">
              <div className="mt-4 space-y-3">
                {eotEvents.isLoading ? <div className="h-20 bg-muted rounded-lg animate-pulse" /> :
                  (eotEvents.data ?? []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No EOT events recorded</div>
                  ) : (eotEvents.data ?? []).map((e: any) => (
                    <Card key={e.id}>
                      <CardContent className="py-3 px-4 flex items-center gap-4">
                        <div className={cn("p-2 rounded-lg", e.type === "weather" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600")}>
                          <CloudRain className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{e.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.delayHours}h delay from {formatDate(e.applied_from)} · {e.type === "weather" ? "Weather Event" : "IR Event"}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(e.created_at)}</span>
                      </CardContent>
                    </Card>
                  ))
                }
              </div>
            </TabsContent>

            {/* EOT Result */}
            {eotTasks && (
              <TabsContent value="eot-result">
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Programme shifted. Tasks from delay point onwards have been pushed out.
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Task</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Start</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Finish</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eotTasks.map(t => <TaskRow key={t.uid} task={t} depth={(t.outlineLevel ?? 1) - 1} />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Cycle Result */}
            {cycleResult && (
              <TabsContent value="cycle-result">
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm text-green-700 dark:text-green-300">
                    <RefreshCw className="h-4 w-4 flex-shrink-0" />
                    Programme recalculated from {cycleResult.originalCycleDays}-day to {cycleResult.newCycleDays}-day cycle. All trades accelerated accordingly.
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Task</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Start (New)</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Finish (New)</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cycleResult.tasks.map(t => <TaskRow key={t.uid} task={t} depth={(t.outlineLevel ?? 1) - 1} />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Look-ahead */}
            {lookaheadTasks && (
              <TabsContent value="lookahead">
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                    <Eye className="h-4 w-4 flex-shrink-0" />
                    {lookaheadTasks.length} tasks in look-ahead window. Review and confirm with your team.
                  </div>
                  {lookaheadTasks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No tasks in this look-ahead period</div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Task</th>
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Start</th>
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Finish</th>
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lookaheadTasks.map(t => <TaskRow key={t.uid} task={t} depth={(t.outlineLevel ?? 1) - 1} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {/* Upload settings (visible when programme exists) */}
      {programmes.length > 0 && (
        <div className="px-6 pb-4">
          <Separator className="mb-4" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Upload new revision:</span>
            <Input placeholder="Label" className="w-40 h-7 text-xs" value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} />
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline">Baseline</SelectItem>
                <SelectItem value="revision">Revision</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3 w-3 mr-1" /> Upload
            </Button>
          </div>
        </div>
      )}

      {/* EOT Dialog */}
      <Dialog open={showEOT} onOpenChange={setShowEOT}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply EOT Delay</DialogTitle></DialogHeader>
          <form onSubmit={handleEOT} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Delay Type</Label>
              <Select value={eotForm.type} onValueChange={v => setEotForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weather">Weather Event (inclement weather)</SelectItem>
                  <SelectItem value="ir">IR Event (industrial relations)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={eotForm.description} onChange={e => setEotForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Rain event — site shutdown 14:00" />
            </div>
            <div className="space-y-1.5">
              <Label>Delay Duration</Label>
              <Select value={eotForm.delayHours} onValueChange={v => setEotForm(f => ({ ...f, delayHours: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 hours (half day)</SelectItem>
                  <SelectItem value="8">8 hours (full day)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Based on an 8-hour working day</p>
            </div>
            <div className="space-y-1.5">
              <Label>Apply From (date delay starts affecting work)</Label>
              <Input type="date" value={eotForm.appliedFrom} onChange={e => setEotForm(f => ({ ...f, appliedFrom: e.target.value }))} required />
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              All tasks from the delay date onwards will shift by the selected duration. The updated programme can be reviewed before saving.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEOT(false)}>Cancel</Button>
              <Button type="submit" disabled={eotMut.isPending}>
                {eotMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Apply EOT
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cycle Dialog */}
      <Dialog open={showCycle} onOpenChange={setShowCycle}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Structural Cycle</DialogTitle></DialogHeader>
          <form onSubmit={handleCycle} className="space-y-4 mt-2">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>Current detected cycle: <strong>{cycle} days</strong></p>
              <p className="text-xs text-muted-foreground mt-1">Changing the cycle will proportionally reschedule all tasks — structure leads, all trades follow automatically.</p>
            </div>
            <div className="space-y-1.5">
              <Label>New Cycle Length (days)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                step="0.5"
                value={cycleForm.newCycleDays}
                onChange={e => setCycleForm({ newCycleDays: e.target.value })}
                placeholder={`e.g. 7 (current: ${cycle})`}
                required
              />
              <p className="text-xs text-muted-foreground">e.g. change from 8-day to 7-day cycle to see the accelerated programme</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCycle(false)}>Cancel</Button>
              <Button type="submit" disabled={cycleMut.isPending}>
                {cycleMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Recalculate Programme
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Look-ahead Dialog */}
      <Dialog open={showLookahead} onOpenChange={setShowLookahead}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Look-ahead</DialogTitle></DialogHeader>
          <form onSubmit={handleLookahead} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Look-ahead Window</Label>
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
              <Label>From Date</Label>
              <Input type="date" value={lookaheadForm.from} onChange={e => setLookaheadForm(f => ({ ...f, from: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Leave blank to use today</p>
            </div>
            <div className="space-y-1.5">
              <Label>Filter by Section / Trade (optional)</Label>
              <Input
                value={lookaheadForm.section}
                onChange={e => setLookaheadForm(f => ({ ...f, section: e.target.value }))}
                placeholder="e.g. Structure, Facade, Services"
              />
              <p className="text-xs text-muted-foreground">Filters tasks by name — review and confirm the result with your team</p>
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
