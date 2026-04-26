import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "./Layout";
import { useAuth } from "../App";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, ClipboardList, ArrowLeft, Mic, MicOff, Square, CheckCircle2, Circle, Plus as PlusIcon, Trash2, UserPlus, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const MEETING_TYPES = [
  { value: "general", label: "General" },
  { value: "subbie", label: "Subcontractor Notes" },
  { value: "programme", label: "Programme Meeting" },
  { value: "safety", label: "Safety Meeting" },
];

function uuid() { return Math.random().toString(36).slice(2,10); }

export default function MeetingsPage() {
  const { id, mid } = useParams<{ id: string; mid?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const pid = parseInt(id);
  const meetingId = mid ? parseInt(mid) : null;

  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", meetingDate: new Date().toISOString().split("T")[0], meetingTime: "", type: "general" });
  const [newAttendee, setNewAttendee] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const [newActionItem, setNewActionItem] = useState({ item: "", owner: "", due: "" });

  const { data: project } = useQuery<any>({ queryKey: [`/api/projects/${pid}`] });
  const { data: meetings = [], isLoading } = useQuery<any[]>({ queryKey: [`/api/projects/${pid}/meetings`] });
  const { data: meeting, isLoading: mLoading } = useQuery<any>({
    queryKey: [`/api/projects/${pid}/meetings/${meetingId}`],
    enabled: !!meetingId,
  });

  const m = meeting;
  const attendees: string[] = m?.attendees_json ? JSON.parse(m.attendees_json) : [];
  const agendaItems: any[] = m?.agenda_json ? JSON.parse(m.agenda_json) : [];
  const actions: any[] = m?.actions_json ? JSON.parse(m.actions_json) : [];

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${pid}/meetings`, data),
    onSuccess: (d: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/meetings`] });
      toast({ title: "Meeting created" });
      setShowNew(false);
      navigate(`/projects/${pid}/meetings/${d.id}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/projects/${pid}/meetings/${meetingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/meetings/${meetingId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/meetings`] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (mid: number) => apiRequest("DELETE", `/api/projects/${pid}/meetings/${mid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/meetings`] });
      toast({ title: "Meeting deleted" });
    },
  });

  function updateField(key: string, value: any) {
    updateMut.mutate({ [key]: value });
  }

  // Attendees
  function addAttendee() {
    if (!newAttendee.trim()) return;
    updateField("attendeesJson", JSON.stringify([...attendees, newAttendee.trim()]));
    setNewAttendee("");
  }
  function removeAttendee(i: number) {
    updateField("attendeesJson", JSON.stringify(attendees.filter((_, idx) => idx !== i)));
  }

  // Agenda
  function addAgendaItem() {
    const item = { id: uuid(), text: "", done: false };
    updateField("agendaJson", JSON.stringify([...agendaItems, item]));
  }
  function updateAgendaItem(aid: string, key: string, val: any) {
    updateField("agendaJson", JSON.stringify(agendaItems.map(a => a.id === aid ? { ...a, [key]: val } : a)));
  }
  function removeAgendaItem(aid: string) {
    updateField("agendaJson", JSON.stringify(agendaItems.filter(a => a.id !== aid)));
  }

  // Actions
  function addAction() {
    if (!newActionItem.item.trim()) return;
    const a = { id: uuid(), ...newActionItem, status: "open" };
    updateField("actionsJson", JSON.stringify([...actions, a]));
    setNewActionItem({ item: "", owner: "", due: "" });
  }
  function toggleAction(aid: string) {
    updateField("actionsJson", JSON.stringify(actions.map(a => a.id === aid ? { ...a, status: a.status === "open" ? "closed" : "open" } : a)));
  }
  function removeAction(aid: string) {
    updateField("actionsJson", JSON.stringify(actions.filter(a => a.id !== aid)));
  }

  // Audio recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = ev => {
          const b64 = (ev.target?.result as string).split(",")[1];
          updateMut.mutate({ audioData: b64, audioMime: "audio/webm" });
          toast({ title: "Recording saved" });
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setAudioChunks([]);
    } catch {
      toast({ title: "Microphone not available", variant: "destructive" });
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  function confirmMeeting() {
    updateField("status", m?.status === "confirmed" ? "draft" : "confirmed");
  }

  const typeLabel = MEETING_TYPES.find(t => t.value === m?.type)?.label ?? "Meeting";

  // LIST VIEW
  if (!meetingId) {
    return (
      <Layout projectId={pid} projectName={project?.name} breadcrumb="Meetings">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Meetings & Minutes</h1>
            <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Meeting</Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium">No meetings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Record subbie notes, programme meetings, safety discussions</p>
              <Button size="sm" className="mt-4" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Meeting</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.map((m: any) => {
                const tl = MEETING_TYPES.find(t => t.value === m.type)?.label ?? "Meeting";
                return (
                  <div key={m.id}
                    className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:shadow-sm cursor-pointer transition-shadow group"
                    onClick={() => navigate(`/projects/${pid}/meetings/${m.id}`)}
                  >
                    <div className="p-2 bg-green-50 text-green-700 rounded-lg"><ClipboardList className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : ""}{m.meeting_time ? ` · ${m.meeting_time}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">{tl}</Badge>
                      <Badge variant={m.status === "confirmed" ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {m.status === "confirmed" ? "Confirmed" : "Draft"}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(m.id); }}
                        title="Delete meeting"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Confirm delete dialog ── */}
        <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Meeting?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This will permanently delete the meeting and all its minutes. This cannot be undone.</p>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMut.isPending}
                onClick={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)}
              >
                {deleteMut.isPending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Meeting</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createMut.mutate({ ...newForm, createdBy: user?.id }); }} className="space-y-4 mt-2">
              <div className="space-y-1.5"><Label>Title *</Label><Input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Subbie Progress Meeting — Week 15" required /></div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={newForm.type} onValueChange={v => setNewForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={newForm.meetingDate} onChange={e => setNewForm(f => ({ ...f, meetingDate: e.target.value }))} required /></div>
                <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={newForm.meetingTime} onChange={e => setNewForm(f => ({ ...f, meetingTime: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button type="submit">Create Meeting</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // DETAIL VIEW
  if (!m) return <Layout projectId={pid} projectName={project?.name}><div className="p-8 text-muted-foreground">Loading…</div></Layout>;

  return (
    <Layout projectId={pid} projectName={project?.name} breadcrumb="Meetings">
      <div className="px-6 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3">
            <Button size="icon" variant="ghost" className="h-8 w-8 mt-0.5" onClick={() => navigate(`/projects/${pid}/meetings`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <input
                className="text-xl font-bold bg-transparent border-0 outline-none w-full"
                defaultValue={m.title}
                onBlur={e => updateField("title", e.target.value)}
                key={m.title}
              />
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}
                  {m.meeting_time ? ` · ${m.meeting_time}` : ""}
                </p>
                <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                <Badge variant={m.status === "confirmed" ? "default" : "secondary"} className="text-[10px]">
                  {m.status === "confirmed" ? "Confirmed" : "Draft"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant={m.status === "confirmed" ? "secondary" : "default"} onClick={confirmMeeting}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {m.status === "confirmed" ? "Unconfirm" : "Confirm Minutes"}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Attendees */}
          <section>
            <h2 className="text-sm font-semibold mb-2">Attendees</h2>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {attendees.map((a, i) => (
                <Badge key={i} variant="secondary" className="text-xs gap-1">
                  {a}
                  <button onClick={() => removeAttendee(i)} className="hover:text-destructive ml-1">×</button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input className="h-7 text-xs w-48" value={newAttendee} onChange={e => setNewAttendee(e.target.value)} placeholder="Add attendee…" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addAttendee())} />
              <Button size="sm" className="h-7 text-xs" onClick={addAttendee}><UserPlus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
          </section>

          <Separator />

          {/* Agenda */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Agenda Items</h2>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addAgendaItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
            </div>
            {agendaItems.length === 0 ? <p className="text-sm text-muted-foreground italic">No agenda items</p> : (
              <div className="space-y-2">
                {agendaItems.map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <button onClick={() => updateAgendaItem(a.id, "done", !a.done)} className="flex-shrink-0">
                      {a.done ? <CheckSquare className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <input
                      className={cn("flex-1 bg-transparent border-b border-border outline-none text-sm py-0.5", a.done && "line-through text-muted-foreground")}
                      defaultValue={a.text}
                      placeholder="Agenda item…"
                      onBlur={e => updateAgendaItem(a.id, "text", e.target.value)}
                      key={a.text}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => removeAgendaItem(a.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Minutes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Meeting Notes / Minutes</h2>
              <div className="flex items-center gap-2">
                {m.audio_data && (
                  <Badge variant="outline" className="text-[10px]">🎙 Recording saved</Badge>
                )}
                {recording ? (
                  <Button size="sm" variant="destructive" className="h-7 text-xs animate-pulse" onClick={stopRecording}>
                    <Square className="h-3 w-3 mr-1" /> Stop Recording
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startRecording}>
                    <Mic className="h-3 w-3 mr-1" /> Record
                  </Button>
                )}
              </div>
            </div>
            {recording && (
              <div className="mb-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Recording in progress… press Stop Recording when done
              </div>
            )}
            <Textarea
              defaultValue={m.minutes_text ?? ""}
              onBlur={e => updateField("minutesText", e.target.value)}
              placeholder="Type meeting notes, decisions, key points discussed…&#10;&#10;Or use the Record button to capture a voice recording."
              rows={8}
              key={m.id}
            />
            {m.audio_data && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Audio recording:</p>
                <audio controls src={`data:${m.audio_mime};base64,${m.audio_data}`} className="w-full h-8" />
              </div>
            )}
          </section>

          <Separator />

          {/* Action Items */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Action Items</h2>
              <Badge variant="outline" className="text-[10px]">{actions.filter(a => a.status === "open").length} open</Badge>
            </div>
            <div className="space-y-2 mb-3">
              {actions.length === 0 ? <p className="text-sm text-muted-foreground italic">No action items</p> : (
                actions.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 border rounded-lg text-sm">
                    <button onClick={() => toggleAction(a.id)} className="flex-shrink-0 mt-0.5">
                      {a.status === "closed"
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <div className={cn("flex-1", a.status === "closed" && "line-through text-muted-foreground")}>
                      <p>{a.item}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {a.owner && <span>Owner: {a.owner}</span>}
                        {a.due && <span>Due: {new Date(a.due).toLocaleDateString("en-AU")}</span>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground flex-shrink-0" onClick={() => removeAction(a.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            {/* Add action */}
            <div className="flex items-end gap-2 flex-wrap p-3 bg-muted/30 rounded-lg">
              <div className="space-y-1 flex-1 min-w-40">
                <Label className="text-xs">Action</Label>
                <Input className="h-7 text-xs" value={newActionItem.item} onChange={e => setNewActionItem(f => ({ ...f, item: e.target.value }))} placeholder="Action required…" />
              </div>
              <div className="space-y-1 w-28">
                <Label className="text-xs">Owner</Label>
                <Input className="h-7 text-xs" value={newActionItem.owner} onChange={e => setNewActionItem(f => ({ ...f, owner: e.target.value }))} placeholder="Who" />
              </div>
              <div className="space-y-1 w-32">
                <Label className="text-xs">Due Date</Label>
                <Input type="date" className="h-7 text-xs" value={newActionItem.due} onChange={e => setNewActionItem(f => ({ ...f, due: e.target.value }))} />
              </div>
              <Button size="sm" className="h-7 text-xs" onClick={addAction}><Plus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
