import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("site_manager"), // site_manager | admin
  jobTitle: text("job_title"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contractNumber: text("contract_number"),
  client: text("client"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("active"),
  ownerId: integer("owner_id").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project members (which users can see which projects)
export const projectMembers = sqliteTable("project_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
});

// ─── Programme ───────────────────────────────────────────────────────────────

export const programmes = sqliteTable("programmes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  label: text("label").notNull(), // "Baseline", "Revision 1", etc.
  type: text("type").notNull().default("baseline"), // baseline | revision
  xmlData: text("xml_data").notNull(),
  tasksJson: text("tasks_json").notNull(), // parsed tasks as JSON
  uploadedAt: text("uploaded_at").notNull().default(""),
  uploadedBy: integer("uploaded_by").notNull(),
  cycleDetectedDays: real("cycle_detected_days"), // auto-detected cycle length
});

export const insertProgrammeSchema = createInsertSchema(programmes).omit({ id: true, uploadedAt: true });
export type InsertProgramme = z.infer<typeof insertProgrammeSchema>;
export type Programme = typeof programmes.$inferSelect;

// ─── EOT Events ──────────────────────────────────────────────────────────────

export const eotEvents = sqliteTable("eot_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  programmeId: integer("programme_id").notNull(),
  type: text("type").notNull(), // weather | ir | other
  description: text("description").notNull(),
  delayHours: real("delay_hours").notNull(), // 4 or 8
  appliedFrom: text("applied_from").notNull(), // ISO date
  adjustedTasksJson: text("adjusted_tasks_json").notNull(), // full programme after shift
  createdAt: text("created_at").notNull().default(""),
  createdBy: integer("created_by").notNull(),
});

export const insertEotSchema = createInsertSchema(eotEvents).omit({ id: true, createdAt: true });
export type InsertEot = z.infer<typeof insertEotSchema>;
export type EotEvent = typeof eotEvents.$inferSelect;

// ─── Cycle Override ───────────────────────────────────────────────────────────

export const cycleOverrides = sqliteTable("cycle_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  programmeId: integer("programme_id").notNull(),
  newCycleDays: real("new_cycle_days").notNull(),
  generatedTasksJson: text("generated_tasks_json").notNull(),
  createdAt: text("created_at").notNull().default(""),
  createdBy: integer("created_by").notNull(),
});

// ─── Material Handling ────────────────────────────────────────────────────────

export const materialDeliveries = sqliteTable("material_deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  deliveryTime: text("delivery_time"),
  material: text("material").notNull(),
  supplier: text("supplier"),
  unloadMethod: text("unload_method").notNull().default("hand"), // hand | forklift | crane
  quantity: text("quantity"),
  unit: text("unit"),
  location: text("location"), // where on site
  notes: text("notes"),
  status: text("status").notNull().default("scheduled"), // scheduled | delivered | cancelled
  createdAt: text("created_at").notNull().default(""),
  createdBy: integer("created_by").notNull(),
});

export const insertDeliverySchema = createInsertSchema(materialDeliveries).omit({ id: true, createdAt: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type MaterialDelivery = typeof materialDeliveries.$inferSelect;

// ─── Pre-Start Meetings ───────────────────────────────────────────────────────

export const prestartMeetings = sqliteTable("prestart_meetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  meetingDate: text("meeting_date").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft | closed
  sitePlanData: text("site_plan_data"), // base64
  sitePlanMime: text("site_plan_mime"),
  activeZonesJson: text("active_zones_json").notNull().default("[]"),
  exclusionZonesJson: text("exclusion_zones_json").notNull().default("[]"),
  emergencyContactsJson: text("emergency_contacts_json").notNull().default("[]"),
  generalNotes: text("general_notes"),
  weatherConditions: text("weather_conditions"),
  createdAt: text("created_at").notNull().default(""),
  createdBy: integer("created_by").notNull(),
});

export const prestartPhotos = sqliteTable("prestart_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  meetingId: integer("meeting_id").notNull(),
  zoneId: text("zone_id"),
  caption: text("caption"),
  photoData: text("photo_data").notNull(),
  photoMime: text("photo_mime").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const prestartAttendance = sqliteTable("prestart_attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  meetingId: integer("meeting_id").notNull(),
  name: text("name").notNull(),
  company: text("company"),
  role: text("role"),
});

// ─── Meetings / Minutes ───────────────────────────────────────────────────────

export const meetings = sqliteTable("meetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  meetingDate: text("meeting_date").notNull(),
  meetingTime: text("meeting_time"),
  title: text("title").notNull(),
  type: text("type").notNull().default("general"), // general | subbie | programme | safety
  attendeesJson: text("attendees_json").notNull().default("[]"),
  agendaJson: text("agenda_json").notNull().default("[]"),
  minutesText: text("minutes_text"),
  audioData: text("audio_data"), // base64 audio recording
  audioMime: text("audio_mime"),
  actionsJson: text("actions_json").notNull().default("[]"), // [{item, owner, due, status}]
  status: text("status").notNull().default("draft"), // draft | confirmed
  createdAt: text("created_at").notNull().default(""),
  createdBy: integer("created_by").notNull(),
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id"),
  userId: integer("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: text("detail"),
  createdAt: text("created_at").notNull().default(""),
});

// ─── Emails ───────────────────────────────────────────────────────────────────

export const emails = sqliteTable("emails", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  rawText: text("raw_text").notNull(),
  fromAddress: text("from_address"),
  subject: text("subject"),
  receivedDate: text("received_date"),
  summary: text("summary"),
  keyPoints: text("key_points"),       // JSON string[]
  hasRfi: integer("has_rfi").notNull().default(0),
  analysisStatus: text("analysis_status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(""),
  createdBy: integer("created_by").notNull(),
});

export type Email = typeof emails.$inferSelect;

// ─── RFIs ─────────────────────────────────────────────────────────────────────

export const rfis = sqliteTable("rfis", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  rfiNumber: text("rfi_number"),
  title: text("title").notNull(),
  description: text("description"),
  raisedBy: text("raised_by"),
  sourceType: text("source_type").notNull(),   // email | meeting
  sourceId: integer("source_id"),
  status: text("status").notNull().default("open"),
  response: text("response"),
  dueDate: text("due_date"),
  closedAt: text("closed_at"),
  createdAt: text("created_at").notNull().default(""),
  createdBy: integer("created_by").notNull(),
});

export type Rfi = typeof rfis.$inferSelect;
