// ─── MOCK: Complete course content ─────────────────────────────────────
// ⚠️ Format IDENTICAL to that of the API. When connecting the backend, this file is deleted.
//
//   Section = { id, course_id, title, order }
//   Item    = { id, section_id, item_type: “welcome”|“content”|‘review’|“quizz”, ... }
//   Content = { id, title, type: “readme”|‘youtube’|“canva”, data, order }

// Course sections (GET /api/courses/:id/sections)
export const MOCK_SECTIONS = [
  { id: 1, course_id: 1, title: "Getting Started", orden: 1 },
  { id: 2, course_id: 1, title: "Core Concepts",   orden: 2 },
  { id: 3, course_id: 1, title: "Advanced Topics", orden: 3 },
];

// Welcome message by section (item_type: “welcome”)
export const MOCK_WELCOME = {
  1: {
    message: "Hi! I'm Dr. Sarah Chen. In this section you'll gain a solid foundation in the key concepts and set yourself up for success. Watch the intro below, then move on to the content.",
    videoUrl: "dQw4w9WgXcQ",
  },
  2: {
    message: "Now that you know the basics, let's dig into the core ideas that power everything else.",
    videoUrl: "",
  },
  3: {
    message: "Time for the advanced material. Take your time with these concepts.",
    videoUrl: "",
  },
};

// Content blocks by section (GET /api/sections/:id/contents)
export const MOCK_COURSE_CONTENTS = {
  1: [
    {
      id: 1,
      titulo: "Key Concepts",
      tipo: "readme",
      datos: `## Key Concepts

In this section we explore the ideas that underpin the course.

- **Abstraction** simplifies complex systems
- **Modularity** keeps code maintainable
- **Iteration** drives continuous improvement

### Why this matters

Understanding these principles helps you build more **robust** and scalable solutions.

> Tip: revisit this section whenever you feel stuck.`,
      orden: 1,
    },
    {
      id: 2,
      titulo: "Intro Video",
      tipo: "youtube",
      datos: "dQw4w9WgXcQ",
      orden: 2,
    },
    {
      id: 3,
      titulo: "Commercial Pitch Training",
      tipo: "canva",
      datos: "https://www.canva.com/design/DAHMOD8pb74/tAhkFwGeNUV9ScjlbDToyg/view?embed",
      orden: 3,
    },
  ],
  2: [
    {
      id: 4,
      titulo: "Deep Dive",
      tipo: "readme",
      datos: `## Going Deeper

Here we build on the fundamentals.

1. Break the problem down
2. Identify the patterns
3. Apply the right abstraction

\`\`\`js
const solve = (problem) => problem.split().map(fix);
\`\`\``,
      orden: 1,
    },
  ],
  3: [
    {
      id: 5,
      titulo: "Advanced Material",
      tipo: "readme",
      datos: "## Advanced Topics\n\nThis is where everything comes together.",
      orden: 1,
    },
  ],
};

// Actividad de repaso por sección (tipo_item: "review")
export const MOCK_REVIEWS = {
  1: {
    format: "fill-blanks",
    blankText: "The [[HTTP]] protocol is the foundation of data communication on the [[web]]. A [[server]] responds to requests made by the client.",
    instantFeedback: true,
    points: 100,
  },
  2: {
    format: "match-pairs",
    pairs: [
      { id: 1, term: "HTML", def: "Structure of a webpage" },
      { id: 2, term: "CSS", def: "Styling and layout" },
      { id: 3, term: "JavaScript", def: "Interactivity and logic" },
    ],
    instantFeedback: true,
    points: 100,
  },
  3: {
    format: "reorder-steps",
    steps: [
      { id: 1, text: "Define the problem statement" },
      { id: 2, text: "Gather requirements" },
      { id: 3, text: "Design the solution" },
      { id: 4, text: "Implement and test" },
    ],
    instantFeedback: true,
    points: 100,
  },
};

// Quiz by section (item_type: “quizz”)
export const MOCK_QUIZZES = {
  1: {
    points: 50,
    questions: [
      {
        id: 1,
        text: "What is the primary purpose of the approach covered in this section?",
        options: ["Reduce code complexity", "Improve scalability and performance", "Simplify debugging workflows", "Minimize development time"],
        correct: 1,
      },
      {
        id: 2,
        text: "Which of the following is a key principle discussed in the content?",
        options: ["Single responsibility", "Multiple inheritance", "Deep coupling", "Global state management"],
        correct: 0,
      },
      {
        id: 3,
        text: "What would be the best approach when applying this concept to a real project?",
        options: ["Apply it everywhere immediately", "Start with the most critical components", "Avoid it in production environments", "Only use it for testing"],
        correct: 1,
      },
    ],
  },
  2: {
    points: 50,
    questions: [
      {
        id: 4,
        text: "Which concept keeps code maintainable?",
        options: ["Modularity", "Duplication", "Coupling", "Hardcoding"],
        correct: 0,
      },
    ],
  },
  3: {
    points: 50,
    questions: [
      {
        id: 5,
        text: "What drives continuous improvement?",
        options: ["Iteration", "Stagnation", "Guesswork", "Isolation"],
        correct: 0,
      },
    ],
  },
};

// Final Exam for the Course
export const MOCK_FINAL = {
  points: 200,
  questions: [
    {
      id: 100,
      text: "Final question 1: Describe the overall methodology.",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
    },
    {
      id: 101,
      text: "Final question 2: When should you use this technique?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 2,
    },
  ],
};

// Course Leaderboard  (GET /api/courses/:id/leaderboard)
export const MOCK_LEADERBOARD = [
  { id: 1, name: "Sarah Liu",    points: 2840 },
  { id: 2, name: "Jordan Kim",   points: 2150 },
  { id: 3, name: "Michael Torres", points: 1920 },
  { id: 4, name: "Priya Sharma", points: 1780 },
  { id: 5, name: "Alex Chen",    points: 1540 },
  { id: 6, name: "Emma Walsh",   points: 1320 },
  { id: 7, name: "Omar Hassan",  points: 980 },
];
