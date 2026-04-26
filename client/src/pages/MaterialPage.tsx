import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "./Layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Truck, Forklift, Edit2, Trash2, PackageCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const METHODS = [
  { value: "hand", label: "Hand Unload" },
  { value: "forklift", label: "Forklift" },
  { value: "crane", label: "Crane" },
];

const STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

function methodIcon(m: string) {
  if (m === "crane") return <span className="text-base">🏗️</span>;
  if (m === "forklift") return <Truck className="h-4 w-4" />;
  return <PackageCheck className="h-4 w-4" />;
}

function emptyForm() {
  return { deliveryDate: "", deliveryTime: "", material: "", supplier: "", unloadMethod: "hand", quantity: "", unit: "", location: "", notes: "", status: "scheduled" };
}

export default function MaterialPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const pid = parseInt(id);

  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [filterDate, setFilterDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");

  const { data: project } = useQuery<any>({ queryKey: [`/api/projects/${pid}`] });
  const { data: deliveries = [], isLoading } = useQuery<any[]>({ queryKey: [`/api/projects/${pid}/deliveries`] });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${pid}/deliveries`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/deliveries`] });
      toast({ title: "Delivery scheduled" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/projects/${pid}/deliveries/${editId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/deliveries`] });
      toast({ title: "Delivery updated" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (did: number) => apiRequest("DELETE", `/api/projects/${pid}/deliveries/${did}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/deliveries`] });
      toast({ title: "Delivery removed" });
      setDeleteId(null);
    },
  });

  function openCreate() { setForm(emptyForm()); setEditId(null); setShowDialog(true); }
  function openEdit(d: any) {
    setForm({
      deliveryDate: d.delivery_date ?? "", deliveryTime: d.delivery_time ?? "",
      material: d.material ?? "", supplier: d.supplier ?? "",
      unloadMethod: d.unload_method ?? "hand", quantity: d.quantity ?? "",
      unit: d.unit ?? "", location: d.location ?? "", notes: d.notes ?? "",
      status: d.status ?? "scheduled",
    });
    setEditId(d.id); setShowDialog(true);
  }
  function closeDialog() { setShowDialog(false); setEditId(null); setForm(emptyForm()); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) updateMut.mutate(form); else createMut.mutate(form);
  }

  // Filter
  const filtered = deliveries.filter((d: any) => {
    if (filterDate && d.delivery_date !== filterDate) return false;
    if (filterMethod !== "all" && d.unload_method !== filterMethod) return false;
    return true;
  });

  // Group by date
  const grouped: Record<string, any[]> = {};
  for (const d of filtered) {
    const k = d.delivery_date || "Unscheduled";
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(d);
  }
  const sortedDates = Object.keys(grouped).sort();

  return (
    <Layout projectId={pid} projectName={project?.name} breadcrumb="Material Handling">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Material Handling</h1>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Schedule Delivery
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <Input type="date" className="w-40 h-8 text-xs" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All methods" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterDate || filterMethod !== "all") && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setFilterDate(""); setFilterMethod("all"); }}>
              Clear
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-center">
            <Truck className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No deliveries scheduled</p>
            <p className="text-sm text-muted-foreground mt-1">Add deliveries to track forklifts, cranes and hand unloads</p>
            <Button size="sm" className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Schedule Delivery</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {sortedDates.map(date => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {date === "Unscheduled" ? "Unscheduled" : new Date(date + "T00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="space-y-2">
                  {grouped[date].map((d: any) => {
                    const status = STATUSES.find(s => s.value === d.status) ?? STATUSES[0];
                    return (
                      <div key={d.id} className="flex items-start gap-3 p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="p-2 bg-muted rounded-lg text-muted-foreground flex-shrink-0">
                          {methodIcon(d.unload_method)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{d.material}</span>
                            <Badge className={cn("text-[10px] h-4 border-0", status.color)}>{status.label}</Badge>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {METHODS.find(m => m.value === d.unload_method)?.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                            {d.delivery_time && <span>⏰ {d.delivery_time}</span>}
                            {d.supplier && <span>Supplier: {d.supplier}</span>}
                            {d.quantity && <span>Qty: {d.quantity}{d.unit ? ` ${d.unit}` : ""}</span>}
                            {d.location && <span>📍 {d.location}</span>}
                          </div>
                          {d.notes && <p className="text-xs text-muted-foreground mt-1 italic">{d.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(d.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Delivery" : "Schedule Delivery"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Material / Item *</Label>
              <Input value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} placeholder="e.g. Formwork, Reo Bar, Concrete" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Delivery Date</Label>
                <Input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Time</Label>
                <Input type="time" value={form.deliveryTime} onChange={e => setForm(f => ({ ...f, deliveryTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unload Method</Label>
              <Select value={form.unloadMethod} onValueChange={v => setForm(f => ({ ...f, unloadMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Supplier</Label>
                <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Quantity</Label>
                <Input value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 20" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="m³, t, ea" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Drop Location on Site</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Level 3 slab, North laydown area" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes…" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editId ? "Save Changes" : "Schedule Delivery"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Delivery</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this delivery record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
