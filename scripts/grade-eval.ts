// Grader eval. Real API calls — run deliberately, not in CI.
//   npm run grade-eval
// Each case asserts which goal ids the grader marks newly-met. Tune the
// grader prompt until all cases pass, then keep them as a regression net.
import { gradeLesson } from '../app/lib/grade-lesson'

interface Case {
  name: string
  lesson: string
  alreadyMet: number[]
  transcript: [role: 'user' | 'assistant', content: string][]
  expect: number[]
}

const CASES: Case[] = [
  {
    name: 'L1 disengaged — nothing met',
    lesson: '1',
    alreadyMet: [],
    transcript: [
      ['assistant', `What do you think AI actually is, in your own words?`],
      ['user', `idk`],
      ['assistant', `No wrong answers here. What have you heard about it?`],
      ['user', `nothing really`],
      ['assistant', `Fair. Have you ever typed a question into one?`],
      ['user', `no`],
    ],
    expect: [],
  },
  {
    name: 'L1 clearly met — tool + input quality + insight',
    lesson: '1',
    alreadyMet: [],
    transcript: [
      ['assistant', `What do you think AI actually is, in your own words?`],
      [
        'user',
        `I thought it was basically a smarter Google that just knows things.`,
      ],
      [
        'assistant',
        `Close, but there's a real difference. Google finds pages someone already wrote. What do you think an AI is doing instead?`,
      ],
      [
        'user',
        `Oh — so it's not looking anything up, it's actually writing a response to what I asked it. So it's more like a tool I'm giving instructions to than a place I'm searching.`,
      ],
      [
        'assistant',
        `Exactly. So what follows from that about the instructions you give it?`,
      ],
      [
        'user',
        `That's the part that just clicked for me. If it's responding to my instructions then a vague instruction gets me a vague answer. When I asked it to "write something about my job" I got garbage back and I blamed the AI, but the problem was I gave it almost nothing to work with. That's genuinely not how I was thinking about it an hour ago.`,
      ],
    ],
    expect: [1, 2, 3],
  },
  {
    name: 'L1 partial — tool understood, input quality not yet',
    lesson: '1',
    alreadyMet: [],
    transcript: [
      ['assistant', `What do you think AI actually is, in your own words?`],
      [
        'user',
        `Some kind of program that answers questions. Not a person, not magic — it's software responding to what you type at it.`,
      ],
      ['assistant', `Right. And what decides how good that response is?`],
      ['user', `Probably how good the AI is? Some are better than others.`],
    ],
    expect: [1],
  },
  {
    name: 'L1 respects alreadyMet — never re-reports goal 1',
    lesson: '1',
    alreadyMet: [1],
    transcript: [
      ['assistant', `What do you think AI actually is?`],
      [
        'user',
        `Software responding to instructions, not a search engine. And I now get that what I put in decides what I get out — my vague requests were the actual problem.`,
      ],
    ],
    expect: [2],
  },
  {
    name: 'L1 teacher asserts, student never does — not met',
    lesson: '1',
    alreadyMet: [],
    transcript: [
      [
        'assistant',
        `AI is a tool that responds to instructions — not magic, not a search engine. And the quality of your instructions determines the quality of what you get back. Does that make sense?`,
      ],
      ['user', `yeah sure`],
    ],
    expect: [],
  },
  {
    name: 'L3 committed to one tool',
    lesson: '3',
    alreadyMet: [],
    transcript: [
      ['assistant', `What do you actually do for work, and what have you tried?`],
      [
        'user',
        `I'm a bookkeeper for about a dozen small businesses. I've poked at ChatGPT's free version a couple times for writing emails, nothing serious.`,
      ],
      [
        'assistant',
        `Given you're already in ChatGPT and your work is repetitive document handling, stick with ChatGPT rather than switching — the paid tier adds file uploads, which matters for you because you can hand it a statement directly.`,
      ],
      [
        'user',
        `That's my tool then. ChatGPT. I'll stay on free for now and upgrade when I need the file uploads — I can just log in with the account I already have.`,
      ],
    ],
    expect: [1, 2, 3, 4],
  },
]

// Wrapped in an async IIFE rather than using top-level await: this package
// has no "type": "module", so .ts files run as CommonJS under tsx, which
// does not support top-level await.
async function main() {
  let failed = 0

  for (const c of CASES) {
    const messages = c.transcript.map(([role, content]) => ({ role, content }))
    const got = await gradeLesson(messages, c.lesson, c.alreadyMet)
    const sorted = [...got].sort((a, b) => a - b)
    const want = [...c.expect].sort((a, b) => a - b)
    const ok = JSON.stringify(sorted) === JSON.stringify(want)
    if (!ok) failed++
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${c.name}\n      want [${want}]  got [${sorted}]`
    )
  }

  console.log(`\n${CASES.length - failed}/${CASES.length} passed`)
  if (failed > 0) process.exit(1)
}

main()
