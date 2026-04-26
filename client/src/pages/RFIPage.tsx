import { useState } from "react";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, FileQuestion, Mail, ClipboardList, ChevronDown, ChevronRight,
  Pencil, Trash2, Clock, CheckCircle2, AlertCircle, CircleDashed, Send
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
  source_type: string | null;  // email | meeting | manual
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
                <span className="text-sm font-semibold text-foreground">{rfi.title}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {rfi.raised_by && <span>Raised by: <span className="text-foreground/70">{rfi.raised_by}</span></span>}
                {createdDate && <span>· {createdDate}</span>}
                <SourceBadge sourceType={rfi.source_type} />
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <StatusBadge status={rfi.status} />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(rfi)}
              data-testid={`rfi-edit-${rfi.id}`}
              title="Edit RFI"
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

  const emptyForm = { title: "", description: "", raisedBy: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: project } = useQuery<any>({ queryKey: [`/api/projects/${projectId}`] });

  const { data: rfis = [], isLoading } = useQuery<RfiRecord[]>({
    queryKey: [`/api/projects/${projectId}/rfis`],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/rfis`).then(r => r.json()),
  });

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
              Requests for Information — raised from emails, meeting minutes, or manually
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
                  RFIs are created automatically from emails and meeting minutes, or you can add one manually.
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
