import { useState, useRef, useCallback } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, HardHat, Upload, Lock, ArrowLeft, Camera, UserPlus, Trash2, MapPin, AlertTriangle, Phone, Map, ImageIcon, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

const ZONE_COLOURS = ["#f59e0b","#3b82f6","#10b981","#ef4444","#8b5cf6","#f97316","#14b8a6","#ec4899"];

function uuid() { return Math.random().toString(36).slice(2,10); }

// ── Photo lightbox ──────────────────────────────────────────────────────────
function PhotoLightbox({ src, caption, onClose }: { src: string; caption?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
        <Button
          size="icon"
          variant="ghost"
          className="absolute -top-10 right-0 text-white hover:text-white/60"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        <img src={src} alt={caption || "Photo"} className="w-full h-full max-h-[80vh] object-contain rounded-lg" />
        {caption && (
          <p className="text-center text-white/80 text-sm mt-2">{caption}</p>
        )}
      </div>
    </div>
  );
}

// ── Photo card ──────────────────────────────────────────────────────────────
function PhotoCard({
  photo,
  projectId,
  meetingId,
  disabled,
}: {
  photo: any;
  projectId: number;
  meetingId: number;
  disabled: boolean;
}) {
  const [lightbox, setLightbox] = useState(false);
  const { toast } = useToast();

  const deleteMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/prestart-photos/${photo.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/prestart/${meetingId}/photos`] });
      toast({ title: "Photo removed" });
    },
  });

  return (
    <>
      {lightbox && (
        <PhotoLightbox
          src={`/api/prestart-photos/${photo.id}`}
          caption={photo.caption}
          onClose={() => setLightbox(false)}
        />
      )}
      <div className="relative group rounded-lg overflow-hidden border border-border/60 bg-muted/20">
        <img
          src={`/api/prestart-photos/${photo.id}`}
          alt={photo.caption || "Photo"}
          className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setLightbox(true)}
          data-testid={`prestart-photo-${photo.id}`}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ZoomIn className="h-6 w-6 text-white drop-shadow-md" />
        </div>
        {photo.caption && (
          <div className="px-2 py-1.5 border-t border-border/40">
            <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>
          </div>
        )}
        {!disabled && (
          <button
            className="absolute top-1.5 right-1.5 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive pointer-events-auto"
            onClick={() => deleteMut.mutate()}
            data-testid={`prestart-photo-delete-${photo.id}`}
            title="Remove photo"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {photo.photo_type === "map" && (
          <div className="absolute top-1.5 left-1.5">
            <Badge className="text-[10px] px-1 py-0 bg-blue-600/80 text-white border-0">Map</Badge>
          </div>
        )}
        {photo.photo_type === "exclusion" && (
          <div className="absolute top-1.5 left-1.5">
            <Badge className="text-[10px] px-1 py-0 bg-red-600/80 text-white border-0">Exclusion</Badge>
          </div>
        )}
      </div>
    </>
  );
}

// ── Drop zone upload ────────────────────────────────────────────────────────
function PhotoDropZone({
  label,
  icon,
  accept,
  onFiles,
  disabled,
  multiple,
}: {
  label: string;
  icon: React.ReactNode;
  accept: string;
  onFiles: (files: File[]) => void;
  disabled: boolean;
  multiple?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
    if (files.length) onFiles(files);
  }, [disabled, onFiles]);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50 hover:bg-muted/30",
        dragging && "border-primary bg-primary/5"
      )}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      data-testid="prestart-drop-zone"
    >
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="p-2.5 rounded-full bg-muted/50">{icon}</div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs">Drag & drop or click to browse</p>
        <p className="text-xs opacity-60">JPG, PNG, PDF accepted</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function PreStartPage() {
  const { id, mid } = useParams<{ id: string; mid?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const pid = parseInt(id);
  const meetingId = mid ? parseInt(mid) : null;

  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", meetingDate: new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" }) });
  const [showClose, setShowClose] = useState(false);
  const [attendeeForm, setAttendeeForm] = useState({ name: "", company: "", role: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Photo upload state
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const planRef = useRef<HTMLInputElement>(null);

  const { data: project } = useQuery<any>({ queryKey: [`/api/projects/${pid}`] });
  const { data: meetings = [], isLoading: listLoading } = useQuery<any[]>({ queryKey: [`/api/projects/${pid}/prestart`] });

  const meeting = meetingId ? meetings.find((m: any) => m.id === meetingId) ?? null : null;

  const { data: meetingDetail } = useQuery<any>({
    queryKey: [`/api/projects/${pid}/prestart/${meetingId}`],
    enabled: !!meetingId,
  });
  const { data: photos = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/prestart/${meetingId}/photos`],
    enabled: !!meetingId,
  });
  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${pid}/prestart/${meetingId}/attendance`],
    enabled: !!meetingId,
  });

  const m: any = meetingDetail ?? meeting;
  const isClosed = m?.status === "closed";

  const activeZones: any[] = m?.active_zones_json ? JSON.parse(m.active_zones_json) : [];
  const exclusionZones: any[] = m?.exclusion_zones_json ? JSON.parse(m.exclusion_zones_json) : [];
  const emergencyContacts: any[] = m?.emergency_contacts_json ? JSON.parse(m.emergency_contacts_json) : [];
  const hasPlan = !!(m?.site_plan_data || m?.site_plan_mime);

  // Photo buckets
  const sitePhotos = photos.filter((p: any) => !p.photo_type || p.photo_type === "site");
  const mapPhotos = photos.filter((p: any) => p.photo_type === "map");
  const exclusionPhotos = photos.filter((p: any) => p.photo_type === "exclusion");
  const zonePhotos = (zoneId: string) => photos.filter((p: any) => p.zone_id === zoneId);

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${pid}/prestart`, data),
    onSuccess: (d: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart`] });
      toast({ title: "Pre-start meeting created" });
      setShowNew(false);
      navigate(`/projects/${pid}/prestart/${d.id}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/projects/${pid}/prestart/${meetingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart/${meetingId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart`] });
    },
  });

  const deleteMeetingMut = useMutation({
    mutationFn: (mid: number) => apiRequest("DELETE", `/api/projects/${pid}/prestart/${mid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart`] });
      setConfirmDeleteId(null);
      toast({ title: "Pre-start deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeMut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/projects/${pid}/prestart/${meetingId}`, { status: "closed" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart/${meetingId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart`] });
      setShowClose(false);
      toast({ title: "Meeting closed" });
    },
  });

  const addAttendeeMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${pid}/prestart/${meetingId}/attendance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart/${meetingId}/attendance`] });
      setAttendeeForm({ name: "", company: "", role: "" });
    },
  });

  const removeAttendeeMut = useMutation({
    mutationFn: (aid: number) => apiRequest("DELETE", `/api/prestart-attendance/${aid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart/${meetingId}/attendance`] }),
  });

  function updateField(key: string, value: any) {
    if (isClosed) return;
    updateMut.mutate({ [key]: value });
  }

  function updateZones(zones: any[], field: string) {
    updateMut.mutate({ [field]: JSON.stringify(zones) });
  }

  function addZone() {
    const z = { id: uuid(), name: "New Zone", trade: "", hours: "07:00–15:30", colour: ZONE_COLOURS[activeZones.length % ZONE_COLOURS.length] };
    updateZones([...activeZones, z], "activeZonesJson");
  }
  function updateZoneField(zid: string, key: string, val: string) {
    updateZones(activeZones.map(z => z.id === zid ? { ...z, [key]: val } : z), "activeZonesJson");
  }
  function removeZone(zid: string) {
    updateZones(activeZones.filter(z => z.id !== zid), "activeZonesJson");
  }

  function addExclusion() {
    const z = { id: uuid(), name: "Exclusion Zone", detail: "", from: "", to: "" };
    updateZones([...exclusionZones, z], "exclusionZonesJson");
  }
  function updateExclusionField(zid: string, key: string, val: string) {
    updateZones(exclusionZones.map(z => z.id === zid ? { ...z, [key]: val } : z), "exclusionZonesJson");
  }
  function removeExclusion(zid: string) {
    updateZones(exclusionZones.filter(z => z.id !== zid), "exclusionZonesJson");
  }

  function addEmergencyContact() {
    const c = { id: uuid(), name: "", role: "", phone: "" };
    updateZones([...emergencyContacts, c], "emergencyContactsJson");
  }
  function updateContactField(cid: string, key: string, val: string) {
    updateZones(emergencyContacts.map(c => c.id === cid ? { ...c, [key]: val } : c), "emergencyContactsJson");
  }
  function removeContact(cid: string) {
    updateZones(emergencyContacts.filter(c => c.id !== cid), "emergencyContactsJson");
  }

  // Plan upload
  function handlePlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = (ev.target?.result as string).split(",")[1];
      apiRequest("POST", `/api/projects/${pid}/prestart/${meetingId}/plan`, { data: b64, mime: file.type })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart/${meetingId}`] });
          toast({ title: "Site plan uploaded" });
        });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Generic photo upload — supports multiple files and photo_type
  async function uploadFiles(files: File[], photoType: string, zoneId?: string) {
    setUploadingPhotos(true);
    try {
      for (const file of files) {
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const b64 = (ev.target?.result as string).split(",")[1];
              await apiRequest("POST", `/api/projects/${pid}/prestart/${meetingId}/photos`, {
                photoData: b64,
                photoMime: file.type,
                zoneId: zoneId ?? null,
                caption: photoCaption || file.name.replace(/\.[^/.]+$/, ""),
                photoType,
              });
              resolve();
            } catch (err) { reject(err); }
          };
          reader.readAsDataURL(file);
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/prestart/${meetingId}/photos`] });
      setPhotoCaption("");
      toast({ title: `${files.length} photo${files.length > 1 ? "s" : ""} uploaded` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingPhotos(false);
    }
  }

  // ── Meeting list view ────────────────────────────────────────────────────────
  if (!meetingId) {
    return (
      <Layout projectId={pid} projectName={project?.name} breadcrumb="Pre-Start Meetings">
        <div className="px-4 py-4 md:px-6 md:py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Pre-Start Meetings</h1>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Meeting
            </Button>
          </div>

          {listLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-center">
              <HardHat className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium">No pre-start meetings yet</p>
              <Button size="sm" className="mt-4" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Meeting</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.map((m: any) => (
                <div key={m.id}
                  className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:shadow-sm cursor-pointer transition-shadow group"
                  onClick={() => navigate(`/projects/${pid}/prestart/${m.id}`)}
                >
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-lg"><HardHat className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" }) : ""}</p>
                  </div>
                  <Badge variant={m.status === "closed" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                    {m.status === "closed" ? "Closed" : "Draft"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(m.id); }}
                    title="Delete pre-start"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Confirm delete dialog ── */}
        <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Pre-Start?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This will permanently delete the pre-start meeting and all its photos. This cannot be undone.</p>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMeetingMut.isPending}
                onClick={() => confirmDeleteId && deleteMeetingMut.mutate(confirmDeleteId)}
              >
                {deleteMeetingMut.isPending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Pre-Start Meeting</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createMut.mutate({ ...newForm, createdBy: user?.id }); }} className="space-y-4 mt-2">
              <div className="space-y-1.5"><Label>Title</Label><Input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="Pre-Start — Week 14" required /></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={newForm.meetingDate} onChange={e => setNewForm(f => ({ ...f, meetingDate: e.target.value }))} required /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // ── Meeting detail view ──────────────────────────────────────────────────────
  if (!m) return <Layout projectId={pid} projectName={project?.name}><div className="p-8 text-muted-foreground">Loading…</div></Layout>;

  return (
    <Layout projectId={pid} projectName={project?.name} breadcrumb="Pre-Start Meetings">
      <div className="px-4 py-4 md:px-6 md:py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3">
            <Button size="icon" variant="ghost" onClick={() => navigate(`/projects/${pid}/prestart`)} className="h-8 w-8 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              {isClosed ? (
                <h1 className="text-xl font-bold">{m.title}</h1>
              ) : (
                <input
                  className="text-xl font-bold bg-transparent border-0 outline-none w-full"
                  defaultValue={m.title}
                  onBlur={e => updateField("title", e.target.value)}
                  disabled={isClosed}
                />
              )}
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" }) : ""}
                </p>
                <Badge variant={isClosed ? "secondary" : "outline"} className="text-[10px]">
                  {isClosed ? <><Lock className="h-2.5 w-2.5 mr-1" />Closed</> : "Draft"}
                </Badge>
              </div>
            </div>
          </div>
          {!isClosed && (
            <Button size="sm" variant="outline" onClick={() => setShowClose(true)}>
              <Lock className="h-4 w-4 mr-1" /> Close Meeting
            </Button>
          )}
        </div>

        {isClosed && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4" /> This meeting is closed and is read-only.
          </div>
        )}

        <div className="space-y-6">

          {/* ── Site Plan ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold mb-2">Site Plan</h2>
            {hasPlan ? (
              <div className="border rounded-lg overflow-hidden">
                <img src={`/api/projects/${pid}/prestart/${meetingId}/plan`} alt="Site Plan" className="w-full max-h-96 object-contain bg-muted" />
                {!isClosed && (
                  <div className="p-2 border-t flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => planRef.current?.click()}>
                      <Upload className="h-3 w-3 mr-1" /> Replace Plan
                    </Button>
                    <p className="text-xs text-muted-foreground">Upload a new image or PDF to replace</p>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={cn("border-2 border-dashed rounded-lg p-8 text-center", !isClosed && "cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors")}
                onClick={() => !isClosed && planRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium">Upload Site Plan</p>
                <p className="text-xs text-muted-foreground mt-1">Image (JPG, PNG) or PDF</p>
              </div>
            )}
            <input ref={planRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handlePlanUpload} />
          </section>

          <Separator />

          {/* ── Photos & Maps Gallery ─────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">Site Photos &amp; Maps</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload aerial photos, drone shots, exclusion zone maps, and site photos
                </p>
              </div>
              <Badge variant="outline" className="text-xs">{photos.length} file{photos.length !== 1 ? "s" : ""}</Badge>
            </div>

            {!isClosed && (
              <div className="space-y-3 mb-4">
                {/* Optional caption */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Caption / label (optional — applies to next upload)"
                    value={photoCaption}
                    onChange={e => setPhotoCaption(e.target.value)}
                    className="h-8 text-xs flex-1"
                    data-testid="prestart-photo-caption"
                  />
                </div>

                {/* Three upload zones */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <PhotoDropZone
                    label="Site Photos"
                    icon={<Camera className="h-5 w-5 text-amber-500" />}
                    accept="image/*"
                    multiple
                    disabled={uploadingPhotos}
                    onFiles={files => uploadFiles(files, "site")}
                  />
                  <PhotoDropZone
                    label="Maps / Plans"
                    icon={<Map className="h-5 w-5 text-blue-500" />}
                    accept="image/*,.pdf"
                    multiple
                    disabled={uploadingPhotos}
                    onFiles={files => uploadFiles(files, "map")}
                  />
                  <PhotoDropZone
                    label="Exclusion Zone Maps"
                    icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                    accept="image/*,.pdf"
                    multiple
                    disabled={uploadingPhotos}
                    onFiles={files => uploadFiles(files, "exclusion")}
                  />
                </div>

                {uploadingPhotos && (
                  <p className="text-xs text-muted-foreground animate-pulse text-center">Uploading…</p>
                )}
              </div>
            )}

            {/* Photo gallery */}
            {photos.length === 0 ? (
              <Card className="border-dashed border-border/40">
                <CardContent className="py-10 text-center">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No photos or maps uploaded yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Maps */}
                {mapPhotos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Map className="h-3.5 w-3.5 text-blue-500" /> Maps &amp; Plans ({mapPhotos.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {mapPhotos.map((p: any) => (
                        <PhotoCard key={p.id} photo={p} projectId={pid} meetingId={meetingId!} disabled={isClosed} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Exclusion zone photos */}
                {exclusionPhotos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Exclusion Zone Maps ({exclusionPhotos.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {exclusionPhotos.map((p: any) => (
                        <PhotoCard key={p.id} photo={p} projectId={pid} meetingId={meetingId!} disabled={isClosed} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Site photos */}
                {sitePhotos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-amber-500" /> Site Photos ({sitePhotos.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {sitePhotos.map((p: any) => (
                        <PhotoCard key={p.id} photo={p} projectId={pid} meetingId={meetingId!} disabled={isClosed} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <Separator />

          {/* ── Active Work Zones ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Active Work Zones</h2>
              {!isClosed && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addZone}><Plus className="h-3 w-3 mr-1" /> Add Zone</Button>}
            </div>
            {activeZones.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No zones added yet</p>
            ) : (
              <div className="space-y-3">
                {activeZones.map(zone => (
                  <div key={zone.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: zone.colour }} />
                      {isClosed ? (
                        <span className="font-medium text-sm">{zone.name}</span>
                      ) : (
                        <input className="font-medium text-sm bg-transparent border-0 outline-none flex-1" defaultValue={zone.name} onBlur={e => updateZoneField(zone.id, "name", e.target.value)} />
                      )}
                      {!isClosed && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeZone(zone.id)}><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Trade:</span>{" "}
                        {isClosed ? zone.trade : (
                          <input className="bg-transparent border-b border-border outline-none w-28" defaultValue={zone.trade} onBlur={e => updateZoneField(zone.id, "trade", e.target.value)} />
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hours:</span>{" "}
                        {isClosed ? zone.hours : (
                          <input className="bg-transparent border-b border-border outline-none w-28" defaultValue={zone.hours} onBlur={e => updateZoneField(zone.id, "hours", e.target.value)} />
                        )}
                      </div>
                    </div>
                    {/* Zone-specific photos */}
                    <div className="mt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {zonePhotos(zone.id).map((p: any) => (
                          <div key={p.id} className="relative group">
                            <img
                              src={`/api/prestart-photos/${p.id}`}
                              alt={p.caption || "photo"}
                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-90"
                            />
                            {p.caption && <p className="text-[10px] text-muted-foreground mt-0.5 truncate w-16">{p.caption}</p>}
                          </div>
                        ))}
                        {!isClosed && (
                          <label className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                            <Camera className="h-4 w-4 text-muted-foreground/50" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const files = Array.from(e.target.files ?? []);
                                if (files.length) uploadFiles(files, "site", zone.id);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* ── Exclusion Zones ───────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Exclusion Zones</h2>
              {!isClosed && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addExclusion}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
            </div>
            {exclusionZones.length === 0 ? <p className="text-sm text-muted-foreground italic">No exclusion zones</p> : (
              <div className="space-y-2">
                {exclusionZones.map(z => (
                  <div key={z.id} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      {isClosed ? (
                        <>
                          <span className="font-medium col-span-2">{z.name}</span>
                          <span className="text-muted-foreground">{z.detail}</span>
                          <span className="text-muted-foreground">{z.from && z.to ? `${z.from}–${z.to}` : ""}</span>
                        </>
                      ) : (
                        <>
                          <input className="font-medium bg-transparent border-b border-red-200 outline-none col-span-2" defaultValue={z.name} placeholder="Zone name" onBlur={e => updateExclusionField(z.id, "name", e.target.value)} />
                          <input className="bg-transparent border-b border-red-200 outline-none text-xs" defaultValue={z.detail} placeholder="Detail" onBlur={e => updateExclusionField(z.id, "detail", e.target.value)} />
                          <div className="flex gap-1 text-xs">
                            <input type="time" className="bg-transparent border-b border-red-200 outline-none w-20" defaultValue={z.from} onBlur={e => updateExclusionField(z.id, "from", e.target.value)} />
                            <span>–</span>
                            <input type="time" className="bg-transparent border-b border-red-200 outline-none w-20" defaultValue={z.to} onBlur={e => updateExclusionField(z.id, "to", e.target.value)} />
                          </div>
                        </>
                      )}
                    </div>
                    {!isClosed && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeExclusion(z.id)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* ── Emergency Contacts ────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Emergency Contacts</h2>
              {!isClosed && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addEmergencyContact}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
            </div>
            {emergencyContacts.length === 0 ? <p className="text-sm text-muted-foreground italic">No emergency contacts</p> : (
              <div className="space-y-2">
                {emergencyContacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2 border rounded-lg text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {isClosed ? (
                      <span>{c.name} · {c.role} · {c.phone}</span>
                    ) : (
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input className="bg-transparent border-b border-border outline-none" defaultValue={c.name} placeholder="Name" onBlur={e => updateContactField(c.id, "name", e.target.value)} />
                        <input className="bg-transparent border-b border-border outline-none" defaultValue={c.role} placeholder="Role" onBlur={e => updateContactField(c.id, "role", e.target.value)} />
                        <input className="bg-transparent border-b border-border outline-none" defaultValue={c.phone} placeholder="Phone" onBlur={e => updateContactField(c.id, "phone", e.target.value)} />
                      </div>
                    )}
                    {!isClosed && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeContact(c.id)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* ── General Notes ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold mb-2">General Notes</h2>
            {isClosed ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.general_notes || "No notes recorded"}</p>
            ) : (
              <Textarea
                defaultValue={m.general_notes ?? ""}
                onBlur={e => updateField("generalNotes", e.target.value)}
                placeholder="Add general notes, weather observations, safety reminders…"
                rows={4}
              />
            )}
          </section>

          <Separator />

          {/* ── Attendance ────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold mb-3">Attendance ({attendance.length})</h2>
            {!isClosed && (
              <div className="flex items-end gap-2 mb-3 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input className="h-7 text-xs w-36" value={attendeeForm.name} onChange={e => setAttendeeForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Input className="h-7 text-xs w-32" value={attendeeForm.company} onChange={e => setAttendeeForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Input className="h-7 text-xs w-28" value={attendeeForm.role} onChange={e => setAttendeeForm(f => ({ ...f, role: e.target.value }))} placeholder="Role" />
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={() => { if (attendeeForm.name) addAttendeeMut.mutate(attendeeForm); }}><UserPlus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
            )}
            <div className="space-y-1.5">
              {attendance.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 text-sm p-2 bg-muted/30 rounded">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">{a.name?.[0]}</div>
                  <span className="font-medium">{a.name}</span>
                  {a.company && <span className="text-muted-foreground">{a.company}</span>}
                  {a.role && <Badge variant="outline" className="text-[10px] h-4">{a.role}</Badge>}
                  {!isClosed && (
                    <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto text-muted-foreground" onClick={() => removeAttendeeMut.mutate(a.id)}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Close dialog */}
      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close This Meeting?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Once closed, this meeting will be locked and cannot be edited. This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClose(false)}>Cancel</Button>
            <Button onClick={() => closeMut.mutate()} variant="destructive">Close Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
