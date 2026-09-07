const GRADING_MODEL = process.env.OPENAI_GRADING_MODEL || "gpt-4o-mini";

export type TutorEvaluation = "correct" | "almost" | "incorrect";

export class TutorGradingUnavailableError extends Error {}

interface ObjectiveContext {
  subject: string;
  topic: string;
  objective: string;
}

interface ClassifyInput extends ObjectiveContext {
  /** What the tutor said immediately before the student's answer (question asked, or spoken feedback). */
  context: string;
  studentAnswer: string;
}

export interface ClassifyResult {
  evaluation: TutorEvaluation;
  misconception: string | null;
}

interface GradeInput extends ObjectiveContext {
  studentName: string;
  priorPrompt: string;
  studentAnswer: string;
}

export interface GradeResult extends ClassifyResult {
  feedback: string;
  nextPrompt: string;
}

const SHARED_RUBRIC = [
  "Judge whether the answer demonstrates real understanding of the target objective — not just answer length or whether it repeats topic words.",
  "- 'correct': the answer is substantively right and shows understanding.",
  "- 'almost': the core idea is present but missing precision, a concrete example, or the reasoning behind it.",
  "- 'incorrect': the answer is wrong, off-topic, or shows no understanding.",
].join("\n");

async function callGradingModel<T>(
  systemPrompt: string,
  userContent: string,
  schemaName: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TutorGradingUnavailableError("OPENAI_API_KEY is not configured");
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GRADING_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, schema, strict: true },
        },
        temperature: 0.4,
      }),
    });
  } catch (error) {
    throw new TutorGradingUnavailableError(
      `Tutor grading request could not be sent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new TutorGradingUnavailableError(
      `Tutor grading request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new TutorGradingUnavailableError("Tutor grading returned no content");
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new TutorGradingUnavailableError("Tutor grading returned unparseable content");
  }
}

function isEvaluation(value: unknown): value is TutorEvaluation {
  return value === "correct" || value === "almost" || value === "incorrect";
}

/**
 * Lightweight classification used to score a realtime voice exchange after the
 * voice model has already responded out loud — only the mastery bookkeeping
 * (evaluation + misconception) is needed, not a new response to show the student.
 */
export async function classifyTutorAnswer(input: ClassifyInput): Promise<ClassifyResult> {
  const systemPrompt = [
    `You are grading ${input.subject} understanding for a Grade 6 student.`,
    `Topic: ${input.topic}. Target learning objective: ${input.objective}.`,
    `The tutor just said: "${input.context}"`,
    SHARED_RUBRIC,
    "misconception should be null when evaluation is 'correct', otherwise a one-sentence description of the gap.",
  ].join("\n");

  const result = await callGradingModel<ClassifyResult>(
    systemPrompt,
    input.studentAnswer,
    "tutor_answer_classification",
    {
      type: "object",
      properties: {
        evaluation: { type: "string", enum: ["correct", "almost", "incorrect"] },
        misconception: { type: ["string", "null"] },
      },
      required: ["evaluation", "misconception"],
      additionalProperties: false,
    },
  );

  if (!isEvaluation(result.evaluation)) {
    throw new TutorGradingUnavailableError("Tutor grading returned an invalid evaluation");
  }
  return result;
}

interface ExplainInput extends ObjectiveContext {
  studentName: string;
}

export interface ExplainResult {
  explanation: string;
  checkQuestion: string;
}

/**
 * Generates the tutor's opening teaching turn for a new objective: a short,
 * age-appropriate explanation with a worked example, followed by one
 * comprehension question — so a session starts by teaching the concept
 * instead of asking the student to explain it sight-unseen.
 */
export async function explainObjective(input: ExplainInput): Promise<ExplainResult> {
  const systemPrompt = [
    `You are a warm, clear tutor introducing a new topic to ${input.studentName}, a Grade 6 student.`,
    `Subject: ${input.subject}. Topic: ${input.topic}.`,
    `Target learning objective: ${input.objective}.`,
    "Write 'explanation' as a short (3-5 sentence) teaching explanation of the concept in age-appropriate language, including one concrete worked example.",
    "Write 'checkQuestion' as one comprehension question that checks whether the student grasped what you just explained — not a restatement of the objective, and not something answerable without having read the explanation.",
  ].join("\n");

  return callGradingModel<ExplainResult>(
    systemPrompt,
    "Introduce this concept to the student now.",
    "tutor_objective_explanation",
    {
      type: "object",
      properties: {
        explanation: { type: "string" },
        checkQuestion: { type: "string" },
      },
      required: ["explanation", "checkQuestion"],
      additionalProperties: false,
    },
  );
}

interface ExerciseInput extends ObjectiveContext {
  studentName: string;
}

export interface ExerciseResult {
  question: string;
}

/**
 * Generates one exercise/exam-style question for an objective the student has
 * just shown basic comprehension of — the kind of question they'd actually
 * face in schoolwork or a test, not another "explain it back to me" prompt.
 * Passing this is what the session treats as evidence of real mastery.
 */
