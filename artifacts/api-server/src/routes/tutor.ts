import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { and, asc, eq } from "drizzle-orm";
import {
  attemptsTable,
  appUsersTable,
  curriculumUploadsTable,
  db,
  masteryTable,
  materialsTable,
  objectivesTable,
  revisionTable,
  sessionsTable,
  studentsTable,
} from "@workspace/db";
import {
  CompleteStudySessionParams,
  CompleteStudySessionResponse,
  CreateStudentBody,
  CreateStudentResponse,
  GetDashboardResponse,
  GetGmailStatusResponse,
  GetStudentMasteryParams,
  GetStudentMasteryResponse,
  GetStudentMaterialsParams,
  GetStudentMaterialsResponse,
  GetStudentRevisionParams,
  GetStudentRevisionResponse,
  ListStudentsResponse,
  StartStudySessionBody,
  StartStudySessionParams,
  StartStudySessionResponse,
  SubmitTutorTurnBody,
  SubmitTutorTurnParams,
  SubmitTutorTurnResponse,
  RecordRealtimeTurnParams,
  RecordRealtimeTurnBody,
  SyncGmailBody,
  CreateCurriculumUploadBody,
  CreateCurriculumUploadResponse,
  GetClass6CurriculumResponse,
  ListCurriculumUploadsResponse,
} from "@workspace/api-zod";
import {
  class6Curriculum,
  class6Objectives,
  type Class6Objective,
} from "../data/class6Curriculum";
import {
  classifyTutorAnswer,
  explainObjective,
  generateExerciseQuestion,
  gradeTutorAnswer,
  TutorGradingUnavailableError,
} from "../lib/tutorGrading";

const router: IRouter = Router();
let curriculumSeedPromise: Promise<void> | null = null;

type CurrentUser = typeof appUsersTable.$inferSelect;

async function currentUser(req: Request, res: Response): Promise<CurrentUser | null> {
  const auth = getAuth(req);
  const subject = auth?.sessionClaims?.userId || auth?.userId;
  const clerkSubject = typeof subject === "string" ? subject : null;
  if (!clerkSubject) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [user] = await db.select().from(appUsersTable)
    .where(eq(appUsersTable.clerkSubject, clerkSubject)).limit(1);
  if (!user) {
    res.status(403).json({ error: "Complete onboarding before accessing tutor data" });
    return null;
  }
  return user;
}

async function accessibleStudent(user: CurrentUser, studentId: string) {
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
  if (!student) return null;
  return (user.role === "parent" && student.ownerId === user.id) ||
    (user.role === "student" && student.linkedUserId === user.id) ? student : null;
}

function ensureClass6Curriculum() {
  if (curriculumSeedPromise) return curriculumSeedPromise;
  curriculumSeedPromise = (async () => {
    await db
      .insert(objectivesTable)
      .values(
        class6Objectives.map((item) => ({
          ...item,
          syllabus: "Cambridge — Phoenix Greens",
          grade: "Grade 6",
          sourceId: null,
        })),
      )
      .onConflictDoNothing();

  })().catch((error) => {
    curriculumSeedPromise = null;
    throw error;
  });
  return curriculumSeedPromise;
}

router.use(async (_req, res, next) => {
  try {
    await ensureClass6Curriculum();
    next();
  } catch (error) {
    console.error("Failed to prepare Class 6 curriculum", error);
    res.status(500).json({ error: "Unable to prepare curriculum data" });
  }
});

router.post("/auth/onboard", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const subject = auth?.sessionClaims?.userId || auth?.userId;
  const clerkSubject = typeof subject === "string" ? subject : null;
  const role = req.body?.role;
  if (!clerkSubject) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (role !== "parent" && role !== "student") { res.status(400).json({ error: "Role must be parent or student" }); return; }
  const [user] = await db.insert(appUsersTable).values({ id: randomUUID(), clerkSubject, role })
    .onConflictDoNothing().returning();
  const [existing] = user ? [user] : await db.select().from(appUsersTable).where(eq(appUsersTable.clerkSubject, clerkSubject)).limit(1);
  if (existing.role !== role) { res.status(409).json({ error: "Role is already set and cannot be changed" }); return; }
  res.status(201).json({ id: existing.id, role: existing.role });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const subject = auth?.sessionClaims?.userId || auth?.userId;
  const clerkSubject = typeof subject === "string" ? subject : null;
  if (!clerkSubject) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(appUsersTable).where(eq(appUsersTable.clerkSubject, clerkSubject)).limit(1);
  res.json({ user: user ? { id: user.id, role: user.role } : null });
});

