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
