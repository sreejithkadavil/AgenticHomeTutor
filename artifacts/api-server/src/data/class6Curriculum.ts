export type Class6Objective = {
  id: string;
  subject: string;
  strand: string;
  topic: string;
  objective: string;
  term: string;
  source: string;
  sequence: number;
  color: string;
};

const SOURCE = "Cambridge Lower Secondary baseline";
const colors: Record<string, string> = {
  English: "#7357B8",
  Mathematics: "#167D77",
  Science: "#D16A3A",
  "Global Perspectives": "#C08B2C",
  Computing: "#3973B8",
  French: "#C64F73",
  Telugu: "#5D7D3D",
};

type ObjectiveTuple = [
  subject: string,
  strand: string,
  topic: string,
  objective: string,
  term: string,
];

const rows: ObjectiveTuple[] = [
  ["English", "Reading", "Explicit meaning", "Retrieve, select and combine relevant information from fiction and non-fiction texts.", "Term 1"],
  ["English", "Reading", "Inference", "Support inferences about characters, viewpoints and events with precise textual evidence.", "Term 1"],
  ["English", "Reading", "Structure", "Explain how paragraphing, sequencing and text structure guide a reader.", "Term 1"],
  ["English", "Reading", "Language effects", "Analyse how vocabulary, imagery and figurative language create meaning and mood.", "Term 2"],
  ["English", "Reading", "Purpose and audience", "Compare how writers adapt language and presentation for different audiences and purposes.", "Term 2"],
  ["English", "Reading", "Comparison", "Compare themes, ideas and perspectives across two or more texts.", "Term 3"],
  ["English", "Writing", "Narrative writing", "Plan and craft coherent narratives using viewpoint, setting, character and controlled pacing.", "Term 1"],
  ["English", "Writing", "Non-fiction writing", "Write organised explanations, reports and arguments suited to purpose and audience.", "Term 2"],
  ["English", "Writing", "Accuracy", "Use varied sentence structures, punctuation and paragraphing accurately for effect.", "Term 2"],
  ["English", "Writing", "Editing", "Review and revise writing for clarity, cohesion, vocabulary and technical accuracy.", "Term 3"],
  ["English", "Speaking and listening", "Discussion", "Build on others’ ideas, ask relevant questions and justify a viewpoint in discussion.", "Term 1"],
  ["English", "Speaking and listening", "Presentation", "Deliver a structured presentation with language, tone and non-verbal choices suited to the audience.", "Term 3"],

  ["Mathematics", "Number", "Integers", "Order, compare and calculate with positive and negative integers in practical contexts.", "Term 1"],
  ["Mathematics", "Number", "Factors and multiples", "Use prime factors, common factors and common multiples to solve problems.", "Term 1"],
  ["Mathematics", "Number", "Fractions", "Compare, simplify and calculate with fractions and mixed numbers.", "Term 1"],
  ["Mathematics", "Number", "Decimals and percentages", "Move fluently between fractions, decimals and percentages and apply them to quantities.", "Term 1"],
  ["Mathematics", "Number", "Ratio and proportion", "Use ratio notation and proportional reasoning to compare and scale quantities.", "Term 2"],
  ["Mathematics", "Number", "Estimation", "Estimate, round and check calculations using appropriate degrees of accuracy.", "Term 2"],
  ["Mathematics", "Algebra", "Expressions", "Use letters to represent numbers and simplify linear algebraic expressions.", "Term 1"],
  ["Mathematics", "Algebra", "Equations", "Form and solve one-step and two-step linear equations.", "Term 2"],
  ["Mathematics", "Algebra", "Sequences", "Describe and continue sequences and express simple term-to-term rules.", "Term 2"],
  ["Mathematics", "Geometry", "Angles and constructions", "Use angle facts and ruler-and-compass constructions to solve geometric problems.", "Term 2"],
  ["Mathematics", "Geometry", "Transformations", "Describe and perform reflections, rotations, translations and enlargements on coordinate grids.", "Term 3"],
  ["Mathematics", "Measure", "Perimeter, area and volume", "Calculate perimeter and area of compound shapes and volume of cuboids using consistent units.", "Term 3"],
  ["Mathematics", "Statistics", "Data representation", "Collect, organise and represent data using appropriate tables, charts and graphs.", "Term 3"],
  ["Mathematics", "Probability", "Chance", "Describe probability on a scale and calculate probabilities for simple equally likely outcomes.", "Term 3"],

  ["Science", "Scientific enquiry", "Planning investigations", "Ask testable questions, identify variables and plan fair, safe investigations.", "Term 1"],
  ["Science", "Scientific enquiry", "Evidence", "Record observations accurately and present evidence in tables, charts and graphs.", "Term 1"],
  ["Science", "Scientific enquiry", "Conclusions", "Interpret patterns, evaluate evidence and explain whether results support a prediction.", "Term 3"],
  ["Science", "Biology", "Cells", "Describe cells as the basic units of life and relate specialised cell structures to functions.", "Term 1"],
  ["Science", "Biology", "Body systems", "Explain how major human organ systems work together to sustain life.", "Term 1"],
  ["Science", "Biology", "Reproduction", "Describe growth, adolescence and the main stages of human reproduction sensitively and accurately.", "Term 2"],
  ["Science", "Biology", "Ecosystems", "Model feeding relationships and explain how environmental changes affect populations.", "Term 3"],
  ["Science", "Chemistry", "Particles and states", "Use the particle model to explain solids, liquids, gases and changes of state.", "Term 1"],
  ["Science", "Chemistry", "Elements and compounds", "Distinguish elements, compounds and mixtures using particle-level representations.", "Term 2"],
  ["Science", "Chemistry", "Chemical reactions", "Recognise evidence of chemical change and represent simple reactions with word equations.", "Term 2"],
  ["Science", "Chemistry", "Acids and alkalis", "Use indicators and the pH scale to compare acidic, neutral and alkaline substances safely.", "Term 3"],
  ["Science", "Physics", "Forces and motion", "Represent forces and explain how balanced and unbalanced forces affect motion.", "Term 1"],
  ["Science", "Physics", "Energy", "Identify energy stores and transfers and explain conservation in familiar systems.", "Term 2"],
  ["Science", "Physics", "Waves", "Describe key properties of light and sound and explain reflection and absorption.", "Term 3"],

  ["Global Perspectives", "Research", "Questions and sources", "Form focused research questions and locate relevant primary and secondary sources.", "Term 1"],
  ["Global Perspectives", "Research", "Source evaluation", "Assess sources for relevance, credibility, bias and supporting evidence.", "Term 1"],
  ["Global Perspectives", "Analysis", "Causes and consequences", "Identify and explain causes, consequences and connections within a global issue.", "Term 2"],
  ["Global Perspectives", "Analysis", "Perspectives", "Compare personal, local, national and global perspectives on an issue.", "Term 2"],
  ["Global Perspectives", "Evaluation", "Arguments", "Evaluate claims, reasons and evidence before reaching a balanced conclusion.", "Term 2"],
  ["Global Perspectives", "Collaboration", "Team project", "Plan roles, contribute responsibly and resolve disagreements during a team project.", "Term 3"],
  ["Global Perspectives", "Communication", "Evidence-led presentation", "Communicate a researched conclusion clearly and cite the evidence used.", "Term 3"],
  ["Global Perspectives", "Reflection", "Learning reflection", "Reflect on how research and collaboration changed personal understanding.", "Term 3"],

  ["Computing", "Computational thinking", "Decomposition", "Break a problem into smaller parts and identify inputs, processes and outputs.", "Term 1"],
  ["Computing", "Programming", "Algorithms", "Design and trace precise algorithms using sequence, selection and iteration.", "Term 1"],
  ["Computing", "Programming", "Variables and data", "Create programs that use variables, operators and appropriate data types.", "Term 2"],
  ["Computing", "Programming", "Testing and debugging", "Use test cases to find, explain and correct errors in programs.", "Term 2"],
  ["Computing", "Data", "Representation", "Explain how text, images and numbers can be represented digitally.", "Term 2"],
  ["Computing", "Networks", "Connected systems", "Describe how devices exchange data across networks and the internet.", "Term 3"],
  ["Computing", "Digital literacy", "Information quality", "Search strategically and evaluate the accuracy and reliability of online information.", "Term 1"],
  ["Computing", "Digital citizenship", "Safety and responsibility", "Protect privacy, create secure passwords and act responsibly in online communities.", "Term 3"],

  ["French", "Listening", "Everyday communication", "Understand the main points and selected details in short, clearly spoken everyday French.", "Term 1"],
  ["French", "Speaking", "Introductions", "Introduce self, family, school life and interests using familiar phrases and accurate pronunciation.", "Term 1"],
  ["French", "Reading", "Short texts", "Read short messages, descriptions and notices and identify key information.", "Term 1"],
  ["French", "Writing", "Personal information", "Write linked sentences about personal routines, preferences and experiences.", "Term 1"],
  ["French", "Vocabulary", "Home and school", "Use core vocabulary for family, home, school subjects, time and daily routines.", "Term 1"],
  ["French", "Grammar", "Present tense", "Use common regular verbs and key irregular verbs in the present tense.", "Term 2"],
  ["French", "Grammar", "Agreement", "Apply gender, articles, adjective agreement and common plural patterns.", "Term 2"],
  ["French", "Communication", "Transactions", "Ask and answer questions about food, shopping, directions and plans.", "Term 2"],
  ["French", "Culture", "Francophone worlds", "Identify selected features of daily life and culture across Francophone communities.", "Term 3"],
  ["French", "Integrated skills", "Independent response", "Combine listening, speaking, reading and writing to complete a short real-life task.", "Term 3"],

  ["Telugu", "Listening and speaking", "Conversation", "Understand and participate in age-appropriate conversations about home, school and community.", "Term 1"],
  ["Telugu", "Reading", "Fluency", "Read grade-appropriate prose and poetry aloud with accurate pronunciation and expression.", "Term 1"],
  ["Telugu", "Reading", "Comprehension", "Identify main ideas, details, sequence and implied meaning in literary and informational texts.", "Term 2"],
  ["Telugu", "Writing", "Paragraphs", "Write coherent paragraphs, descriptions and short narratives for familiar purposes.", "Term 2"],
  ["Telugu", "Language", "Grammar", "Apply grade-appropriate sentence structure, word forms, agreement and punctuation.", "Term 2"],
  ["Telugu", "Vocabulary", "Word knowledge", "Use contextual clues, synonyms, antonyms and idiomatic expressions to extend vocabulary.", "Term 1"],
  ["Telugu", "Literature", "Response", "Respond to themes, characters and poetic features with evidence from the text.", "Term 3"],
  ["Telugu", "Culture", "Heritage", "Explore selected Telugu cultural traditions, writers and forms of expression respectfully.", "Term 3"],
];