function asStudent(student: typeof studentsTable.$inferSelect) {
  return {
    id: student.id,
    name: student.name,
    grade: student.grade,
    syllabus: student.syllabus,
    avatar: student.avatar,
    streak: student.streak,
    nextSession: student.nextSession,
  };
}

function asUpload(upload: typeof curriculumUploadsTable.$inferSelect) {
  return {
    id: upload.id,
    title: upload.title,
    school: upload.school,
    grade: upload.grade,
    subject: upload.subject,
    term: upload.term,
    fileName: upload.fileName,
    status: upload.status,
    objectiveCount: upload.objectiveCount,
    uploadedAt: upload.uploadedAt.toISOString(),
  };
}

function parseImportedObjectives(input: {
  subject: string;
  term: string;
  contentText: string;
  fileName?: string | null;
}): Omit<Class6Objective, "color">[] {
  let rawItems: unknown[] = [];
  if (input.fileName?.toLowerCase().endsWith(".json")) {
    try {
      const parsed = JSON.parse(input.contentText);
      rawItems = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.objectives)
          ? parsed.objectives
          : [];
    } catch {
      rawItems = [];
    }
  }

  if (!rawItems.length) {
    const lines = input.contentText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const usefulLines =
      input.fileName?.toLowerCase().endsWith(".csv") && lines.length > 1
        ? lines.slice(1).map((line) => line.split(",").pop()?.trim() ?? "")
        : lines;
    rawItems = usefulLines
      .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((line) => line.length >= 8);
  }

  return rawItems.slice(0, 200).flatMap((item, index) => {
    const value =
      typeof item === "string"
        ? { objective: item }
        : item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : null;
    const objective =
      typeof value?.objective === "string" ? value.objective.trim() : "";
    if (!objective) return [];
    return [{
      id: randomUUID(),
      subject:
        typeof value?.subject === "string" ? value.subject : input.subject,
      strand:
        typeof value?.strand === "string" ? value.strand : "School syllabus",
      topic: typeof value?.topic === "string" ? value.topic : "Imported topic",
      objective,
      term: typeof value?.term === "string" ? value.term : input.term,
      source: "Parent-uploaded school syllabus",
      sequence: index + 1,
    }];
  });
}

async function selectNextObjective(studentId: string, excludeObjectiveIds: string[]) {
  const candidates = await db
    .select({
      objectiveId: objectivesTable.id,
      subject: objectivesTable.subject,
      topic: objectivesTable.topic,
      objective: objectivesTable.objective,
      mastery: masteryTable.mastery,
    })
    .from(masteryTable)
    .innerJoin(objectivesTable, eq(masteryTable.objectiveId, objectivesTable.id))
    .where(eq(masteryTable.studentId, studentId))
    .orderBy(asc(masteryTable.mastery));
  return candidates.find((candidate) => !excludeObjectiveIds.includes(candidate.objectiveId)) ?? null;
}

