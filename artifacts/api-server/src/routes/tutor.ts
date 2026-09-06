import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  attemptsTable,
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

const router: IRouter = Router();
const DEMO_OWNER_ID = "demo-parent";
let curriculumSeedPromise: Promise<void> | null = null;

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

    const students = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.ownerId, DEMO_OWNER_ID));
    const existingMastery = await db
      .select({
        studentId: masteryTable.studentId,
        objectiveId: masteryTable.objectiveId,
      })
      .from(masteryTable);
    const existing = new Set(
      existingMastery.map((item) => `${item.studentId}:${item.objectiveId}`),
    );
    const rows = students
      .filter((student) => student.grade.includes("6"))
      .flatMap((student) =>
        class6Objectives
          .filter((objective) => !existing.has(`${student.id}:${objective.id}`))
          .map((objective, index) => ({
            id: randomUUID(),
            studentId: student.id,
            objectiveId: objective.id,
            mastery: 0.28 + (index % 5) * 0.04,
            trend: "steady",
            lastPracticed: "Not started",
          })),
      );
    if (rows.length) await db.insert(masteryTable).values(rows);
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

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.ownerId, DEMO_OWNER_ID))
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

router.get("/students", async (_req, res): Promise<void> => {
  const students = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.ownerId, DEMO_OWNER_ID))
    .orderBy(asc(studentsTable.createdAt));
  res.json(ListStudentsResponse.parse(students.map(asStudent)));
});

router.post("/students", async (req, res): Promise<void> => {
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
      ownerId: DEMO_OWNER_ID,
      name: parsed.data.name,
      grade: parsed.data.grade,
      syllabus: parsed.data.syllabus,
      avatar: initials || "ST",
      streak: 0,
      nextSession: "Ready when you are",
    })
    .returning();

  res.status(201).json(CreateStudentResponse.parse(asStudent(student)));
});

router.get("/students/:studentId/mastery", async (req, res): Promise<void> => {
  const params = GetStudentMasteryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

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
  const params = GetStudentMaterialsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(materialsTable)
    .where(eq(materialsTable.studentId, params.data.studentId));
  res.json(GetStudentMaterialsResponse.parse(rows));
});

router.get("/students/:studentId/revision", async (req, res): Promise<void> => {
  const params = GetStudentRevisionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

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
    const params = StartStudySessionParams.safeParse(req.params);
    const body = StartStudySessionBody.safeParse(req.body ?? {});
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid study session request" });
      return;
    }

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

    const [session] = await db
      .insert(sessionsTable)
      .values({
        id: randomUUID(),
        studentId: params.data.studentId,
        objectiveId: selected.objectiveId,
        status: "active",
        turnCount: 0,
      })
      .returning();

    res.status(201).json(
      StartStudySessionResponse.parse({
        id: session.id,
        studentId: session.studentId,
        subject: selected.subject,
        topic: selected.topic,
        objective: selected.objective,
        prompt: `Let's work on ${selected.objective.toLowerCase()}. Explain the idea in your own words and give one example, even if you are not completely sure.`,
        promptType: "question",
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

    const normalized = body.data.answer.toLowerCase();
    const topicWords = row.objective.topic
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length >= 4);
    const usesTopicLanguage = topicWords.some((word) => normalized.includes(word));
    const isCorrect = normalized.trim().length >= 40 && usesTopicLanguage;
    const isAlmost =
      !isCorrect &&
      (usesTopicLanguage || normalized.trim().length >= 18);
    const evaluation = isCorrect
      ? "correct"
      : isAlmost
        ? "almost"
        : "incorrect";
    const delta = isCorrect ? 0.1 : isAlmost ? 0.03 : -0.02;
    const nextMastery = Math.max(
      0.05,
      Math.min(0.98, row.mastery.mastery + delta),
    );
    const turnCount = row.session.turnCount + 1;
    const misconception = isCorrect
      ? null
      : isAlmost
        ? "The core idea is present, but the explanation needs a specific example or supporting reason."
        : "The response does not yet connect clearly to the target concept.";

    await db.transaction(async (tx) => {
      await tx
        .update(sessionsTable)
        .set({ turnCount })
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

    const response = isCorrect
      ? `Good explanation. You connected your example to ${row.objective.topic.toLowerCase()} and made the reasoning visible.`
      : isAlmost
        ? "You have the central idea. Strengthen it with one concrete example and explain why that example fits."
        : `Let’s make this smaller. Start by defining ${row.objective.topic.toLowerCase()} in one sentence, then we will build an example together.`;
    const nextPrompt = isCorrect
      ? "Now give a different example and explain what would change if one important condition were removed."
      : isAlmost
        ? "What is one specific example, and which part of your explanation does it support?"
        : `In your own words, what does ${row.objective.topic.toLowerCase()} mean?`;

    res.json(
      SubmitTutorTurnResponse.parse({
        sessionId: row.session.id,
        response,
        responseType: isCorrect ? "retest" : "hint",
        evaluation,
        mastery: nextMastery,
        nextPrompt,
        nextPromptType: "question",
        turnCount,
        misconception,
        canUseVoice: false,
      }),
    );
  },
);

router.post(
  "/study-sessions/:sessionId/complete",
  async (req, res): Promise<void> => {
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

    await db
      .update(sessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(sessionsTable.id, row.session.id));

    res.json(
      CompleteStudySessionResponse.parse({
        sessionId: row.session.id,
        topic: row.objective.topic,
        learned: row.objective.objective,
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

router.get("/curricula/class-6", async (_req, res): Promise<void> => {
  res.json(GetClass6CurriculumResponse.parse(class6Curriculum));
});

router.get("/curricula/uploads", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(curriculumUploadsTable)
    .where(eq(curriculumUploadsTable.ownerId, DEMO_OWNER_ID))
    .orderBy(asc(curriculumUploadsTable.uploadedAt));
  res.json(ListCurriculumUploadsResponse.parse(rows.map(asUpload).reverse()));
});

router.post("/curricula/uploads", async (req, res): Promise<void> => {
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
        ownerId: DEMO_OWNER_ID,
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
        .where(eq(studentsTable.ownerId, DEMO_OWNER_ID));
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

router.get("/gmail/status", async (_req, res): Promise<void> => {
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