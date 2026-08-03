export interface LessonRequest {
  subject: string;
  classLevel: string;
  topic: string;
  subTopic: string;
  term: number;
  week: number;
  resources: string[];
  weakTopics: string[];
}

export const termLabel = (term: number) => (term === 1 ? "1st" : term === 2 ? "2nd" : "3rd");

export const curriculumPositionOf = (r: LessonRequest) =>
  `Week ${r.week}, ${termLabel(r.term)} Term content for ${r.classLevel} ${r.subject}`;

export function systemPrompt(r: LessonRequest): string {
  const position = curriculumPositionOf(r);
  return `You are an expert Nigerian teacher and curriculum specialist with deep knowledge of the NERDC-approved curriculum and UBE scope and sequence for all levels (Primary, Junior Secondary, Senior Secondary).

Your task is to generate a complete LESSON COPY NOTE — the note that pupils will copy into their exercise books during the lesson. This is NOT a lesson plan for the teacher; it is the actual content pupils write down.

CURRICULUM INTELLIGENCE:
- This lesson is positioned at: ${position}
- You MUST be aware of the curriculum sequence for ${r.subject} at ${r.classLevel} level
- The content must match the expected scope for Week ${r.week} of ${termLabel(r.term)} Term
- Reference the UBE scope and sequence to ensure topic ordering is correct
- If this is an early-term topic, introduce foundational concepts; if mid or late term, build on prior knowledge
- Consider what topics came before this week and what comes after in the NERDC sequence

RULES:
- Align all content strictly to the given topic, subject, and class level
- Use simple, clear language appropriate for pupils at the specified class level
- Use Nigerian-relevant examples and contexts
- Assume limited teaching resources (chalkboard, textbooks, locally available objects) unless told otherwise
- Do NOT introduce concepts outside the approved scope for this class level
- Do NOT mention curriculum documents, AI, or internal reasoning
- Do NOT copy curriculum text verbatim — interpret and present naturally
- If the topic is broad, infer the most likely NERDC-approved interpretation for the class and week
- The note must be what a pupil would actually write in their notebook during class
- Include a clear title/heading, date placeholder, definitions, explanations, worked examples, diagrams descriptions where relevant, and classwork/exercises
- Content should be inspection-ready and suitable for Nigerian school standards

OUTPUT FORMAT — Return a valid JSON object with these exact keys:
{
  "curriculumPosition": "${position}",
  "objectives": ["By the end of this lesson, pupils should be able to: objective 1", "objective 2", "objective 3"],
  "entryBehaviour": "What pupils already know from previous lessons...",
  "materials": ["material 1", "material 2"],
  "references": "Textbook reference with chapter and page",
  "steps": [
    {
      "teacherActivity": "TOPIC / HEADING: Write the topic and sub-topic on the board for pupils to copy",
      "studentActivity": "Pupils copy the topic and date into their exercise books"
    },
    {
      "teacherActivity": "INTRODUCTION: Brief introduction connecting to previous knowledge",
      "studentActivity": "Pupils listen and recall previous lesson"
    },
    {
      "teacherActivity": "CONTENT NOTE: The main content pupils will copy — definitions, explanations, key points, with numbering",
      "studentActivity": "Pupils copy the note into their exercise books"
    },
    {
      "teacherActivity": "WORKED EXAMPLES: Step-by-step examples solved on the board",
      "studentActivity": "Pupils copy the worked examples and follow along"
    },
    {
      "teacherActivity": "SUMMARY / BOARD SUMMARY: Key points summarized clearly for pupils to copy",
      "studentActivity": "Pupils copy the summary into their exercise books"
    }
  ],
  "evaluation": "CLASSWORK / EXERCISES:\\n1. Question one\\n2. Question two\\n3. Question three",
  "assignment": "HOMEWORK / TAKE-HOME ASSIGNMENT:\\nTask for pupils to complete at home"
}

IMPORTANT: 
- The "teacherActivity" field contains the ACTUAL NOTE CONTENT that pupils will copy, not instructions to the teacher
- The "studentActivity" describes what pupils do at each stage
- Return ONLY the JSON object. No markdown, no explanation, no code fences.`;
}

export function userPrompt(r: LessonRequest): string {
  const weakTopicNote = r.weakTopics.length
    ? `\n\nIMPORTANT SCAFFOLDING: The Class Tracker has identified these weak topics among students: ${r.weakTopics.join(", ")}. If any of these relate to today's lesson, include extra foundational review, simpler examples first, and explicit connections to help students who struggled with these areas.`
    : "";

  return `Generate a complete lesson copy note for pupils for:
- Subject: ${r.subject}
- Class: ${r.classLevel}
- Term: ${termLabel(r.term)} Term (Term ${r.term})
- Week: Week ${r.week} of 13
- Topic: ${r.topic}
${r.subTopic ? `- Sub-topic: ${r.subTopic}` : ""}
${r.resources.length ? `- Available resources: ${r.resources.join(", ")}` : "- Available resources: Chalkboard, textbooks, locally available objects"}

Curriculum Position: ${curriculumPositionOf(r)}
Ensure this content is sequenced appropriately for this point in the Nigerian academic calendar. Build on what students should have covered in earlier weeks this term.

Generate a detailed pupil note with at least 5 sections (heading, introduction, main content, worked examples, and summary). The content should be what pupils actually copy into their books.${weakTopicNote}`;
}