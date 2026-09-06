import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appUsersTable = pgTable("app_users", {
  id: text("id").primaryKey(),
  clerkSubject: text("clerk_subject").notNull().unique(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentsTable = pgTable("students", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  linkedUserId: text("linked_user_id"),
  linkCodeHash: text("link_code_hash"),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  syllabus: text("syllabus").notNull(),
  avatar: text("avatar").notNull(),
  streak: integer("streak").notNull().default(0),
  nextSession: text("next_session").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const objectivesTable = pgTable("learning_objectives", {
  id: text("id").primaryKey(),
  syllabus: text("syllabus").notNull(),
  grade: text("grade").notNull(),
  subject: text("subject").notNull(),
  strand: text("strand").notNull().default("General"),
  topic: text("topic").notNull(),
  objective: text("objective").notNull(),
  color: text("color").notNull(),
  term: text("term").notNull().default("All year"),
  source: text("source").notNull().default("Cambridge baseline"),
  sourceId: text("source_id"),
  sequence: integer("sequence").notNull().default(0),
});

export const curriculumUploadsTable = pgTable("curriculum_uploads", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  school: text("school").notNull(),
  grade: text("grade").notNull(),
  subject: text("subject").notNull(),
  term: text("term").notNull(),
  fileName: text("file_name"),
  contentText: text("content_text").notNull(),
  status: text("status").notNull().default("needs_review"),
  objectiveCount: integer("objective_count").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const masteryTable = pgTable("student_mastery", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  objectiveId: text("objective_id").notNull(),
  mastery: doublePrecision("mastery").notNull().default(0),
  trend: text("trend").notNull().default("steady"),
  lastPracticed: text("last_practiced").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const materialsTable = pgTable("school_materials", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  source: text("source").notNull(),
  receivedAt: text("received_at").notNull(),
  status: text("status").notNull(),
  subjects: text("subjects").array().notNull(),
  preview: text("preview").notNull(),
  sourceKey: text("source_key").notNull().unique(),
});

export const revisionTable = pgTable("revision_schedule", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  objectiveId: text("objective_id").notNull(),
  dueLabel: text("due_label").notNull(),
  daysUntil: integer("days_until").notNull(),
  reason: text("reason").notNull(),
});

export const sessionsTable = pgTable("study_sessions", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  objectiveId: text("objective_id").notNull(),
  status: text("status").notNull().default("active"),
  turnCount: integer("turn_count").notNull().default(0),
  /** The most recent question/prompt the tutor asked, used as grading context for the next turn. */
  currentPrompt: text("current_prompt").notNull().default(""),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const attemptsTable = pgTable("attempts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  answer: text("answer").notNull(),
  inputMode: text("input_mode").notNull(),
  evaluation: text("evaluation").notNull(),
  misconception: text("misconception"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  createdAt: true,
});
export const insertObjectiveSchema = createInsertSchema(objectivesTable);
export const insertCurriculumUploadSchema = createInsertSchema(
  curriculumUploadsTable,
).omit({ uploadedAt: true });
export const insertMasterySchema = createInsertSchema(masteryTable).omit({
  updatedAt: true,
});
export const insertMaterialSchema = createInsertSchema(materialsTable);
export const insertRevisionSchema = createInsertSchema(revisionTable);
export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  startedAt: true,
  completedAt: true,
});
export const insertAttemptSchema = createInsertSchema(attemptsTable).omit({
  createdAt: true,
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type StudentRecord = typeof studentsTable.$inferSelect;