import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and, gte, lte } from "drizzle-orm";
import path from "path";
import {
  users, projects, projectMembers, programmes, eotEvents, cycleOverrides,
  materialDeliveries, prestartMeetings, prestartPhotos, prestartAttendance,
  meetings, auditLog,
  type User, type InsertUser,
  type Project, type InsertProject,
  type Programme, type InsertProgramme,
  type EotEvent, type InsertEot,
  type MaterialDelivery, type InsertDelivery,
  type Meeting, type InsertMeeting,
} from "@shared/schema";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "sitesmart.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

function now() {
  return new Date().toISOString();
}

// ── Bootstrap tables ─────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'site_manager',
    job_title TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contract_number TEXT,
    client TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    owner_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS programmes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'baseline',
    xml_data TEXT NOT NULL,
    tasks_json TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT '',
    uploaded_by INTEGER NOT NULL,
    cycle_detected_days REAL
  );
  CREATE TABLE IF NOT EXISTS eot_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    programme_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    delay_hours REAL NOT NULL,
    applied_from TEXT NOT NULL,
    adjusted_tasks_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cycle_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    programme_id INTEGER NOT NULL,
    new_cycle_days REAL NOT NULL,
    generated_tasks_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS material_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    delivery_date TEXT NOT NULL,
    delivery_time TEXT,
    material TEXT NOT NULL,
    supplier TEXT,
    unload_method TEXT NOT NULL DEFAULT 'hand',
    quantity TEXT,
    unit TEXT,
    location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS prestart_meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    meeting_date TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    site_plan_data TEXT,
    site_plan_mime TEXT,
    active_zones_json TEXT NOT NULL DEFAULT '[]',
    exclusion_zones_json TEXT NOT NULL DEFAULT '[]',
    emergency_contacts_json TEXT NOT NULL DEFAULT '[]',
    general_notes TEXT,
    weather_conditions TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS prestart_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL,
    zone_id TEXT,
    caption TEXT,
    photo_data TEXT NOT NULL,
    photo_mime TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS prestart_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    role TEXT
  );
  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    meeting_date TEXT NOT NULL,
    meeting_time TEXT,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    attendees_json TEXT NOT NULL DEFAULT '[]',
    agenda_json TEXT NOT NULL DEFAULT '[]',
    minutes_text TEXT,
    audio_data TEXT,
    audio_mime TEXT,
    actions_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    user_id INTEGER NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );
`);

// Seed admin if none exists
const adminExists = sqlite.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
if (!adminExists) {
  sqlite.prepare(`INSERT INTO users (name, email, password, role, created_at) VALUES (?,?,?,?,?)`).run(
    "TrustShyft Admin", "admin@trustshyft.com.au", "TrustShyft2026!", "admin", now()
  );
}

// ── Storage interface ─────────────────────────────────────────────────────────
export interface IStorage {
  // Auth
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  getAllUsers(): User[];
  createUser(data: InsertUser): User;
  updateUser(id: number, data: Partial<InsertUser>): User | undefined;
  deleteUser(id: number): void;

  // Projects
  getProjectsForUser(userId: number, role: string): Project[];
  getProjectById(id: number): Project | undefined;
  createProject(data: InsertProject): Project;
  updateProject(id: number, data: Partial<InsertProject>): Project | undefined;
  addProjectMember(projectId: number, userId: number): void;
  removeProjectMember(projectId: number, userId: number): void;
  getProjectMembers(projectId: number): User[];

  // Programme
  getProgrammes(projectId: number): Programme[];
  getProgrammeById(id: number): Programme | undefined;
  createProgramme(data: InsertProgramme): Programme;

  // EOT
  getEotEvents(projectId: number): EotEvent[];
  createEotEvent(data: InsertEot): EotEvent;

  // Cycle overrides
  createCycleOverride(data: any): any;
  getCycleOverrides(projectId: number): any[];

  // Material deliveries
  getDeliveries(projectId: number): MaterialDelivery[];
  getDelivery(id: number): MaterialDelivery | undefined;
  createDelivery(data: InsertDelivery): MaterialDelivery;
  updateDelivery(id: number, data: Partial<InsertDelivery>): MaterialDelivery | undefined;
  deleteDelivery(id: number): void;

  // Pre-start
  listPrestartMeetings(projectId: number): any[];
  getPrestartMeeting(id: number): any | undefined;
  createPrestartMeeting(data: any): any;
  updatePrestartMeeting(id: number, data: any): any;
  getPrestartPhotos(meetingId: number): any[];
  addPrestartPhoto(data: any): any;
  deletePrestartPhoto(id: number): void;
  getPrestartAttendance(meetingId: number): any[];
  addPrestartAttendee(data: any): any;
  removePrestartAttendee(id: number): void;

  // Meetings
  getMeetings(projectId: number): Meeting[];
  getMeetingById(id: number): Meeting | undefined;
  createMeeting(data: InsertMeeting): Meeting;
  updateMeeting(id: number, data: Partial<InsertMeeting>): Meeting | undefined;
  deleteMeeting(id: number): void;

  // Audit
  addAuditEntry(data: any): void;
  getAuditLog(projectId?: number): any[];
}

class SqliteStorage implements IStorage {
  // ── Auth ────────────────────────────────────────────────────────────────────
  getUserByEmail(email: string) {
    return sqlite.prepare("SELECT * FROM users WHERE email=?").get(email) as User | undefined;
  }
  getUserById(id: number) {
    return sqlite.prepare("SELECT * FROM users WHERE id=?").get(id) as User | undefined;
  }
  getAllUsers() {
    return sqlite.prepare("SELECT * FROM users ORDER BY name").all() as User[];
  }
  createUser(data: InsertUser) {
    const r = sqlite.prepare(`INSERT INTO users (name,email,password,role,job_title,created_at) VALUES (?,?,?,?,?,?) RETURNING *`)
      .get(data.name, data.email, data.password, data.role ?? "site_manager", data.jobTitle ?? null, now()) as User;
    return r;
  }
  updateUser(id: number, data: Partial<InsertUser>) {
    const u = this.getUserById(id);
    if (!u) return undefined;
    sqlite.prepare(`UPDATE users SET name=?,email=?,role=?,job_title=? WHERE id=?`)
      .run(data.name ?? u.name, data.email ?? u.email, data.role ?? u.role, data.jobTitle ?? u.jobTitle, id);
    return this.getUserById(id);
  }
  deleteUser(id: number) {
    sqlite.prepare("DELETE FROM users WHERE id=?").run(id);
  }

  // ── Projects ─────────────────────────────────────────────────────────────────
  getProjectsForUser(userId: number, role: string) {
    if (role === "admin") return sqlite.prepare("SELECT * FROM projects ORDER BY name").all() as Project[];
    return sqlite.prepare(`
      SELECT p.* FROM projects p
      WHERE p.owner_id=?
      UNION
      SELECT p.* FROM projects p
      JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=?
      ORDER BY name
    `).all(userId, userId) as Project[];
  }
  getProjectById(id: number) {
    return sqlite.prepare("SELECT * FROM projects WHERE id=?").get(id) as Project | undefined;
  }
  createProject(data: InsertProject) {
    return sqlite.prepare(`INSERT INTO projects (name,contract_number,client,start_date,end_date,status,owner_id,created_at)
      VALUES (?,?,?,?,?,?,?,?) RETURNING *`)
      .get(data.name, data.contractNumber ?? null, data.client ?? null, data.startDate ?? null, data.endDate ?? null,
        data.status ?? "active", data.ownerId, now()) as Project;
  }
  updateProject(id: number, data: Partial<InsertProject>) {
    const p = this.getProjectById(id);
    if (!p) return undefined;
    sqlite.prepare(`UPDATE projects SET name=?,contract_number=?,client=?,start_date=?,end_date=?,status=? WHERE id=?`)
      .run(data.name ?? p.name, data.contractNumber ?? p.contractNumber, data.client ?? p.client,
        data.startDate ?? p.startDate, data.endDate ?? p.endDate, data.status ?? p.status, id);
    return this.getProjectById(id);
  }
  addProjectMember(projectId: number, userId: number) {
    const exists = sqlite.prepare("SELECT id FROM project_members WHERE project_id=? AND user_id=?").get(projectId, userId);
    if (!exists) sqlite.prepare("INSERT INTO project_members (project_id,user_id) VALUES (?,?)").run(projectId, userId);
  }
  removeProjectMember(projectId: number, userId: number) {
    sqlite.prepare("DELETE FROM project_members WHERE project_id=? AND user_id=?").run(projectId, userId);
  }
  getProjectMembers(projectId: number) {
    return sqlite.prepare(`SELECT u.* FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=?`).all(projectId) as User[];
  }

  // ── Programme ────────────────────────────────────────────────────────────────
  getProgrammes(projectId: number) {
    return sqlite.prepare("SELECT * FROM programmes WHERE project_id=? ORDER BY uploaded_at DESC").all(projectId) as Programme[];
  }
  getProgrammeById(id: number) {
    return sqlite.prepare("SELECT * FROM programmes WHERE id=?").get(id) as Programme | undefined;
  }
  createProgramme(data: InsertProgramme) {
    return sqlite.prepare(`INSERT INTO programmes (project_id,label,type,xml_data,tasks_json,uploaded_at,uploaded_by,cycle_detected_days)
      VALUES (?,?,?,?,?,?,?,?) RETURNING *`)
      .get(data.projectId, data.label, data.type ?? "baseline", data.xmlData, data.tasksJson,
        now(), data.uploadedBy, data.cycleDetectedDays ?? null) as Programme;
  }

  // ── EOT ──────────────────────────────────────────────────────────────────────
  getEotEvents(projectId: number) {
    return sqlite.prepare("SELECT * FROM eot_events WHERE project_id=? ORDER BY created_at DESC").all(projectId) as EotEvent[];
  }
  createEotEvent(data: InsertEot) {
    return sqlite.prepare(`INSERT INTO eot_events (project_id,programme_id,type,description,delay_hours,applied_from,adjusted_tasks_json,created_at,created_by)
      VALUES (?,?,?,?,?,?,?,?,?) RETURNING *`)
      .get(data.projectId, data.programmeId, data.type, data.description, data.delayHours,
        data.appliedFrom, data.adjustedTasksJson, now(), data.createdBy) as EotEvent;
  }

  // ── Cycle overrides ──────────────────────────────────────────────────────────
  createCycleOverride(data: any) {
    return sqlite.prepare(`INSERT INTO cycle_overrides (project_id,programme_id,new_cycle_days,generated_tasks_json,created_at,created_by)
      VALUES (?,?,?,?,?,?) RETURNING *`)
      .get(data.projectId, data.programmeId, data.newCycleDays, data.generatedTasksJson, now(), data.createdBy);
  }
  getCycleOverrides(projectId: number) {
    return sqlite.prepare("SELECT * FROM cycle_overrides WHERE project_id=? ORDER BY created_at DESC").all(projectId) as any[];
  }

  // ── Material deliveries ───────────────────────────────────────────────────────
  getDeliveries(projectId: number) {
    return sqlite.prepare("SELECT * FROM material_deliveries WHERE project_id=? ORDER BY delivery_date, delivery_time").all(projectId) as MaterialDelivery[];
  }
  getDelivery(id: number) {
    return sqlite.prepare("SELECT * FROM material_deliveries WHERE id=?").get(id) as MaterialDelivery | undefined;
  }
  createDelivery(data: InsertDelivery) {
    return sqlite.prepare(`INSERT INTO material_deliveries (project_id,delivery_date,delivery_time,material,supplier,unload_method,quantity,unit,location,notes,status,created_at,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`)
      .get(data.projectId, data.deliveryDate, data.deliveryTime ?? null, data.material, data.supplier ?? null,
        data.unloadMethod ?? "hand", data.quantity ?? null, data.unit ?? null, data.location ?? null,
        data.notes ?? null, data.status ?? "scheduled", now(), data.createdBy) as MaterialDelivery;
  }
  updateDelivery(id: number, data: Partial<InsertDelivery>) {
    const d = this.getDelivery(id);
    if (!d) return undefined;
    sqlite.prepare(`UPDATE material_deliveries SET delivery_date=?,delivery_time=?,material=?,supplier=?,unload_method=?,quantity=?,unit=?,location=?,notes=?,status=? WHERE id=?`)
      .run(data.deliveryDate ?? d.deliveryDate, data.deliveryTime ?? d.deliveryTime, data.material ?? d.material,
        data.supplier ?? d.supplier, data.unloadMethod ?? d.unloadMethod, data.quantity ?? d.quantity,
        data.unit ?? d.unit, data.location ?? d.location, data.notes ?? d.notes, data.status ?? d.status, id);
    return this.getDelivery(id);
  }
  deleteDelivery(id: number) {
    sqlite.prepare("DELETE FROM material_deliveries WHERE id=?").run(id);
  }

  // ── Pre-start ────────────────────────────────────────────────────────────────
  listPrestartMeetings(projectId: number) {
    return sqlite.prepare("SELECT * FROM prestart_meetings WHERE project_id=? ORDER BY meeting_date DESC").all(projectId);
  }
  getPrestartMeeting(id: number) {
    return sqlite.prepare("SELECT * FROM prestart_meetings WHERE id=?").get(id);
  }
  createPrestartMeeting(data: any) {
    return sqlite.prepare(`INSERT INTO prestart_meetings (project_id,meeting_date,title,status,general_notes,weather_conditions,created_at,created_by)
      VALUES (?,?,?,?,?,?,?,?) RETURNING *`)
      .get(data.projectId, data.meetingDate, data.title, "draft", null, null, now(), data.createdBy);
  }
  updatePrestartMeeting(id: number, data: any) {
    const m = this.getPrestartMeeting(id) as any;
    if (!m) return undefined;
    sqlite.prepare(`UPDATE prestart_meetings SET meeting_date=?,title=?,status=?,active_zones_json=?,exclusion_zones_json=?,emergency_contacts_json=?,general_notes=?,weather_conditions=?,site_plan_data=?,site_plan_mime=? WHERE id=?`)
      .run(
        data.meetingDate ?? m.meeting_date, data.title ?? m.title, data.status ?? m.status,
        data.activeZonesJson ?? m.active_zones_json, data.exclusionZonesJson ?? m.exclusion_zones_json,
        data.emergencyContactsJson ?? m.emergency_contacts_json, data.generalNotes ?? m.general_notes,
        data.weatherConditions ?? m.weather_conditions, data.sitePlanData ?? m.site_plan_data,
        data.sitePlanMime ?? m.site_plan_mime, id
      );
    return this.getPrestartMeeting(id);
  }
  getPrestartPhotos(meetingId: number) {
    return sqlite.prepare("SELECT id,meeting_id,zone_id,caption,photo_mime,created_at FROM prestart_photos WHERE meeting_id=?").all(meetingId);
  }
  addPrestartPhoto(data: any) {
    return sqlite.prepare(`INSERT INTO prestart_photos (meeting_id,zone_id,caption,photo_data,photo_mime,created_at) VALUES (?,?,?,?,?,?) RETURNING id,meeting_id,zone_id,caption,photo_mime,created_at`)
      .get(data.meetingId, data.zoneId ?? null, data.caption ?? null, data.photoData, data.photoMime, now());
  }
  deletePrestartPhoto(id: number) {
    sqlite.prepare("DELETE FROM prestart_photos WHERE id=?").run(id);
  }
  getPrestartAttendance(meetingId: number) {
    return sqlite.prepare("SELECT * FROM prestart_attendance WHERE meeting_id=?").all(meetingId);
  }
  addPrestartAttendee(data: any) {
    return sqlite.prepare(`INSERT INTO prestart_attendance (meeting_id,name,company,role) VALUES (?,?,?,?) RETURNING *`)
      .get(data.meetingId, data.name, data.company ?? null, data.role ?? null);
  }
  removePrestartAttendee(id: number) {
    sqlite.prepare("DELETE FROM prestart_attendance WHERE id=?").run(id);
  }

  // ── Meetings ─────────────────────────────────────────────────────────────────
  getMeetings(projectId: number) {
    return sqlite.prepare("SELECT * FROM meetings WHERE project_id=? ORDER BY meeting_date DESC, meeting_time DESC").all(projectId) as Meeting[];
  }
  getMeetingById(id: number) {
    return sqlite.prepare("SELECT * FROM meetings WHERE id=?").get(id) as Meeting | undefined;
  }
  createMeeting(data: InsertMeeting) {
    return sqlite.prepare(`INSERT INTO meetings (project_id,meeting_date,meeting_time,title,type,attendees_json,agenda_json,minutes_text,audio_data,audio_mime,actions_json,status,created_at,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`)
      .get(data.projectId, data.meetingDate, data.meetingTime ?? null, data.title, data.type ?? "general",
        data.attendeesJson ?? "[]", data.agendaJson ?? "[]", data.minutesText ?? null,
        null, null, data.actionsJson ?? "[]", data.status ?? "draft", now(), data.createdBy) as Meeting;
  }
  updateMeeting(id: number, data: Partial<InsertMeeting>) {
    const m = this.getMeetingById(id);
    if (!m) return undefined;
    sqlite.prepare(`UPDATE meetings SET meeting_date=?,meeting_time=?,title=?,type=?,attendees_json=?,agenda_json=?,minutes_text=?,audio_data=?,audio_mime=?,actions_json=?,status=? WHERE id=?`)
      .run(
        data.meetingDate ?? m.meetingDate, data.meetingTime ?? m.meetingTime,
        data.title ?? m.title, data.type ?? m.type,
        data.attendeesJson ?? m.attendeesJson, data.agendaJson ?? m.agendaJson,
        data.minutesText ?? m.minutesText,
        (data as any).audioData ?? m.audioData, (data as any).audioMime ?? m.audioMime,
        data.actionsJson ?? m.actionsJson, data.status ?? m.status, id
      );
    return this.getMeetingById(id);
  }
  deleteMeeting(id: number) {
    sqlite.prepare("DELETE FROM meetings WHERE id=?").run(id);
  }

  // ── Audit ────────────────────────────────────────────────────────────────────
  addAuditEntry(data: any) {
    sqlite.prepare(`INSERT INTO audit_log (project_id,user_id,user_email,action,entity,entity_id,detail,created_at)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(data.projectId ?? null, data.userId, data.userEmail, data.action, data.entity, data.entityId ?? null, data.detail ?? null, now());
  }
  getAuditLog(projectId?: number) {
    if (projectId) return sqlite.prepare("SELECT * FROM audit_log WHERE project_id=? ORDER BY created_at DESC LIMIT 500").all(projectId) as any[];
    return sqlite.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500").all() as any[];
  }
}