export const class6Objectives: Class6Objective[] = rows.map(
  ([subject, strand, topic, objective, term], index) => ({
    id: `pg6-${subject.toLowerCase().replace(/[^a-z]+/g, "-")}-${String(index + 1).padStart(2, "0")}`,
    subject,
    strand,
    topic,
    objective,
    term,
    source: SOURCE,
    sequence: index + 1,
    color: colors[subject],
  }),
);

export const class6Curriculum = {
  name: "Phoenix Greens Class 6 Cambridge baseline",
  school: "Phoenix Greens School of Learning, Hyderabad",
  grade: "Grade 6",
  pathway: "Cambridge Lower Secondary",
  stageNote:
    "Phoenix Greens publicly maps Grades 6–8 to Cambridge Lower Secondary. The school does not publish a one-to-one Cambridge stage number for Grade 6.",
  academicYear: "2026–27",
  sourceNote:
    "The subject set is verified from Phoenix Greens. Detailed objectives are a tutor-ready baseline aligned to public Cambridge curriculum outlines; uploaded school documents take precedence.",
  subjects: Object.entries(
    class6Objectives.reduce<Record<string, Set<string>>>((acc, item) => {
      (acc[item.subject] ??= new Set()).add(item.strand);
      return acc;
    }, {}),
  ).map(([name, strands]) => ({
    name,
    objectiveCount: class6Objectives.filter((item) => item.subject === name).length,
    color: colors[name],
    strands: [...strands],
  })),
  objectives: class6Objectives.map(({ color: _color, ...objective }) => objective),
};