export async function generateExerciseQuestion(input: ExerciseInput): Promise<ExerciseResult> {
  const systemPrompt = [
    `You are a Grade 6 ${input.subject} teacher writing one practice question for ${input.studentName}.`,
    `Topic: ${input.topic}. Target learning objective: ${input.objective}.`,
    "The student has just shown they understand the basic idea. Write ONE question in the style of a textbook exercise or short exam question that requires applying the concept (not just restating it) — e.g. solve a problem, analyze an example, or make a judgment using the concept.",
    "Keep it self-contained (no reference to 'the passage above' or similar) and answerable in a few sentences.",
  ].join("\n");

  return callGradingModel<ExerciseResult>(
    systemPrompt,
    "Write the practice question now.",
    "tutor_exercise_question",
    {
      type: "object",
      properties: {
        question: { type: "string" },
      },
      required: ["question"],
      additionalProperties: false,
    },
  );
}

/**
 * Full grading pass for a text turn: classifies the answer and authors the
 * tutor's next message (feedback plus the next question), grounded in what the
 * student actually wrote instead of a canned string.
 */
export async function gradeTutorAnswer(input: GradeInput): Promise<GradeResult> {
  const systemPrompt = [
    `You are a patient, encouraging tutor helping ${input.studentName}, a Grade 6 student, with ${input.subject}.`,
    `Topic: ${input.topic}. Target learning objective: ${input.objective}.`,
    `You just asked: "${input.priorPrompt}"`,
    SHARED_RUBRIC,
    "misconception should be null when evaluation is 'correct', otherwise a one-sentence description of the gap.",
    "Write 'feedback' as what you would say next to the student directly (2-3 short sentences, age-appropriate, specific to their actual answer — never a generic template).",
    "If evaluation is 'correct', 'nextPrompt' should be a new question that applies or extends the concept in a slightly different way (like a textbook exercise or exam question).",
    "If evaluation is 'almost' or 'incorrect', 'feedback' should re-teach the specific piece the student is missing with a short concrete example, and 'nextPrompt' should be a smaller, more scaffolded question that isolates that gap.",
    "Never simply repeat the previous question verbatim.",
  ].join("\n");

  const result = await callGradingModel<GradeResult>(
    systemPrompt,
    input.studentAnswer,
    "tutor_turn_grade",
    {
      type: "object",
      properties: {
        evaluation: { type: "string", enum: ["correct", "almost", "incorrect"] },
        misconception: { type: ["string", "null"] },
        feedback: { type: "string" },
        nextPrompt: { type: "string" },
      },
      required: ["evaluation", "misconception", "feedback", "nextPrompt"],
      additionalProperties: false,
    },
  );

  if (!isEvaluation(result.evaluation)) {
    throw new TutorGradingUnavailableError("Tutor grading returned an invalid evaluation");
  }
  return result;
}

export interface ExtractedObjective {
  subject: string;
  strand: string;
  topic: string;
  objective: string;
}

const MAX_EXTRACTION_INPUT_CHARS = 60_000;
const MAX_EXTRACTED_OBJECTIVES = 40;

/**
 * Turns freeform text — a pasted syllabus, or text extracted from a photo or
 * PDF of school notes or a textbook — into a bounded list of real,
 * assessable curriculum objectives. Replaces a "treat every line as an
 * objective" heuristic that produces noise on actual prose (textbook
 * paragraphs, publisher front matter, picture captions) rather than a
 * pre-formatted objective list.
 */
export async function extractObjectivesFromContent(input: {
  defaultSubject: string;
  defaultTerm: string;
  contentText: string;
}): Promise<ExtractedObjective[]> {
  const excerpt = input.contentText.slice(0, MAX_EXTRACTION_INPUT_CHARS);
  const systemPrompt = [
    "You are helping a parent import school syllabus or textbook content into a curriculum tracker for their child.",
    `If the text doesn't say otherwise, assume the subject is "${input.defaultSubject}" and the term is "${input.defaultTerm}".`,
    "Read the text and list the distinct topics or lessons it actually teaches as real, assessable learning objectives (e.g. 'Explain how the digestive system breaks down food during digestion') — not chapter titles alone, and not a summary of the whole document.",
    "Ignore front matter, publisher marketing, tables of contents, indexes, page headers/footers, and anything that isn't teaching content.",
    `Return at most ${MAX_EXTRACTED_OBJECTIVES} objectives, one entry per distinct topic — fewer is fine if the text doesn't cover that many. If the text has no real teaching content at all, return an empty list.`,
  ].join("\n");

  const result = await callGradingModel<{ objectives: ExtractedObjective[] }>(
    systemPrompt,
    excerpt,
    "extracted_curriculum_objectives",
    {
      type: "object",
      properties: {
        objectives: {
          type: "array",
          items: {
            type: "object",
            properties: {
              subject: { type: "string" },
              strand: { type: "string" },
              topic: { type: "string" },
              objective: { type: "string" },
            },
            required: ["subject", "strand", "topic", "objective"],
            additionalProperties: false,
          },
        },
      },
      required: ["objectives"],
      additionalProperties: false,
    },
  );

  if (!Array.isArray(result.objectives)) {
    throw new TutorGradingUnavailableError("Objective extraction returned an unexpected shape");
  }
  return result.objectives.slice(0, MAX_EXTRACTED_OBJECTIVES);
}
