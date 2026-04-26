import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "./Layout";
import { useAuth } from "../App";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, FileQuestion, Mail, ClipboardList, ChevronDown, ChevronRight,
  Pencil, Trash2, Clock, CheckCircle2, CircleDashed, Send,
  Upload, FileText, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface RfiRecord {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  raised_by: string | null;
  status: string;         // open | in_review | closed
  source_type: string | null;  // email | meeting | manual | document
  source_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "open",      label: "Open" },
  { value: "in_review", label: "In Review" },
  { value: "closed",    label: "Closed" },
];

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "closed") return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-[10px]">
      <CheckCircle2 className="h-3 w-3" /> Closed
    </Badge>
  );
  if (status === "in_review") return (
    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1 text-[10px]">
      <Clock className="h-3 w-3" /> In Review
    </Badge>
  );
  return (
    <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 gap-1 text-[10px]">
      <CircleDashed className="h-3 w-3" /> Open
    </Badge>
  );
}

// ── Analysing badge ───────────────────────────────────────────────────────────
function AnalysingBadge() {
  return (
    <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 gap-1 text-[10px] animate-pulse">
      <Sparkles className="h-3 w-3" /> Analysing…
    </Badge>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ sourceType }: { sourceType: string | null }) {
  if (sourceType === "email") return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <Mail className="h-3 w-3" /> Email
    </span>
  );
  if (sourceType === "meeting") return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <ClipboardList className="h-3 w-3" /> Meeting minutes
    </span>
  );
  if (sourceType === "document") return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <FileText className="h-3 w-3" /> Document
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <Send className="h-3 w-3" /> Manual
    </span>
  );
}