router.get("/dashboard", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(user.role === "parent" ? eq(studentsTable.ownerId, user.id) : eq(studentsTable.linkedUserId, user.id))
    .limit(1);

  if (!student) {
    res.status(404).json({ error: "No student profile found" });
    return;
  }

  const masteryRows = await db
    .select({
      mastery: masteryTable.mastery,
      subject: objectivesTable.subject,
      color: objectivesTable.color,
    })
    .from(masteryTable)
    .innerJoin(
      objectivesTable,
      eq(masteryTable.objectiveId, objectivesTable.id),
    )
    .where(eq(masteryTable.studentId, student.id));

  const revisionRows = await db
    .select()
    .from(revisionTable)
    .where(eq(revisionTable.studentId, student.id));

  const overallMastery =
    masteryRows.reduce((sum, row) => sum + row.mastery, 0) /
    Math.max(masteryRows.length, 1);
  const grouped = new Map<
    string,
    { total: number; count: number; color: string }
  >();
  for (const row of masteryRows) {
    const current = grouped.get(row.subject) ?? {
      total: 0,
      count: 0,
      color: row.color,
    };
    current.total += row.mastery;
    current.count += 1;
    grouped.set(row.subject, current);
  }

  res.json(
    GetDashboardResponse.parse({
      student: asStudent(student),
      overallMastery,
      masteryDelta: 0.07,
      studyMinutes: 86,
      sessionsThisWeek: 4,
      revisionDue: revisionRows.filter((item) => item.daysUntil <= 0).length,
      weakArea: "Using evidence to support an inference",
      recentActivity: [
        {
          id: "activity-1",
          title: "Reading inference practice",
          detail: "Arya improved after a targeted hint.",
          timeLabel: "Today, 4:18 PM",
          type: "session",
        },
        {
          id: "activity-2",
          title: "New worksheet mapped",
          detail: "Fractions practice set matched to 1 learning objective.",
          timeLabel: "Today, 9:16 AM",
          type: "material",
        },
        {
          id: "activity-3",
          title: "Revision scheduled",
          detail: "Fractions will return tomorrow for a short retest.",
          timeLabel: "Yesterday",
          type: "revision",
        },
      ],
      subjectSummary: [...grouped.entries()].map(([subject, value]) => ({
        subject,
        mastery: value.total / value.count,
        objectiveCount: value.count,
        dueCount:
          subject === "English"
            ? revisionRows.filter((item) => item.daysUntil <= 0).length
            : 0,
        accent: value.color,
      })),
    }),
  );
});

router.get("/students", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  const students = await db
    .select()
    .from(studentsTable)
    .where(user.role === "parent" ? eq(studentsTable.ownerId, user.id) : eq(studentsTable.linkedUserId, user.id))
    .orderBy(asc(studentsTable.createdAt));
  res.json(ListStudentsResponse.parse(students.map(asStudent)));
});

router.post("/students", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "parent") { res.status(403).json({ error: "Only parents can create student profiles" }); return; }
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const initials = parsed.data.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const [student] = await db
    .insert(studentsTable)
    .values({
      id: randomUUID(),
      ownerId: user.id,
      name: parsed.data.name,
      grade: parsed.data.grade,
      syllabus: parsed.data.syllabus,
      avatar: initials || "ST",
      streak: 0,
      nextSession: "Ready when you are",
    })
    .returning();
  const objectives = await db.select().from(objectivesTable)
    .where(eq(objectivesTable.grade, student.grade));
  if (objectives.length) {
    await db.insert(masteryTable).values(objectives.map((objective) => ({
      id: randomUUID(), studentId: student.id, objectiveId: objective.id,
      mastery: 0.2, trend: "steady", lastPracticed: "Not started",
    })));
  }

  res.status(201).json(CreateStudentResponse.parse(asStudent(student)));
});

router.post("/students/:studentId/link-code", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "parent") { res.status(403).json({ error: "Only parents can create link codes" }); return; }
  const student = await accessibleStudent(user, req.params.studentId);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  const code = randomBytes(18).toString("base64url");
  await db.update(studentsTable).set({ linkCodeHash: createHash("sha256").update(code).digest("hex") })
    .where(eq(studentsTable.id, student.id));
  res.json({ code, studentId: student.id });
});

router.post("/students/link", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "student") { res.status(403).json({ error: "Only student accounts can use a link code" }); return; }
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!code) { res.status(400).json({ error: "A link code is required" }); return; }
  const hash = createHash("sha256").update(code).digest("hex");
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.linkCodeHash, hash)).limit(1);
  if (!student || student.linkedUserId) { res.status(404).json({ error: "This link code is invalid or has already been used" }); return; }
  await db.update(studentsTable).set({ linkedUserId: user.id, linkCodeHash: null }).where(eq(studentsTable.id, student.id));
  res.json(CreateStudentResponse.parse(asStudent(student)));
});

