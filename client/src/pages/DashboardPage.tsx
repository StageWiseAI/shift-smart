import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "./Layout";
import { useAuth } from "../App";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FolderOpen, CalendarDays, Building2, ChevronRight, Trash2, Pencil } from "lucide-react";

interface Project {
  id: number;
  name: string;
  contractNumber?: string;
  client?: string;
  startDate?: string;
  endDate?: string;
  status: string;
}

const emptyForm = { name: "", contractNumber: "", client: "", startDate: "", endDate: "" };

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ name: "", contractNumber: "", client: "", startDate: "", endDate: "", status: "active" });

  const { data: projects = [], isLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteProject = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Create ────────────────────────────────────────────────────────────────
  const createProject = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created" });
      setShowNew(false);
      setForm(emptyForm);
      navigate(`/projects/${p.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Update ────────────────────────────────────────────────────────────────
  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated" });
      setEditProject(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    createProject.mutate(form);
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProject || !editForm.name.trim()) return;
    updateProject.mutate({ id: editProject.id, data: editForm });
  }

  function openEdit(p: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setEditProject(p);
    setEditForm({
      name: p.name ?? "",
      contractNumber: p.contractNumber ?? "",
      client: p.client ?? "",
      startDate: p.startDate ?? "",
      endDate: p.endDate ?? "",
      status: p.status ?? "active",
    });
  }

  const active = projects.filter((p: any) => p.status === "active");

  return (
    <Layout>
      <div className="px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">
              {user?.role === "admin" ? "All Projects" : "My Projects"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {active.length} active {active.length === 1 ? "project" : "projects"}
            </p>
          </div>
          <Button onClick={() => setShowNew(true)} size="sm" data-testid="button-new-project">
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No projects yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowNew(true)}>
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Card
                key={p.id}
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/projects/${p.id}`)}
                data-testid={`card-project-${p.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      {/* Edit button — admin only */}
                      {user?.role === "admin" && (
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                          onClick={(e) => openEdit(p, e)}
                          data-testid={`button-edit-project-${p.id}`}
                          title="Edit project details"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {/* Delete button — admin only */}
                      {user?.role === "admin" && (
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                          data-testid={`button-delete-project-${p.id}`}
                          title="Delete project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                  </div>
                  {p.contractNumber && (
                    <p className="text-xs text-muted-foreground font-mono">{p.contractNumber}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5">
                  {p.client && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" /> {p.client}
                    </div>
                  )}
                  {(p.startDate || p.endDate) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {p.startDate && new Date(p.startDate).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane" })}
                      {p.startDate && p.endDate && " – "}
                      {p.endDate && new Date(p.endDate).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane" })}
                    </div>
                  )}
                  <Badge
                    variant={p.status === "active" ? "default" : "secondary"}
                    className="text-[10px] h-5 mt-1"
                  >
                    {p.status === "active" ? "Active" : p.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── New Project Dialog ── */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Project Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Newstead Property Development"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contract Number</Label>
                <Input
                  value={form.contractNumber}
                  onChange={e => setForm(f => ({ ...f, contractNumber: e.target.value }))}
                  placeholder="HTG-BNE-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Input
                  value={form.client}
                  onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  placeholder="Hutchinson Builders"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowNew(false); setForm(emptyForm); }}>Cancel</Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating…" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Project Dialog ── */}
      <Dialog open={!!editProject} onOpenChange={open => { if (!open) setEditProject(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Project Name <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required
                data-testid="edit-project-name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contract Number</Label>
                <Input
                  value={editForm.contractNumber}
                  onChange={e => setEditForm(f => ({ ...f, contractNumber: e.target.value }))}
                  placeholder="HTG-BNE-001"
                  data-testid="edit-project-contract"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Input
                  value={editForm.client}
                  onChange={e => setEditForm(f => ({ ...f, client: e.target.value }))}
                  placeholder="Hutchinson Builders"
                  data-testid="edit-project-client"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                  data-testid="edit-project-start"
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                  data-testid="edit-project-end"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={val => setEditForm(f => ({ ...f, status: val }))}
              >
                <SelectTrigger data-testid="edit-project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
              <Button type="submit" disabled={updateProject.isPending || !editForm.name.trim()}>
                {updateProject.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Dialog ── */}
      <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the project and all its data — programme, materials, meetings, emails and RFIs. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteProject.isPending}
              onClick={() => { if (confirmDelete) { deleteProject.mutate(confirmDelete); setConfirmDelete(null); } }}
            >
              {deleteProject.isPending ? "Deleting…" : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
