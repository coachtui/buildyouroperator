// Goals are the single source of truth for three consumers: the numbered list
// in Gojo's prompt, the grader's rubric, and the student-facing checklist.
// `criterion` is the verbatim curriculum sentence; `label` is short UI copy.

export interface LessonGoal {
  id: number
  label: string
  criterion: string
}

export const LESSON_GOALS: Record<string, LessonGoal[]> = {
  '1': [
    {
      id: 1,
      label: 'AI is a tool, not magic',
      criterion: `The student understands that AI is a tool that responds to instructions. Not magic, not a search engine, not a person.`,
    },
    {
      id: 2,
      label: 'Your input decides the output',
      criterion: `The student understands that the quality of their instructions determines the quality of the output — the AI is only as useful as what you give it.`,
    },
    {
      id: 3,
      label: 'A real insight landed',
      criterion: `The student has a concrete moment of insight they didn't have before they opened this chat.`,
    },
  ],
  '2': [
    {
      id: 1,
      label: 'What you type controls what you get',
      criterion: `The student understands that what they type to an AI (their "message" / "question" / eventually "prompt") directly controls what they get back.`,
    },
    {
      id: 2,
      label: 'Weak vs. strong instructions',
      criterion: `The student can identify what makes a weak instruction vs. a strong one — without any jargon.`,
    },
    {
      id: 3,
      label: 'Rewrote one of your own',
      criterion: `The student rewrites one of their own real, bad instructions into a good one — and sees the difference themselves.`,
    },
    {
      id: 4,
      label: 'You earned the word "prompt"',
      criterion: `The student leaves knowing the word "prompt" and what it means, because they earned it.`,
    },
  ],
  '3': [
    {
      id: 1,
      label: 'Told Gojo what you actually do',
      criterion: `The student tells you what they actually do for work and what they've tried so far.`,
    },
    {
      id: 2,
      label: 'Got one specific recommendation',
      criterion: `Based on their answer, you recommend one tool specifically — with a reason tied to their situation.`,
    },
    {
      id: 3,
      label: 'Committed to one tool',
      criterion: `They commit to it: "That's my tool." Not "I'll try all three."`,
    },
    {
      id: 4,
      label: 'Know how to access it',
      criterion: `They know how to access it and what the free vs paid difference is for their chosen tool.`,
    },
  ],
  '4': [
    {
      id: 1,
      label: 'Named your most annoying tasks',
      criterion: `You know exactly what they do for work and what their most time-consuming or annoying tasks are.`,
    },
    {
      id: 2,
      label: 'Built your first job-specific prompt',
      criterion: `Together you build the first job-specific prompt live in the conversation — they write it, you refine it.`,
    },
    {
      id: 3,
      label: 'Have 2+ prompts to use today',
      criterion: `They have at least 2 prompts they can take to their tool today.`,
    },
    {
      id: 4,
      label: 'Best prompts come from your situation',
      criterion: `They understand that the best prompts come from their specific situation, not generic templates.`,
    },
  ],
  '5': [
    {
      id: 1,
      label: 'Picked one repeated task',
      criterion: `They identify one specific task they do repeatedly that currently takes too long or requires too much thinking.`,
    },
    {
      id: 2,
      label: 'Mapped it into steps',
      criterion: `Together you map out the steps of that task in plain language.`,
    },
    {
      id: 3,
      label: 'Turned steps into a reusable prompt',
      criterion: `You help them turn those steps into a prompt (or sequence of prompts) they can reuse.`,
    },
    {
      id: 4,
      label: 'Ran it for real',
      criterion: `They run it once, right now, in their chosen tool. They come back and tell you the result.`,
    },
    {
      id: 5,
      label: 'Know you can reuse it',
      criterion: `They leave knowing this is reusable — they can do this again next time in minutes.`,
    },
  ],
  '6': [
    {
      id: 1,
      label: 'Named what changed since Lesson 1',
      criterion: `The student reflects on how they've changed since Lesson 1 — what they can do now that they couldn't before.`,
    },
    {
      id: 2,
      label: 'User vs. operator, in your words',
      criterion: `They understand the user vs. operator distinction in plain terms, using their own examples.`,
    },
    {
      id: 3,
      label: 'Named one thing you want to build',
      criterion: `They articulate one thing they want to build or do that they now know is possible.`,
    },
    {
      id: 4,
      label: 'Left feeling capable',
      criterion: `They leave feeling capable — not overwhelmed — and curious about what comes next.`,
    },
  ],
}

/** The `## Lesson N goals — in order` block, generated from LESSON_GOALS. */
export function renderGoalsSection(lessonKey: string): string {
  const goals = LESSON_GOALS[lessonKey] ?? []
  const lines = goals.map(g => `${g.id}. ${g.criterion}`).join('\n')
  return `## Lesson ${lessonKey} goals — in order\n${lines}`
}