router.get("/students/:studentId/mastery", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  const params = GetStudentMasteryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!await accessibleStudent(user, params.data.studentId)) { res.status(404).json({ error: "Student not found" }); return; }

  const rows = await db
    .select({
      id: masteryTable.id,
      subject: objectivesTable.subject,
      topic: objectivesTable.topic,
      objective: objectivesTable.objective,
      mastery: masteryTable.mastery,
      trend: masteryTable.trend,
      color: objectivesTable.color,
      lastPracticed: masteryTable.lastPracticed,
    })
    .from(masteryTable)
    .innerJoin(
      objectivesTable,
      eq(masteryTable.objectiveId, objectivesTable.id),
    )
    .where(eq(masteryTable.studentId, params.data.studentId))
    .orderBy(asc(objectivesTable.subject));

  res.json(GetStudentMasteryResponse.parse(rows));
});

router.get("/students/:studentId/materials", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "parent") { res.status(403).json({ error: "Only parents can access school materials" }); return; }
  const params = GetStudentMaterialsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!await accessibleStudent(user, params.data.studentId)) { res.status(404).json({ error: "Student not found" }); return; }

  const rows = await db
    .select()
    .from(materialsTable)
    .where(eq(materialsTable.studentId, params.data.studentId));
  res.json(GetStudentMaterialsResponse.parse(rows));
});

router.get("/students/:studentId/revision", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  const params = GetStudentRevisionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!await accessibleStudent(user, params.data.studentId)) { res.status(404).json({ error: "Student not found" }); return; }

  const rows = await db
    .select({
      id: revisionTable.id,
      objective: objectivesTable.objective,
      topic: objectivesTable.topic,
      subject: objectivesTable.subject,
      dueLabel: revisionTable.dueLabel,
      daysUntil: revisionTable.daysUntil,
      mastery: masteryTable.mastery,
      reason: revisionTable.reason,
    })
    .from(revisionTable)
    .innerJoin(
      objectivesTable,
      eq(revisionTable.objectiveId, objectivesTable.id),
    )
    .innerJoin(
      masteryTable,
      and(
        eq(masteryTable.objectiveId, revisionTable.objectiveId),
        eq(masteryTable.studentId, revisionTable.studentId),
      ),
    )
    .where(eq(revisionTable.studentId, params.data.studentId))
    .orderBy(asc(revisionTable.daysUntil));

  res.json(GetStudentRevisionResponse.parse(rows));
});

router.post(
  "/students/:studentId/study-sessions",
  async (req, res): Promise<void> => {
    const user = await currentUser(req, res); if (!user) return;
    const params = StartStudySessionParams.safeParse(req.params);
    const body = StartStudySessionBody.safeParse(req.body ?? {});
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid study session request" });
      return;
    }
    const student = await accessibleStudent(user, params.data.studentId);
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }

    const candidates = await db
      .select({
        objectiveId: objectivesTable.id,
        subject: objectivesTable.subject,
        topic: objectivesTable.topic,
        objective: objectivesTable.objective,
        mastery: masteryTable.mastery,
      })
      .from(masteryTable)
      .innerJoin(
        objectivesTable,
        eq(masteryTable.objectiveId, objectivesTable.id),
      )
      .where(eq(masteryTable.studentId, params.data.studentId))
      .orderBy(asc(masteryTable.mastery));

    const selected =
      candidates.find(
        (candidate) =>
          (!body.data.subject || candidate.subject === body.data.subject) &&
          (!body.data.objectiveId ||
            candidate.objectiveId === body.data.objectiveId),
      ) ?? candidates[0];

    if (!selected) {
      res.status(404).json({ error: "No learning objectives available" });
      return;
    }

    let prompt = `Let's work on ${selected.objective.toLowerCase()}. Explain the idea in your own words and give one example, even if you are not completely sure.`;
    let promptType: "explain" | "question" = "question";
    try {
      const taught = await explainObjective({
        studentName: student.name,
        subject: selected.subject,
        topic: selected.topic,
        objective: selected.objective,
      });
      prompt = `${taught.explanation}\n\n${taught.checkQuestion}`;
      promptType = "explain";
    } catch (error) {
      req.log.warn({ err: error }, "Falling back to a templated session opener; concept explanation is unavailable");
    }

    const [session] = await db
      .insert(sessionsTable)
      .values({
        id: randomUUID(),
        studentId: params.data.studentId,
        objectiveId: selected.objectiveId,
        status: "active",
        turnCount: 0,
        currentPrompt: prompt,
        objectivesCovered: [selected.objectiveId],
        exercisePending: false,
      })
      .returning();

    res.status(201).json(
      StartStudySessionResponse.parse({
        id: session.id,
        studentId: session.studentId,
        subject: selected.subject,
        topic: selected.topic,
        objective: selected.objective,
        prompt,
        promptType,
        turnCount: 0,
        estimatedMinutes: 12,
        voiceReady: false,
      }),
    );
  },
);

