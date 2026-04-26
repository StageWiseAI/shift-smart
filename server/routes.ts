import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseXMLTasks(xml: string): any[] {
  const tasks: any[] = [];
  const taskRegex = /<Task>([\s\S]*?)<\/Task>/g;
  let match;
  while ((match = taskRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
      return m ? m[1].trim() : null;
    };
    const uid = get("UID");
    if (!uid || uid === "0") continue;
    tasks.push({
      uid,
      name: get("Name") || "Unnamed",
      start: get("Start"),
      finish: get("Finish"),
      duration: get("Duration"),
      isMilestone: get("Milestone") === "1",
      outlineLevel: parseInt(get("OutlineLevel") || "1"),
      wbsLevel: parseInt(get("WBS")?.split(".")?.length?.toString() || "1"),
      isSummary: get("Summary") === "1",
    });
  }
  return tasks;
}

function detectCycleDays(tasks: any[]): number | null {
  // Find repeating structural tasks — look for tasks named similarly with sequential start dates
  const structural = tasks.filter(t =>
    !t.isMilestone && !t.isSummary &&
    /slab|pour|concrete|floor|structure|level/i.test(t.name || "")
  );
  if (structural.length < 2) return null;
  const withDates = structural
    .filter(t => t.start)
    .map(t => ({ ...t, startMs: new Date(t.start).getTime() }))
    .filter(t => !isNaN(t.startMs))
    .sort((a, b) => a.startMs - b.startMs);
  if (withDates.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < Math.min(withDates.length, 6); i++) {
    const diff = (withDates[i].startMs - withDates[i - 1].startMs) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff <= 30) gaps.push(diff);
  }
  if (!gaps.length) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

function shiftTasksFromDate(tasks: any[], fromDate: string, hours: number): any[] {
  const from = new Date(fromDate).getTime();
  const shiftMs = hours * 60 * 60 * 1000;
  return tasks.map(t => {
    const s = t.start ? new Date(t.start).getTime() : null;
    if (!s || s < from) return t;
    return {
      ...t,
      start: new Date(s + shiftMs).toISOString().split("T")[0],
      finish: t.finish ? new Date(new Date(t.finish).getTime() + shiftMs).toISOString().split("T")[0] : t.finish,
    };
  });
}

function applyNewCycle(tasks: any[], originalCycleDays: number, newCycleDays: number): any[] {
  if (!originalCycleDays || originalCycleDays === newCycleDays) return tasks;
  const ratio = newCycleDays / originalCycleDays;
  const withDates = tasks.filter(t => t.start);
  if (!withDates.length) return tasks;
  const baseMs = new Date(withDates[0].start).getTime();
  return tasks.map(t => {
    if (!t.start) return t;
    const offsetDays = (new Date(t.start).getTime() - baseMs) / (1000 * 60 * 60 * 24);
    const newOffsetDays = Math.round(offsetDays * ratio);
    const newStart = new Date(baseMs + newOffsetDays * 86400000);
    let newFinish = t.finish ? (() => {
      const origDurDays = Math.max(1, (new Date(t.finish).getTime() - new Date(t.start).getTime()) / 86400000);
      const newDurDays = Math.round(origDurDays * ratio);
      return new Date(newStart.getTime() + newDurDays * 86400000).toISOString().split("T")[0];
    })() : t.finish;
    return {
      ...t,
      start: newStart.toISOString().split("T")[0],
      finish: newFinish,
    };
  });
}

