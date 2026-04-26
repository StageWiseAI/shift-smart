import { useState, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "./Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Upload, Trash2, RefreshCw, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle2, Clock, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailRecord {
  id: number;
  project_id: number;
  raw_text: string;
  from_address: string | null;
  subject: string | null;
  received_date: string | null;
  summary: string | null;
  key_points: string | null;  // JSON string[]
  has_rfi: number;
  analysis_status: string;   // pending | done | error
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done") return (
    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
      <CheckCircle2 className="h-3 w-3" /> Analysed
    </Badge>
  );
  if (status === "pending") return (
    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1 animate-pulse">
      <Clock className="h-3 w-3" /> Analysing…
    </Badge>
  );
  return (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1">
      <AlertCircle className="h-3 w-3" /> Error
    </Badge>
  );
}

function EmailCard({ email, projectId }: { email: EmailRecord; projectId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/projects/${projectId}/emails/${email.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "emails"] });
      toast({ title: "Email removed" });
    },
  });

  const reanalyseMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${projectId}/emails/${email.id}/analyse`),
    onSuccess: () => {
      toast({ title: "Re-analysis triggered — refreshing shortly…" });
      // Poll for completion
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "emails"] });
      }, 2500);
      setTimeout(() => clearInterval(interval), 30000);
    },
  });

  const keyPoints: string[] = (() => {
    try { return JSON.parse(email.key_points ?? "[]"); } catch { return []; }
  })();

  const displaySubject = email.subject ?? "(No subject detected)";
  const displayFrom = email.from_address ?? "Unknown sender";
  const displayDate = email.received_date
    ? new Date(email.received_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <Card
      data-testid={`email-card-${email.id}`}
      className="border-border/60 bg-card/80 hover:border-primary/40 transition-colors"
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <button
            className="flex-1 text-left flex items-start gap-3 min-w-0"
            onClick={() => setExpanded(!expanded)}
            data-testid={`email-expand-${email.id}`}
          >
            <div className="mt-0.5 shrink-0 text-muted-foreground">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-foreground truncate">{displaySubject}</span>
                {email.has_rfi === 1 && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] shrink-0">RFI Detected</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>From: <span className="text-foreground/70">{displayFrom}</span></span>
                {displayDate && <span>· {displayDate}</span>}
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={email.analysis_status} />
            {email.analysis_status === "error" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => reanalyseMutation.mutate()}
                disabled={reanalyseMutation.isPending}
                data-testid={`email-reanalyse-${email.id}`}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", reanalyseMutation.isPending && "animate-spin")} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid={`email-delete-${email.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
          {email.analysis_status === "pending" && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {email.analysis_status === "done" && (
            <>
              {email.summary && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Summary</p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{email.summary}</p>
                </div>
              )}
              {keyPoints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Key Points</p>
                  <ul className="space-y-1">
                    {keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {email.analysis_status === "error" && (
            <p className="text-sm text-destructive">Analysis failed. Click the refresh icon to retry.</p>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Original Email Text</p>
            <pre className="text-xs text-foreground/60 whitespace-pre-wrap bg-muted/30 rounded-md p-3 max-h-48 overflow-y-auto font-mono leading-relaxed">
              {email.raw_text}
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function EmailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0");
  const { toast } = useToast();
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Project info
  const { data: project } = useQuery<any>({
    queryKey: ["/api/projects", projectId],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}`).then(r => r.json()),
  });

  // Emails list
  const { data: emails = [], isLoading } = useQuery<EmailRecord[]>({
    queryKey: ["/api/projects", projectId, "emails"],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/emails`).then(r => r.json()),
    refetchInterval: (query) => {
      // Auto-refresh while any email is still pending
      const data = query.state.data as EmailRecord[] | undefined;
      const hasPending = data?.some(e => e.analysis_status === "pending");
      return hasPending ? 3000 : false;
    },
  });

  const submitMutation = useMutation({
    mutationFn: (rawText: string) =>
      apiRequest("POST", `/api/projects/${projectId}/emails`, { rawText }).then(r => r.json()),
    onSuccess: () => {
      setPastedText("");
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "emails"] });
      toast({ title: "Email submitted for analysis" });
    },
    onError: () => toast({ title: "Failed to submit email", variant: "destructive" }),
  });

  function handleSubmit() {
    const text = pastedText.trim();
    if (!text) { toast({ title: "Paste or drop an email first", variant: "destructive" }); return; }
    submitMutation.mutate(text);
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
    if (text) { setPastedText(text); return; }
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (ev) => setPastedText(ev.target?.result as string ?? "");
      reader.readAsText(file);
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPastedText(ev.target?.result as string ?? "");
    reader.readAsText(file);
    e.target.value = "";
  }

  const pendingCount = emails.filter(e => e.analysis_status === "pending").length;
  const rfiCount = emails.filter(e => e.has_rfi === 1).length;

  return (
    <Layout
      projectId={projectId}
      projectName={project?.name}
      breadcrumb="Emails"
    >
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Inbox
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Paste or drop project emails — AI will extract key points and flag RFIs automatically.
            </p>
          </div>
          <div className="flex gap-3 text-right">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{emails.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Emails</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{rfiCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">RFIs Found</p>
            </div>
          </div>
        </div>

        {/* Drop zone + paste area */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Add Email
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
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border"
              )}
              data-testid="email-drop-zone"
            >
              {!pastedText && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none select-none py-8">
                  <Upload className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Drag & drop a <span className="font-medium">.txt</span> file here</p>
                  <p className="text-xs mt-0.5">or paste your email text below</p>
                </div>
              )}
              <Textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder=""
                className="min-h-[160px] resize-y border-0 bg-transparent focus-visible:ring-0 font-mono text-xs leading-relaxed"
                data-testid="email-text-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !pastedText.trim()}
                className="gap-2"
                data-testid="email-submit"
              >
                <FileText className="h-4 w-4" />
                {submitMutation.isPending ? "Submitting…" : "Analyse Email"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-2 text-muted-foreground"
                data-testid="email-upload-file"
              >
                <Upload className="h-3.5 w-3.5" /> Upload .txt file
              </Button>
              {pastedText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPastedText("")}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email list */}
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
          ) : emails.length === 0 ? (
            <Card className="border-dashed border-border/40">
              <CardContent className="py-12 text-center">
                <Mail className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No emails added yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Paste or drop an email above to get started.</p>
              </CardContent>
            </Card>
          ) : (
            emails.map(email => (
              <EmailCard key={email.id} email={email} projectId={projectId} />
            ))
          )}
        </div>

        {pendingCount > 0 && (
          <p className="text-xs text-center text-muted-foreground animate-pulse">
            {pendingCount} email{pendingCount > 1 ? "s" : ""} being analysed…
          </p>
        )}
      </div>
    </Layout>
  );
}