router.post(
  "/study-sessions/:sessionId/turns",
  async (req, res): Promise<void> => {
    const user = await currentUser(req, res); if (!user) return;
    const params = SubmitTutorTurnParams.safeParse(req.params);
    const body = SubmitTutorTurnBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid tutor turn" });
      return;
    }

    const [row] = await db
      .select({
        session: sessionsTable,
        objective: objectivesTable,
        mastery: masteryTable,
        student: studentsTable,
      })
      .from(sessionsTable)
      .innerJoin(
        objectivesTable,
        eq(sessionsTable.objectiveId, objectivesTable.id),
      )
      .innerJoin(
        masteryTable,
        and(
          eq(masteryTable.objectiveId, sessionsTable.objectiveId),
          eq(masteryTable.studentId, sessionsTable.studentId),
        ),
      )
      .innerJoin(studentsTable, eq(sessionsTable.studentId, studentsTable.id))
      .where(eq(sessionsTable.id, params.data.sessionId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Study session not found" });
      return;
    }
    if (!await accessibleStudent(user, row.session.studentId)) { res.status(404).json({ error: "Study session not found" }); return; }

    let grade;
    try {
      grade = await gradeTutorAnswer({
        studentName: row.student.name,
        subject: row.objective.subject,
        topic: row.objective.topic,
        objective: row.objective.objective,
        priorPrompt: row.session.currentPrompt,
        studentAnswer: body.data.answer,
      });
    } catch (error) {
      if (error instanceof TutorGradingUnavailableError) {
        req.log.error({ err: error }, "Tutor grading unavailable");
        res.status(503).json({ error: "Tutor grading is not configured or is temporarily unavailable. Please try again shortly." });
        return;
      }
      req.log.error({ err: error }, "Tutor grading request failed");
      res.status(502).json({ error: "Unable to grade this answer right now. Please try again." });
      return;
    }

    const { evaluation, misconception, feedback, nextPrompt } = grade;
    const delta = evaluation === "correct" ? 0.1 : evaluation === "almost" ? 0.03 : -0.02;
    const nextMastery = Math.max(
      0.05,
      Math.min(0.98, row.mastery.mastery + delta),
    );
    const turnCount = row.session.turnCount + 1;

    let responseType: "encourage" | "hint" | "complete" = evaluation === "correct" ? "encourage" : "hint";
    let responseText = feedback;
    let nextPromptText = nextPrompt;
    let nextPromptType: "explain" | "question" | "reflect" = "question";
    let nextObjectiveId = row.session.objectiveId;
    let objectivesCovered = row.session.objectivesCovered;
    let exercisePending = false;
    let currentSubject = row.objective.subject;
    let currentTopic = row.objective.topic;
    let currentObjectiveText = row.objective.objective;

    if (evaluation === "correct" && row.session.exercisePending) {
      // The student just passed an exam/exercise-style question on this
      // objective — that's the bar for real mastery, so advance.
      const covered = objectivesCovered.includes(row.session.objectiveId)
        ? objectivesCovered
        : [...objectivesCovered, row.session.objectiveId];
      const next = await selectNextObjective(row.session.studentId, covered);
      if (!next) {
        responseType = "complete";
      } else {
        try {
          const taught = await explainObjective({
            studentName: row.student.name,
            subject: next.subject,
            topic: next.topic,
            objective: next.objective,
          });
          responseText = `${feedback} Let's move on to something new.`;
          nextPromptText = `${taught.explanation}\n\n${taught.checkQuestion}`;
          nextPromptType = "explain";
          nextObjectiveId = next.objectiveId;
          objectivesCovered = covered;
          currentSubject = next.subject;
          currentTopic = next.topic;
          currentObjectiveText = next.objective;
        } catch (error) {
          req.log.warn({ err: error }, "Could not introduce the next objective; staying on the current one");
        }
      }
    } else if (evaluation === "correct" && !row.session.exercisePending) {
      // The student showed basic comprehension — raise the bar to an
      // exercise/exam-style question before treating the objective as mastered.
      try {
        const exercise = await generateExerciseQuestion({
          studentName: row.student.name,
          subject: row.objective.subject,
          topic: row.objective.topic,
          objective: row.objective.objective,
        });
        nextPromptText = exercise.question;
        nextPromptType = "reflect";
        exercisePending = true;
      } catch (error) {
        req.log.warn({ err: error }, "Could not generate an exercise question; continuing with the grader's own next prompt");
      }
    }
    // Otherwise (almost/incorrect): fall through to the grader's own
    // remediation feedback/nextPrompt, and exercisePending resets to false
    // so a later correct answer earns a fresh exercise question.

    await db.transaction(async (tx) => {
      await tx
        .update(sessionsTable)
        .set({ turnCount, currentPrompt: nextPromptText, objectiveId: nextObjectiveId, objectivesCovered, exercisePending })
        .where(eq(sessionsTable.id, row.session.id));
      await tx
        .update(masteryTable)
        .set({
          mastery: nextMastery,
          trend: delta > 0 ? "up" : "down",
          lastPracticed: "Just now",
          updatedAt: new Date(),
        })
        .where(eq(masteryTable.id, row.mastery.id));
      await tx.insert(attemptsTable).values({
        id: randomUUID(),
        sessionId: row.session.id,
        answer: body.data.answer,
        inputMode: body.data.inputMode,
        evaluation,
        misconception,
        metadata: { masteryBefore: row.mastery.mastery, masteryAfter: nextMastery },
      });
    });

    res.json(
      SubmitTutorTurnResponse.parse({
        sessionId: row.session.id,
        response: responseText,
        responseType,
        evaluation,
        mastery: nextMastery,
        nextPrompt: nextPromptText,
        nextPromptType,
        turnCount,
        misconception,
        canUseVoice: false,
        subject: currentSubject,
        topic: currentTopic,
        objective: currentObjectiveText,
      }),
    );
  },
);