function getLookahead(tasks: any[], fromDate: string, weeks: number, section?: string): any[] {
  const from = new Date(fromDate).getTime();
  const to = from + weeks * 7 * 24 * 60 * 60 * 1000;
  return tasks.filter(t => {
    if (!t.start) return false;
    const s = new Date(t.start).getTime();
    if (s < from || s > to) return false;
    if (section) {
      return t.name?.toLowerCase().includes(section.toLowerCase());
    }
    return true;
  });
}

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req: any, res: any, next: any) {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const user = storage.getUserById(parseInt(userId as string));
  if (!user) return res.status(401).json({ error: "User not found" });
  req.user = user;
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

function audit(req: any, action: string, entity: string, entityId?: any, detail?: string, projectId?: number) {
  if (!req.user) return;
  storage.addAuditEntry({
    projectId: projectId ?? null,
    userId: req.user.id,
    userEmail: req.user.email,
    action,
    entity,
    entityId: entityId?.toString(),
    detail,
  });
}

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // ── Auth ────────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const user = storage.getUserByEmail(email);
    if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
    const { password: _, ...safeUser } = user;
    audit({ user }, "login", "auth", user.id);
    return res.json({ user: safeUser });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    const { password: _, ...safe } = req.user;
    res.json({ user: safe });
  });

  // ── Users (admin) ───────────────────────────────────────────────────────────
  app.get("/api/users", requireAuth, requireAdmin, (req: any, res) => {
    res.json(storage.getAllUsers().map(({ password: _, ...u }) => u));
  });

  app.post("/api/users", requireAuth, requireAdmin, (req: any, res) => {
    const { name, email, password, role, jobTitle } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password required" });
    try {
      const user = storage.createUser({ name, email, password, role: role || "site_manager", jobTitle });
      audit(req, "create", "user", user.id, `Created ${email}`);
      const { password: _, ...safe } = user;
      res.json(safe);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireAdmin, (req: any, res) => {
    const user = storage.updateUser(parseInt(req.params.id), req.body);
    if (!user) return res.status(404).json({ error: "User not found" });
    audit(req, "update", "user", user.id, `Updated ${user.email}`);
    const { password: _, ...safe } = user;
    res.json(safe);
  });

  app.delete("/api/users/:id", requireAuth, requireAdmin, (req: any, res) => {
    storage.deleteUser(parseInt(req.params.id));
    audit(req, "delete", "user", req.params.id);
    res.json({ ok: true });
  });

  // ── Projects ─────────────────────────────────────────────────────────────────
  app.get("/api/projects", requireAuth, (req: any, res) => {
    res.json(storage.getProjectsForUser(req.user.id, req.user.role));
  });

  app.post("/api/projects", requireAuth, (req: any, res) => {
    const { name, contractNumber, client, startDate, endDate } = req.body;
    if (!name) return res.status(400).json({ error: "Project name required" });
    const project = storage.createProject({ name, contractNumber, client, startDate, endDate, status: "active", ownerId: req.user.id });
    audit(req, "create", "project", project.id, `Created project: ${name}`);
    res.json(project);
  });

  app.get("/api/projects/:id", requireAuth, (req: any, res) => {
    const project = storage.getProjectById(parseInt(req.params.id));
    if (!project) return res.status(404).json({ error: "Not found" });
    res.json(project);
  });

  app.patch("/api/projects/:id", requireAuth, (req: any, res) => {
    const project = storage.updateProject(parseInt(req.params.id), req.body);
    if (!project) return res.status(404).json({ error: "Not found" });
    audit(req, "update", "project", project.id, `Updated: ${project.name}`, project.id);
    res.json(project);
  });

  app.get("/api/projects/:id/members", requireAuth, (req: any, res) => {
    res.json(storage.getProjectMembers(parseInt(req.params.id)).map(({ password: _, ...u }) => u));
  });

  app.post("/api/projects/:id/members", requireAuth, requireAdmin, (req: any, res) => {
    storage.addProjectMember(parseInt(req.params.id), req.body.userId);
    audit(req, "add_member", "project", req.params.id, `Added user ${req.body.userId}`, parseInt(req.params.id));
    res.json({ ok: true });
  });

  app.delete("/api/projects/:id/members/:userId", requireAuth, requireAdmin, (req: any, res) => {
    storage.removeProjectMember(parseInt(req.params.id), parseInt(req.params.userId));
    res.json({ ok: true });
  });

  // ── Programme ─────────────────────────────────────────────────────────────────
  app.get("/api/projects/:id/programmes", requireAuth, (req: any, res) => {
    const programmes = storage.getProgrammes(parseInt(req.params.id));
    // Don't return full XML in list
    res.json(programmes.map(p => ({ ...p, xmlData: undefined, tasksJson: undefined })));
  });

  app.post("/api/projects/:id/programmes/upload", requireAuth, (req: any, res) => {
    const { xml, label, type } = req.body;
    if (!xml) return res.status(400).json({ error: "XML data required" });
    const tasks = parseXMLTasks(xml);
    const cycle = detectCycleDays(tasks);
    const prog = storage.createProgramme({
      projectId: parseInt(req.params.id),
      label: label || `Upload ${new Date().toLocaleDateString("en-AU")}`,
      type: type || "baseline",
      xmlData: xml,
      tasksJson: JSON.stringify(tasks),
      uploadedBy: req.user.id,
      cycleDetectedDays: cycle ?? undefined,
    });
    audit(req, "upload", "programme", prog.id, `Uploaded: ${prog.label}`, parseInt(req.params.id));
    res.json({ ...prog, xmlData: undefined, tasks, cycleDetected: cycle });
  });

  app.get("/api/projects/:id/programmes/:progId/tasks", requireAuth, (req: any, res) => {
    const prog = storage.getProgrammeById(parseInt(req.params.progId));
    if (!prog) return res.status(404).json({ error: "Not found" });
    res.json({ tasks: JSON.parse(prog.tasksJson), cycleDetectedDays: prog.cycleDetectedDays });
  });

  // Lookahead
  app.get("/api/projects/:id/programmes/:progId/lookahead", requireAuth, (req: any, res) => {
    const prog = storage.getProgrammeById(parseInt(req.params.progId));
    if (!prog) return res.status(404).json({ error: "Not found" });
    const { from, weeks = "2", section } = req.query as any;
    const tasks = JSON.parse(prog.tasksJson);
    const fromDate = from || new Date().toISOString().split("T")[0];
    const result = getLookahead(tasks, fromDate, parseInt(weeks), section);
    res.json({ tasks: result, from: fromDate, weeks: parseInt(weeks), section: section || null });
  });

  // ── EOT ──────────────────────────────────────────────────────────────────────
  app.get("/api/projects/:id/eot", requireAuth, (req: any, res) => {
    res.json(storage.getEotEvents(parseInt(req.params.id)));
  });

  app.post("/api/projects/:id/eot", requireAuth, (req: any, res) => {
    const { programmeId, type, description, delayHours, appliedFrom } = req.body;
    if (!programmeId || !type || !delayHours || !appliedFrom) {
      return res.status(400).json({ error: "programmeId, type, delayHours and appliedFrom required" });
    }
    const prog = storage.getProgrammeById(parseInt(programmeId));
    if (!prog) return res.status(404).json({ error: "Programme not found" });

    // Apply latest EOT chain if any
    const prevEots = storage.getEotEvents(parseInt(req.params.id)).filter(e => e.programmeId === parseInt(programmeId));
    let baseTasks = prevEots.length > 0
      ? JSON.parse(prevEots[0].adjustedTasksJson)
      : JSON.parse(prog.tasksJson);

    const adjusted = shiftTasksFromDate(baseTasks, appliedFrom, parseFloat(delayHours));
    const eot = storage.createEotEvent({
      projectId: parseInt(req.params.id),
      programmeId: parseInt(programmeId),
      type,
      description: description || type,
      delayHours: parseFloat(delayHours),
      appliedFrom,
      adjustedTasksJson: JSON.stringify(adjusted),
      createdBy: req.user.id,
    });
    audit(req, "create", "eot", eot.id, `EOT ${delayHours}h from ${appliedFrom}`, parseInt(req.params.id));
    res.json({ eot, tasks: adjusted });
  });

  // ── Cycle override ────────────────────────────────────────────────────────────
  app.post("/api/projects/:id/programmes/:progId/cycle", requireAuth, (req: any, res) => {
    const { newCycleDays } = req.body;
    if (!newCycleDays) return res.status(400).json({ error: "newCycleDays required" });
    const prog = storage.getProgrammeById(parseInt(req.params.progId));
    if (!prog) return res.status(404).json({ error: "Not found" });
    const originalCycle = prog.cycleDetectedDays || 8;
    const tasks = JSON.parse(prog.tasksJson);
    const generated = applyNewCycle(tasks, originalCycle, parseFloat(newCycleDays));
    const co = storage.createCycleOverride({
      projectId: parseInt(req.params.id),
      programmeId: prog.id,
      newCycleDays: parseFloat(newCycleDays),
      generatedTasksJson: JSON.stringify(generated),
      createdBy: req.user.id,
    });
    audit(req, "cycle_override", "programme", prog.id, `Cycle changed to ${newCycleDays} days`, parseInt(req.params.id));
    res.json({ cycleOverride: co, tasks: generated, originalCycleDays: originalCycle });
  });

  app.get("/api/projects/:id/cycle-overrides", requireAuth, (req: any, res) => {
    res.json(storage.getCycleOverrides(parseInt(req.params.id)));
  });

  // ── Material deliveries ───────────────────────────────────────────────────────
  app.get("/api/projects/:id/deliveries", requireAuth, (req: any, res) => {
    res.json(storage.getDeliveries(parseInt(req.params.id)));
  });

  app.post("/api/projects/:id/deliveries", requireAuth, (req: any, res) => {
    const d = storage.createDelivery({ ...req.body, projectId: parseInt(req.params.id), createdBy: req.user.id });
    audit(req, "create", "delivery", d.id, `${d.material} on ${d.deliveryDate}`, parseInt(req.params.id));
    res.json(d);
  });

  app.patch("/api/projects/:id/deliveries/:did", requireAuth, (req: any, res) => {
    const d = storage.updateDelivery(parseInt(req.params.did), req.body);
    if (!d) return res.status(404).json({ error: "Not found" });
    audit(req, "update", "delivery", d.id, `Updated ${d.material}`, parseInt(req.params.id));
    res.json(d);
  });

  app.delete("/api/projects/:id/deliveries/:did", requireAuth, (req: any, res) => {
    storage.deleteDelivery(parseInt(req.params.did));
    audit(req, "delete", "delivery", req.params.did, undefined, parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ── Pre-start ────────────────────────────────────────────────────────────────
  app.get("/api/projects/:id/prestart", requireAuth, (req: any, res) => {
    res.json(storage.listPrestartMeetings(parseInt(req.params.id)));
  });

  app.post("/api/projects/:id/prestart", requireAuth, (req: any, res) => {
    const m = storage.createPrestartMeeting({ ...req.body, projectId: parseInt(req.params.id), createdBy: req.user.id });
    audit(req, "create", "prestart", (m as any).id, `Pre-start: ${req.body.title}`, parseInt(req.params.id));
    res.json(m);
  });

  app.get("/api/projects/:id/prestart/:mid", requireAuth, (req: any, res) => {
    const m = storage.getPrestartMeeting(parseInt(req.params.mid));
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });

  app.patch("/api/projects/:id/prestart/:mid", requireAuth, (req: any, res) => {
    const m = storage.updatePrestartMeeting(parseInt(req.params.mid), req.body);
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });

  app.post("/api/projects/:id/prestart/:mid/plan", requireAuth, (req: any, res) => {
    const { data, mime } = req.body;
    storage.updatePrestartMeeting(parseInt(req.params.mid), { sitePlanData: data, sitePlanMime: mime });
    res.json({ ok: true });
  });

  app.get("/api/projects/:id/prestart/:mid/plan", requireAuth, (req: any, res) => {
    const m = storage.getPrestartMeeting(parseInt(req.params.mid)) as any;
    if (!m || !m.site_plan_data) return res.status(404).json({ error: "No plan uploaded" });
    const buf = Buffer.from(m.site_plan_data, "base64");
    res.set("Content-Type", m.site_plan_mime || "image/png");
    res.send(buf);
  });

  app.post("/api/projects/:id/prestart/:mid/photos", requireAuth, (req: any, res) => {
    const photo = storage.addPrestartPhoto({ meetingId: parseInt(req.params.mid), ...req.body });
    res.json(photo);
  });

  app.get("/api/prestart-photos/:photoId", requireAuth, (req: any, res) => {
    const r = (storage as any).getPrestartPhotoData?.(parseInt(req.params.photoId));
    if (!r) return res.status(404).json({ error: "Not found" });
    const buf = Buffer.from(r.photo_data, "base64");
    res.set("Content-Type", r.photo_mime || "image/jpeg");
    res.send(buf);
  });

  app.delete("/api/prestart-photos/:photoId", requireAuth, (req: any, res) => {
    storage.deletePrestartPhoto(parseInt(req.params.photoId));
    res.json({ ok: true });
  });

  app.get("/api/projects/:id/prestart/:mid/photos", requireAuth, (req: any, res) => {
    res.json(storage.getPrestartPhotos(parseInt(req.params.mid)));
  });

  app.get("/api/projects/:id/prestart/:mid/attendance", requireAuth, (req: any, res) => {
    res.json(storage.getPrestartAttendance(parseInt(req.params.mid)));
  });

  app.post("/api/projects/:id/prestart/:mid/attendance", requireAuth, (req: any, res) => {
    res.json(storage.addPrestartAttendee({ meetingId: parseInt(req.params.mid), ...req.body }));
  });

  app.delete("/api/prestart-attendance/:aid", requireAuth, (req: any, res) => {
    storage.removePrestartAttendee(parseInt(req.params.aid));
    res.json({ ok: true });
  });

  // ── Meetings ──────────────────────────────────────────────────────────────────
  app.get("/api/projects/:id/meetings", requireAuth, (req: any, res) => {
    res.json(storage.getMeetings(parseInt(req.params.id)));
  });

  app.post("/api/projects/:id/meetings", requireAuth, (req: any, res) => {
    const m = storage.createMeeting({ ...req.body, projectId: parseInt(req.params.id), createdBy: req.user.id });
    audit(req, "create", "meeting", m.id, `Meeting: ${m.title}`, parseInt(req.params.id));
    res.json(m);
  });

  app.get("/api/projects/:id/meetings/:mid", requireAuth, (req: any, res) => {
    const m = storage.getMeetingById(parseInt(req.params.mid));
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });

  app.patch("/api/projects/:id/meetings/:mid", requireAuth, (req: any, res) => {
    // Handle audio upload (base64)
    const updateData: any = { ...req.body };
    const m = storage.updateMeeting(parseInt(req.params.mid), updateData);
    if (!m) return res.status(404).json({ error: "Not found" });
    audit(req, "update", "meeting", m.id, `Updated: ${m.title}`, parseInt(req.params.id));
    res.json(m);
  });

  app.delete("/api/projects/:id/meetings/:mid", requireAuth, (req: any, res) => {
    storage.deleteMeeting(parseInt(req.params.mid));
    audit(req, "delete", "meeting", req.params.mid, undefined, parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ── Audit ─────────────────────────────────────────────────────────────────────
  app.get("/api/audit", requireAuth, requireAdmin, (req: any, res) => {
    const pid = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    res.json(storage.getAuditLog(pid));
  });

  return httpServer;
}