// ── RFI row card ──────────────────────────────────────────────────────────────
function RfiCard({
  rfi,
  projectId,
  onEdit,
}: {
  rfi: RfiRecord;
  projectId: number;
  onEdit: (r: RfiRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const isAnalysing = rfi.title?.toLowerCase().includes("analysing");

  const statusMut = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/projects/${projectId}/rfis/${rfi.id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/rfis`] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/projects/${projectId}/rfis/${rfi.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/rfis`] });
      toast({ title: "RFI removed" });
    },
  });

  const createdDate = rfi.created_at
    ? new Date(rfi.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <Card
      data-testid={`rfi-card-${rfi.id}`}
      className="border-border/60 bg-card/80 hover:border-primary/30 transition-colors"
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <button
            className="flex-1 text-left flex items-start gap-3 min-w-0"
            onClick={() => setExpanded(!expanded)}
            data-testid={`rfi-expand-${rfi.id}`}
          >
            <div className="mt-0.5 shrink-0 text-muted-foreground">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className={cn("text-sm font-semibold text-foreground", isAnalysing && "text-muted-foreground italic")}>
                  {rfi.title}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {rfi.raised_by && <span>Raised by: <span className="text-foreground/70">{rfi.raised_by}</span></span>}
                {createdDate && <span>· {createdDate}</span>}
                <SourceBadge sourceType={rfi.source_type} />
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {isAnalysing ? (
              <AnalysingBadge />
            ) : (
              <StatusBadge status={rfi.status} />
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(rfi)}
              data-testid={`rfi-edit-${rfi.id}`}
              title="Edit RFI"
              disabled={isAnalysing}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
              data-testid={`rfi-delete-${rfi.id}`}
              title="Delete RFI"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
          {isAnalysing ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <p className="text-xs text-muted-foreground animate-pulse">AI is extracting RFI details…</p>
            </div>
          ) : (
            <>
              {rfi.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Description</p>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{rfi.description}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Update Status</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {STATUS_OPTIONS.map(opt => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={rfi.status === opt.value ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => statusMut.mutate(opt.value)}
                      disabled={statusMut.isPending || rfi.status === opt.value}
                      data-testid={`rfi-status-${rfi.id}-${opt.value}`}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RFIPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0");
  const { user } = useAuth();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editRfi, setEditRfi] = useState<RfiRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Upload panel state
  const [docText, setDocText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const emptyForm = { title: "", description: "", raisedBy: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: project } = useQuery<any>({ queryKey: [`/api/projects/${projectId}`] });

  const { data: rfis = [], isLoading } = useQuery<RfiRecord[]>({
    queryKey: [`/api/projects/${projectId}/rfis`],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/rfis`).then(r => r.json()),
    refetchInterval: (query) => {
      const data = query.state.data as RfiRecord[] | undefined;
      const hasAnalysing = data?.some(r => r.title?.toLowerCase().includes("analysing"));
      return hasAnalysing ? 3000 : false;
    },
  });

  // ── Upload/extract mutation ────────────────────────────────────────────────
  const extractMut = useMutation({
    mutationFn: (rawText: string) =>
      apiRequest("POST", `/api/projects/${projectId}/rfis/extract`, { rawText }).then(r => r.json()),
    onSuccess: () => {
      setDocText("");
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/rfis`] });
      toast({ title: "Document submitted — AI is extracting RFI details" });
    },
    onError: () => toast({ title: "Failed to extract RFI", variant: "destructive" }),
  });

  function handleExtract() {
    const text = docText.trim();
    if (!text) { toast({ title: "Paste or drop a document first", variant: "destructive" }); return; }
    extractMut.mutate(text);
  }

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const text = e.dataTransfer.getData("text/plain");
    if (text) { setDocText(text); return; }
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setDocText(ev.target?.result as string ?? "");
      reader.readAsText(file);
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDocText(ev.target?.result as string ?? "");
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Manual create mutation ────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/projects/${projectId}/rfis`, {
        ...data,
        projectId,
        sourceType: "manual",
        createdBy: user?.id,
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/rfis`] });
      setForm(emptyForm);
      setShowCreate(false);
      toast({ title: "RFI created" });
    },
    onError: () => toast({ title: "Failed to create RFI", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/projects/${projectId}/rfis/${editRfi?.id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/rfis`] });
      setEditRfi(null);
      toast({ title: "RFI updated" });
    },
    onError: () => toast({ title: "Failed to update RFI", variant: "destructive" }),
  });

  const filtered = statusFilter === "all" ? rfis : rfis.filter(r => r.status === statusFilter);
  const openCount = rfis.filter(r => r.status === "open").length;
  const reviewCount = rfis.filter(r => r.status === "in_review").length;
  const closedCount = rfis.filter(r => r.status === "closed").length;
  const analysingCount = rfis.filter(r => r.title?.toLowerCase().includes("analysing")).length;

  return (
    <Layout projectId={projectId} projectName={project?.name} breadcrumb="RFIs">
      <div className="p-6 space-y-6 max-w-4xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-primary" />
              RFI Register
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Requests for Information — upload documents, or raise from emails, meeting minutes, or manually
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} data-testid="rfi-new-button">
            <Plus className="h-4 w-4 mr-1" /> New RFI
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded-lg p-3 text-center bg-blue-500/5 border-blue-500/20">
            <p className="text-2xl font-bold text-blue-600">{openCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Open</p>
          </div>
          <div className="border rounded-lg p-3 text-center bg-amber-500/5 border-amber-500/20">
            <p className="text-2xl font-bold text-amber-600">{reviewCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">In Review</p>
          </div>
          <div className="border rounded-lg p-3 text-center bg-emerald-500/5 border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-600">{closedCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Closed</p>
          </div>
        </div>

        {/* ── AI Document Upload Panel ─────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              Extract RFIs from Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative rounded-lg border-2 border-dashed transition-colors",
                isDragging
                  ? "border-violet-500 bg-violet-500/5"
                  : "border-border/50 hover:border-border"
              )}
              data-testid="rfi-drop-zone"
            >
              {!docText && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none select-none py-8">
                  <Upload className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Drag & drop an RFI document here</p>
                  <p className="text-xs mt-0.5">or paste the document text below — AI will extract all RFIs automatically</p>
                </div>
              )}
              <Textarea
                value={docText}
                onChange={e => setDocText(e.target.value)}
                placeholder=""
                className="min-h-[160px] resize-y border-0 bg-transparent focus-visible:ring-0 font-mono text-xs leading-relaxed"
                data-testid="rfi-text-input"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleExtract}
                disabled={extractMut.isPending || !docText.trim()}
                className="gap-2"
                data-testid="rfi-extract-button"
              >
                <Sparkles className="h-4 w-4" />
                {extractMut.isPending ? "Submitting…" : "Extract RFIs with AI"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-2 text-muted-foreground"
                data-testid="rfi-upload-file"
              >
                <Upload className="h-3.5 w-3.5" /> Upload file
              </Button>
              {docText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDocText("")}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <p className="text-[11px] text-muted-foreground/60">
              Supports RFI registers, subcontractor correspondence, and any document containing RFI details. Multiple RFIs in a single document will each be created as separate records.
            </p>
          </CardContent>
        </Card>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground font-medium">Filter:</p>
          {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map(opt => (
            <Button
              key={opt.value}
              size="sm"
              variant={statusFilter === opt.value ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setStatusFilter(opt.value)}
              data-testid={`rfi-filter-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
          {analysingCount > 0 && (
            <span className="text-xs text-violet-600 animate-pulse ml-2">
              {analysingCount} being analysed…
            </span>
          )}
        </div>

        {/* RFI list */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border/60">
                <CardHeader className="py-3 px-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/3 mt-1" />
                </CardHeader>
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <Card className="border-dashed border-border/40">
              <CardContent className="py-14 text-center">
                <FileQuestion className="h-9 w-9 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  {statusFilter === "all" ? "No RFIs yet" : `No ${STATUS_OPTIONS.find(s => s.value === statusFilter)?.label.toLowerCase()} RFIs`}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Upload a document above to extract RFIs automatically, or add one manually.
                </p>
                {statusFilter === "all" && (
                  <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-1" /> New RFI
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filtered.map(rfi => (
              <RfiCard
                key={rfi.id}
                rfi={rfi}
                projectId={projectId}
                onEdit={r => { setEditRfi(r); setForm({ title: r.title, description: r.description ?? "", raisedBy: r.raised_by ?? "" }); }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Create dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New RFI</DialogTitle></DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); createMut.mutate({ title: form.title, description: form.description, raisedBy: form.raisedBy }); }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="RFI subject or brief description"
                required
                data-testid="rfi-title-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detailed description, context, or information required…"
                rows={4}
                data-testid="rfi-description-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Raised By</Label>
              <Input
                value={form.raisedBy}
                onChange={e => setForm(f => ({ ...f, raisedBy: e.target.value }))}
                placeholder="Name or company"
                data-testid="rfi-raised-by-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setForm(emptyForm); }}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || !form.title.trim()}>
                {createMut.isPending ? "Creating…" : "Create RFI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editRfi} onOpenChange={open => { if (!open) setEditRfi(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit RFI</DialogTitle></DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              updateMut.mutate({ title: form.title, description: form.description, raisedBy: form.raisedBy });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                data-testid="rfi-edit-title-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                data-testid="rfi-edit-description-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Raised By</Label>
              <Input
                value={form.raisedBy}
                onChange={e => setForm(f => ({ ...f, raisedBy: e.target.value }))}
                data-testid="rfi-edit-raised-by-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editRfi?.status ?? "open"}
                onValueChange={val => setEditRfi(r => r ? { ...r, status: val } : r)}
              >
                <SelectTrigger data-testid="rfi-edit-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRfi(null)}>Cancel</Button>
              <Button
                type="submit"
                disabled={updateMut.isPending || !form.title.trim()}
              >
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
