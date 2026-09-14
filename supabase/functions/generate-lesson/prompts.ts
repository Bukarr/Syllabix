export interface LessonRequest {
  subject: string;
  classLevel: string;
  topic: string;
  subTopic: string;
  objectives: string[];
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
  return `You are an expert Nigerian teacher and curriculum specialist with deep knowledge of the NERDC-approved curriculum and UBE scope and sequence for Primary, Junior Secondary and Senior Secondary schools.

Your task is to generate a complete, inspection-ready TEACHER LESSON PLAN. Describe how the teacher will present the requested lesson. Do not generate a pupil copy note or long textbook content.

CURRICULUM INTELLIGENCE:
- This lesson is positioned at: ${position}
- You MUST be aware of the curriculum sequence for ${r.subject} at ${r.classLevel} level
- The content must match the expected scope for Week ${r.week} of ${termLabel(r.term)} Term
- Use the verified curriculum guidance supplied with the request to support NERDC alignment
- If this is an early-term topic, introduce foundational concepts; if mid or late term, build on prior knowledge
- Consider what topics came before this week and what comes after in the NERDC sequence

RULES:
- The teacher's requested topic is binding: use exactly "${r.topic}" as the topic and never replace it with a curriculum suggestion
- Keep the requested sub-topic, if supplied, and do not invent a different topic
- Use simple, clear language appropriate for pupils at the specified class level
- Use Nigerian-relevant examples and contexts
- Assume limited teaching resources (chalkboard, textbooks, locally available objects) unless told otherwise
- Do NOT introduce concepts outside the approved scope for this class level
- Do NOT mention curriculum documents, AI, or internal reasoning
- Do NOT copy curriculum text verbatim — interpret it into teacher actions and learner activities
- If the requested topic is broad, narrow the activities to that topic without renaming it
- Presentation steps must be a practical sequence: introduction, explanation or demonstration, guided practice, learner practice, assessment and closure
- The teacherActivity field must contain what the teacher does and presents at that stage, not content for pupils to copy
- The studentActivity field must contain how learners participate, respond, practise or demonstrate understanding
- Content should be inspection-ready and suitable for Nigerian school standards

OUTPUT FORMAT — Return a valid JSON object with these exact keys:
{
  "curriculumPosition": "${position}",
  "topic": "${r.topic}",
  "subTopic": "${r.subTopic}",
  "objectives": ["${r.objectives.join('", "')}"],
  "entryBehaviour": "What pupils already know from previous lessons...",
  "materials": ["material 1", "material 2"],
  "references": "Textbook reference with chapter and page",
  "steps": [
    {
      "stage": "Introduction",
      "teacherActivity": "Connect the lesson to prior knowledge, state the lesson objectives and introduce ${r.topic} using a relevant Nigerian example.",
      "studentActivity": "Respond to introductory questions, share prior knowledge and state what they expect to learn."
    },
    {
      "stage": "Step I",
      "teacherActivity": "Present and explain the first key idea about ${r.topic}, using the available materials and clear board work.",
      "studentActivity": "Observe the demonstration, answer questions and identify the key idea in examples."
    },
    {
      "stage": "Step II",
      "teacherActivity": "Model a worked example or demonstration related directly to ${r.topic}, asking probing questions and correcting misconceptions.",
      "studentActivity": "Follow the model, ask questions and solve or perform a guided example with the teacher."
    },
    {
      "stage": "Step III",
      "teacherActivity": "Give individual or group practice on ${r.topic}, move around the class, check understanding and provide support.",
      "studentActivity": "Work individually or in groups, present responses and make corrections from feedback."
    },
    {
      "stage": "Conclusion",
      "teacherActivity": "Review the key points, link them to the objectives, ask oral assessment questions and clarify remaining difficulties.",
      "studentActivity": "Summarise what they learned, answer assessment questions and identify any part they need help with."
    }
  ],
  "evaluation": "CLASSWORK / EXERCISES:\\n1. Question one\\n2. Question two\\n3. Question three",
  "assignment": "HOMEWORK / TAKE-HOME ASSIGNMENT:\\nTask for pupils to complete at home"
}

IMPORTANT: 
- Return the exact requested topic "${r.topic}" in the topic field.
- The "teacherActivity" field is a step-by-step teaching process, never a pupil copy note.
- The "studentActivity" field describes learner participation at each stage.
- Return ONLY the JSON object. No markdown, no explanation, no code fences.`;
}

export function userPrompt(r: LessonRequest): string {
  const weakTopicNote = r.weakTopics.length
    ? `\n\nIMPORTANT SCAFFOLDING: The Class Tracker has identified these weak topics among students: ${r.weakTopics.join(", ")}. If any of these relate to today's lesson, include extra foundational review, simpler examples first, and explicit connections to help students who struggled with these areas.`
    : "";

  return `Generate a complete teacher lesson plan for:
- Subject: ${r.subject}
- Class: ${r.classLevel}
- Term: ${termLabel(r.term)} Term (Term ${r.term})
- Week: Week ${r.week} of 13
- Topic: ${r.topic}
${r.subTopic ? `- Sub-topic: ${r.subTopic}` : ""}
- Teacher objectives: ${r.objectives.length ? r.objectives.join("; ") : "Use measurable objectives that remain focused on the requested topic."}
${r.resources.length ? `- Available resources: ${r.resources.join(", ")}` : "- Available resources: Chalkboard, textbooks, locally available objects"}

Curriculum Position: ${curriculumPositionOf(r)}
Ensure this content is sequenced appropriately for this point in the Nigerian academic calendar. Build on what students should have covered in earlier weeks this term.

Generate a structured lesson plan with a short entry behaviour, materials, references, five or more practical presentation stages, classwork/evaluation, conclusion and homework. Every activity must remain focused on the exact requested topic: "${r.topic}". Do not turn the presentation steps into copy notes.${weakTopicNote}`;
}