router.post(
  "/study-sessions/:sessionId/complete",
  async (req, res): Promise<void> => {
    const user = await currentUser(req, res); if (!user) return;
    const params = CompleteStudySessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [row] = await db
      .select({
        session: sessionsTable,
        objective: objectivesTable,
        mastery: masteryTable,
      })
      .from(sessionsTable)
      .innerJoin(
        objectivesTable,
        eq(sessionsTable.objectiveId, objectivesTable.id),
      )
      .innerJoin(
        masteryTable,
        and(
          eq(masteryTable.objectiveId, sessionsTable.objectiveId),
          eq(masteryTable.studentId, sessionsTable.studentId),
        ),
      )
      .where(eq(sessionsTable.id, params.data.sessionId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Study session not found" });
      return;
    }
    if (!await accessibleStudent(user, row.session.studentId)) { res.status(404).json({ error: "Study session not found" }); return; }

    await db
      .update(sessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(sessionsTable.id, row.session.id));

    const otherObjectivesCovered = row.session.objectivesCovered.filter(
      (id) => id !== row.session.objectiveId,
    ).length;

    res.json(
      CompleteStudySessionResponse.parse({
        sessionId: row.session.id,
        topic: row.objective.topic,
        learned: otherObjectivesCovered > 0
          ? `${row.objective.objective} (plus ${otherObjectivesCovered} other concept${otherObjectivesCovered === 1 ? "" : "s"} covered this session)`
          : row.objective.objective,
        weakness:
          row.mastery.mastery < 0.7
            ? "The reasoning needs one more short retest."
            : "No persistent weakness detected in this session.",
        mastery: row.mastery.mastery,
        nextStep: "Retest with a new example before moving to the next objective.",
        nextRevision: "Tomorrow",
      }),
    );
  },
);

router.post("/realtime/client-secret", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "student") { res.status(403).json({ error: "Realtime tutoring is available only to the linked student account" }); return; }
  const studentId = typeof req.body?.studentId === "string" ? req.body.studentId : "";
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  const student = await accessibleStudent(user, studentId);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  const [session] = await db.select({ session: sessionsTable, objective: objectivesTable })
    .from(sessionsTable).innerJoin(objectivesTable, eq(sessionsTable.objectiveId, objectivesTable.id))
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.studentId, studentId))).limit(1);
  if (!session || session.session.status !== "active") { res.status(404).json({ error: "Active study session not found" }); return; }
  if (!process.env.OPENAI_API_KEY) { res.status(503).json({ error: "Voice tutoring is not configured" }); return; }
  const safetyIdentifier = createHash("sha256").update(user.clerkSubject).digest("hex");
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": safetyIdentifier,
    },
    body: JSON.stringify({ session: {
      type: "realtime", model: "gpt-realtime-2.1-mini",
      audio: {
        input: {
          transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
          turn_detection: {
            type: "server_vad",
            create_response: true,
            interrupt_response: true,
          },
        },
        output: { voice: "marin" },
      },
      instructions: `You are a patient voice tutor for ${student.name}. Focus only on this objective: ${session.objective.objective}. Ask one short question at a time, wait for an answer, give age-appropriate hints rather than answers, and keep the learner safe and on task.`,
    }}),
  });
  if (!response.ok) { req.log.error({ status: response.status }, "OpenAI realtime secret request failed"); res.status(502).json({ error: "Unable to start voice tutoring" }); return; }
  const payload = await response.json() as { value?: string; expires_at?: number };
  if (!payload.value) { res.status(502).json({ error: "Voice tutoring returned an invalid session secret" }); return; }
  res.json({ value: payload.value, expiresAt: payload.expires_at ?? null });
});