export const storage = new SqliteStorage();

// Bootstrap email + RFI tables (appended for Deploy 2)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    raw_text TEXT NOT NULL,
    from_address TEXT,
    subject TEXT,
    received_date TEXT,
    summary TEXT,
    key_points TEXT,
    has_rfi INTEGER NOT NULL DEFAULT 0,
    analysis_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rfis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    rfi_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    raised_by TEXT,
    source_type TEXT NOT NULL,
    source_id INTEGER,
    status TEXT NOT NULL DEFAULT 'open',
    response TEXT,
    due_date TEXT,
    closed_at TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL
  );
`);

// ── Email storage methods (added to SqliteStorage instance via prototype extension) ──
const proto = SqliteStorage.prototype as any;

proto.getEmails = function(projectId: number) {
  return sqlite.prepare("SELECT * FROM emails WHERE project_id=? ORDER BY created_at DESC").all(projectId);
};
proto.getEmailById = function(id: number) {
  return sqlite.prepare("SELECT * FROM emails WHERE id=?").get(id);
};
proto.createEmail = function(data: any) {
  return sqlite.prepare(
    `INSERT INTO emails (project_id,raw_text,from_address,subject,received_date,analysis_status,created_at,created_by)
     VALUES (?,?,?,?,?,?,?,?) RETURNING *`
  ).get(data.projectId, data.rawText, data.fromAddress ?? null, data.subject ?? null,
    data.receivedDate ?? null, "pending", now(), data.createdBy);
};
proto.updateEmail = function(id: number, data: any) {
  const e: any = proto.getEmailById.call(this, id);
  if (!e) return undefined;
  sqlite.prepare(
    `UPDATE emails SET from_address=?,subject=?,received_date=?,summary=?,key_points=?,has_rfi=?,analysis_status=? WHERE id=?`
  ).run(
    data.fromAddress ?? e.from_address, data.subject ?? e.subject,
    data.receivedDate ?? e.received_date, data.summary ?? e.summary,
    data.keyPoints ?? e.key_points, data.hasRfi ?? e.has_rfi,
    data.analysisStatus ?? e.analysis_status, id
  );
  return proto.getEmailById.call(this, id);
};
proto.deleteEmail = function(id: number) {
  sqlite.prepare("DELETE FROM emails WHERE id=?").run(id);
};

// ── RFI storage methods ───────────────────────────────────────────────────────
proto.getRfis = function(projectId: number) {
  return sqlite.prepare("SELECT * FROM rfis WHERE project_id=? ORDER BY created_at DESC").all(projectId);
};
proto.getRfiById = function(id: number) {
  return sqlite.prepare("SELECT * FROM rfis WHERE id=?").get(id);
};
proto.createRfi = function(data: any) {
  // Auto-number: RFI-001, RFI-002 etc.
  const count = (sqlite.prepare("SELECT COUNT(*) as c FROM rfis WHERE project_id=?").get(data.projectId) as any).c;
  const rfiNumber = `RFI-${String(count + 1).padStart(3, "0")}`;
  return sqlite.prepare(
    `INSERT INTO rfis (project_id,rfi_number,title,description,raised_by,source_type,source_id,status,due_date,created_at,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *`
  ).get(data.projectId, rfiNumber, data.title, data.description ?? null, data.raisedBy ?? null,
    data.sourceType, data.sourceId ?? null, "open", data.dueDate ?? null, now(), data.createdBy);
};
proto.updateRfi = function(id: number, data: any) {
  const r: any = proto.getRfiById.call(this, id);
  if (!r) return undefined;
  sqlite.prepare(
    `UPDATE rfis SET title=?,description=?,raised_by=?,status=?,response=?,due_date=?,closed_at=? WHERE id=?`
  ).run(
    data.title ?? r.title, data.description ?? r.description,
    data.raisedBy ?? r.raised_by, data.status ?? r.status,
    data.response ?? r.response, data.dueDate ?? r.due_date,
    data.status === "closed" ? now() : r.closed_at, id
  );
  return proto.getRfiById.call(this, id);
};
