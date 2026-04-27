import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Users, ClipboardList, Search } from "lucide-react";
import { useAuth } from "../App";

function roleLabel(role: string) {
  if (role === "admin") return "Administrator";
  if (role === "site_manager") return "Site Manager";
  return role;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "site_manager", jobTitle: "" });
  const [auditSearch, setAuditSearch] = useState("");

  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: auditEntries = [] } = useQuery<any[]>({ queryKey: ["/api/audit"] });

  const createUserMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateUserMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/users/${editUser?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User removed" });
      setDeleteUserId(null);
    },
  });

  function openCreate() { setUserForm({ name: "", email: "", password: "", role: "site_manager", jobTitle: "" }); setEditUser(null); setShowUserDialog(true); }
  function openEdit(u: any) {
    setUserForm({ name: u.name, email: u.email, password: "", role: u.role, jobTitle: u.job_title ?? u.jobTitle ?? "" });
    setEditUser(u);
    setShowUserDialog(true);
  }
  function closeDialog() { setShowUserDialog(false); setEditUser(null); }

  function handleUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: any = { name: userForm.name, email: userForm.email, role: userForm.role, jobTitle: userForm.jobTitle };
    if (userForm.password) data.password = userForm.password;
    if (editUser) updateUserMut.mutate(data); else createUserMut.mutate({ ...data, password: userForm.password });
  }

  // Audit filter
  const filteredAudit = auditEntries.filter((e: any) => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (
      e.user_email?.toLowerCase().includes(q) ||
      e.action?.toLowerCase().includes(q) ||
      e.entity?.toLowerCase().includes(q) ||
      e.detail?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout breadcrumb="Admin">
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold mb-4">Administration</h1>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><Users className="h-3.5 w-3.5 mr-1" />Users</TabsTrigger>
            <TabsTrigger value="audit"><ClipboardList className="h-3.5 w-3.5 mr-1" />Audit Log</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users">
            <div className="flex justify-end mb-3 mt-3">
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Name</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Email</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Role</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Job Title</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">{u.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{u.email}</td>
                      <td className="py-2 px-3">
                        <Badge variant={u.role === "admin" ? "default" : "outline"} className="text-[10px] h-4">{roleLabel(u.role)}</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{u.job_title ?? u.jobTitle ?? "—"}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          {u.id !== user?.id && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteUserId(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Audit */}
          <TabsContent value="audit">
            <div className="mt-3 mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8 h-8 text-xs" placeholder="Search by user, action, or detail…" value={auditSearch} onChange={e => setAuditSearch(e.target.value)} />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-destructive border-destructive/40 hover:bg-destructive/10 shrink-0"
                onClick={async () => {
                  if (!confirm("Clear all audit log entries? This cannot be undone.")) return;
                  await apiRequest("DELETE", "/api/audit");
                  queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
                }}
              >
                Clear Log
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">When</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">User</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Action</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground text-xs">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No audit entries</td></tr>
                  ) : filteredAudit.slice(0, 200).map((e: any) => (
                    <tr key={e.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="py-1.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Australia/Brisbane" })}
                      </td>
                      <td className="py-1.5 px-3 text-xs">{e.user_email}</td>
                      <td className="py-1.5 px-3">
                        <Badge variant="outline" className="text-[10px] h-4">{e.action}</Badge>
                        <span className="text-xs text-muted-foreground ml-1">{e.entity}</span>
                      </td>
                      <td className="py-1.5 px-3 text-xs text-muted-foreground">{e.detail ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="space-y-1.5"><Label>Job Title</Label><Input value={userForm.jobTitle} onChange={e => setUserForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="Site Manager" /></div>
            </div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div className="space-y-1.5">
              <Label>{editUser ? "New Password (leave blank to keep)" : "Password *"}</Label>
              <Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} required={!editUser} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="site_manager">Site Manager</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit">{editUser ? "Save Changes" : "Create User"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteUserId} onOpenChange={v => { if (!v) setDeleteUserId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this user from Site Smart.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteUserId && deleteUserMut.mutate(deleteUserId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