router.post("/study-sessions/:sessionId/realtime-turns", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  const params = RecordRealtimeTurnParams.safeParse(req.params);
  const body = RecordRealtimeTurnBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid Realtime transcript" }); return; }
  const [row] = await db.select({ session: sessionsTable, objective: objectivesTable, mastery: masteryTable })
    .from(sessionsTable).innerJoin(objectivesTable, eq(sessionsTable.objectiveId, objectivesTable.id))
    .innerJoin(masteryTable, and(eq(masteryTable.objectiveId, sessionsTable.objectiveId), eq(masteryTable.studentId, sessionsTable.studentId)))
    .where(eq(sessionsTable.id, params.data.sessionId)).limit(1);
  if (!row || !await accessibleStudent(user, row.session.studentId)) { res.status(404).json({ error: "Study session not found" }); return; }
  if (row.session.status !== "active") { res.status(409).json({ error: "Study session is no longer active" }); return; }
  const answer = body.data.studentTranscript;

  let classification;
  try {
    classification = await classifyTutorAnswer({
      subject: row.objective.subject,
      topic: row.objective.topic,
      objective: row.objective.objective,
      context: body.data.assistantTranscript,
      studentAnswer: answer,
    });
  } catch (error) {
    if (error instanceof TutorGradingUnavailableError) {
      req.log.error({ err: error }, "Tutor grading unavailable for realtime turn");
      res.status(503).json({ error: "Tutor grading is not configured or is temporarily unavailable." });
      return;
    }
    req.log.error({ err: error }, "Tutor grading request failed for realtime turn");
    res.status(502).json({ error: "Unable to grade this exchange right now." });
    return;
  }
  const { evaluation, misconception } = classification;
  const delta = evaluation === "correct" ? 0.1 : evaluation === "almost" ? 0.03 : -0.02;
  const mastery = Math.max(0.05, Math.min(0.98, row.mastery.mastery + delta));
  const turnCount = row.session.turnCount + 1;
  await db.transaction(async (tx) => {
    await tx.update(sessionsTable).set({ turnCount }).where(eq(sessionsTable.id, row.session.id));
    await tx.update(masteryTable).set({ mastery, trend: delta > 0 ? "up" : "down", lastPracticed: "Just now", updatedAt: new Date() }).where(eq(masteryTable.id, row.mastery.id));
    await tx.insert(attemptsTable).values({ id: randomUUID(), sessionId: row.session.id, answer, inputMode: "voice", evaluation, misconception, metadata: { assistantTranscript: body.data.assistantTranscript, usage: body.data.usage, masteryBefore: row.mastery.mastery, masteryAfter: mastery } });
    if (mastery < 0.7) await tx.insert(revisionTable).values({ id: randomUUID(), studentId: row.session.studentId, objectiveId: row.objective.id, dueLabel: "Tomorrow", daysUntil: 1, reason: "Realtime response showed this objective needs a short retest." });
  });
  res.json(SubmitTutorTurnResponse.parse({ sessionId: row.session.id, response: body.data.assistantTranscript, responseType: evaluation === "correct" ? "encourage" : "hint", evaluation, mastery, nextPrompt: "Explain one more example in your own words.", nextPromptType: "question", turnCount, misconception, canUseVoice: true, subject: row.objective.subject, topic: row.objective.topic, objective: row.objective.objective }));
});

router.get("/curricula/class-6", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  res.json(GetClass6CurriculumResponse.parse(class6Curriculum));
});

router.get("/curricula/uploads", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "parent") { res.status(403).json({ error: "Only parents can access curriculum uploads" }); return; }
  const rows = await db
    .select()
    .from(curriculumUploadsTable)
    .where(eq(curriculumUploadsTable.ownerId, user.id))
    .orderBy(asc(curriculumUploadsTable.uploadedAt));
  res.json(ListCurriculumUploadsResponse.parse(rows.map(asUpload).reverse()));
});

router.post("/curricula/uploads", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "parent") { res.status(403).json({ error: "Only parents can import curriculum" }); return; }
  const parsed = CreateCurriculumUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uploadId = randomUUID();
  const importedObjectives = parseImportedObjectives(parsed.data);
  const [upload] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(curriculumUploadsTable)
      .values({
        id: uploadId,
        ownerId: user.id,
        title: parsed.data.title,
        school: parsed.data.school,
        grade: parsed.data.grade,
        subject: parsed.data.subject,
        term: parsed.data.term,
        fileName: parsed.data.fileName ?? null,
        contentText: parsed.data.contentText,
        status: importedObjectives.length ? "imported" : "needs_review",
        objectiveCount: importedObjectives.length,
      })
      .returning();

    if (importedObjectives.length) {
      await tx.insert(objectivesTable).values(
        importedObjectives.map((item) => ({
          ...item,
          syllabus: "Cambridge — Phoenix Greens",
          grade: parsed.data.grade,
          color: "#167D77",
          sourceId: uploadId,
        })),
      );
      const students = await tx
        .select()
        .from(studentsTable)
        .where(eq(studentsTable.ownerId, user.id));
      const masteryRows = students
        .filter((student) => student.grade.includes("6"))
        .flatMap((student) =>
          importedObjectives.map((objective) => ({
            id: randomUUID(),
            studentId: student.id,
            objectiveId: objective.id,
            mastery: 0.15,
            trend: "steady",
            lastPracticed: "Not started",
          })),
        );
      if (masteryRows.length) await tx.insert(masteryTable).values(masteryRows);
    }
    return [created];
  });

  res.status(201).json(
    CreateCurriculumUploadResponse.parse({
      upload: asUpload(upload),
      importedObjectives,
    }),
  );
});

router.get("/gmail/status", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "parent") { res.status(403).json({ error: "Only parents can access Gmail settings" }); return; }
  res.json(
    GetGmailStatusResponse.parse({
      connected: false,
      email: null,
      selectedLabels: [],
      lastSyncedAt: null,
      materialCount: 3,
      state: "not_connected",
    }),
  );
});

router.post("/gmail/sync", async (req, res): Promise<void> => {
  const user = await currentUser(req, res); if (!user) return;
  if (user.role !== "parent") { res.status(403).json({ error: "Only parents can sync Gmail" }); return; }
  const parsed = SyncGmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.status(409).json({
    error: "Connect Gmail before syncing selected labels.",
  });
});

export default router;