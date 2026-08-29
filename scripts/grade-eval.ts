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
        `That's my tool then. ChatGPT — makes sense since I'm already in it and the file uploads will matter for handing it statements. I'll stay on free for now and upgrade when I need that — I can just log in with the account I already have.`,
      ],
    ],
    expect: [1, 2, 3, 4],
  },
  {
    // Live acceptance run 2026-08-28: recommendation made by the teacher, the
    // student committed but never said why the tool fits them. Goal 2 waits
    // for the student's own echo of the reason.
    name: 'L3 committed but never echoed why the tool fits',
    lesson: '3',
    alreadyMet: [1, 3, 4],
    transcript: [
      [
        'assistant',
        `Here's my call: Claude. You write careful, work-order-style prompts, and Claude follows detailed instructions well. There's a free tier with usage limits — start there.`,
      ],
      [
        'user',
        `Claude it is then, one tool, done deciding. Just made an account at claude.ai with my business email. It's open in the other tab.`,
      ],
    ],
    expect: [],
  },
  {
    name: 'L3 student echoes why the recommended tool fits',
    lesson: '3',
    alreadyMet: [1, 3, 4],
    transcript: [
      [
        'assistant',
        `Here's my call: Claude. You write careful, work-order-style prompts, and Claude follows detailed instructions well.`,
      ],
      [
        'user',
        `Claude it is. Your pick made sense — I write detailed work-order-style briefs and it follows those better than the others. Done deciding.`,
      ],
    ],
    expect: [2],
  },
  // ——— Regression net for the over-credit patterns observed live 2026-08-28 ———
  {
    // Goal 1 (input controls output) is implied here but never stated — strict
    // grading holds it for a later turn, which is the designed behavior. The
    // must-not-tick assertions are goals 3 (analogy is not the rewrite) and 4
    // ("prompt" hasn't appeared).
    name: 'L2 described a strong instruction but rewrote nothing, no term yet',
    lesson: '2',
    alreadyMet: [],
    transcript: [
      ['assistant', `You got junk back from that request. What was missing from it?`],
      [
        'user',
        `Everything, really. Who the client is, what stage we're at, my tone. A weak instruction is "write an email to a client." A strong one would spell out the situation and the voice — like the difference between telling a second shooter "take photos" versus "get candids of the family table during dinner, warm light, no flash."`,
      ],
    ],
    expect: [2],
  },
  {
    name: 'L2 rewrite present and term earned',
    lesson: '2',
    alreadyMet: [1, 2],
    transcript: [
      [
        'assistant',
        `Take that original request — "write an email to a client" — and rewrite it the way you'd actually want to send it.`,
      ],
      [
        'user',
        `Here's my rewrite: "Write a warm, casual email to Kayla and Ben, whose wedding I shot three weeks ago. Their full gallery is ready two weeks early. I want them excited to click the link. Sign off as Malia, sound like a friend not a company." Is that what people mean when they say prompt?`,
      ],
      [
        'assistant',
        `That's exactly what a prompt is. And yours is a good one — the who, the tone, the goal, all in one place.`,
      ],
      [
        'user',
        `Okay. So a prompt is just the technical name for a well-briefed instruction. I've been writing bad prompts and blaming the tool.`,
      ],
    ],
    expect: [3, 4],
  },
  {
    name: 'L4 one prompt built — the 2+ goal must not tick',
    lesson: '4',
    alreadyMet: [],
    transcript: [
      ['assistant', `What's the task you do most often that you wish someone else could handle?`],
      [
        'user',
        `Pricing inquiry replies. I'm a wedding photographer — 5 to 10 DMs a week asking rates, each answered from scratch. Some are budget couples, some are luxury planners.`,
      ],
      ['assistant', `Draft the prompt the way you'd brief an assistant to handle those.`],
      [
        'user',
        `"You draft replies to pricing inquiries for a Honolulu wedding photographer. Starting rate $3,800 with 8 hours and two shooters. If sender is a planner: professional, lead with packages. If a couple: warm, mention rate gently. Never corporate." Then I paste the DM in.`,
      ],
      [
        'assistant',
        `That works. One refinement: give it your actual sign-off and one phrase that's distinctly yours, so the replies sound like you and not a generic photographer.`,
      ],
      [
        'user',
        `Good call — added "sign off Aloha, Malia" and my "your gallery is having its moment" line to it. I could probably make one for Instagram captions too at some point.`,
      ],
    ],
    expect: [1, 2],
  },
  {
    name: 'L4 placeholders for client data — privacy goal',
    lesson: '4',
    alreadyMet: [1, 2, 3, 4],
    transcript: [
      [
        'assistant',
        `One more thing before you take these to your tool — notice your pricing prompt works whether or not the AI ever sees a client's real name. What would you leave out or swap when you use it for real?`,
      ],
      [
        'user',
        `Yeah, I see it. I'd swap the couple's actual names for something like "the couple" or initials, and I'd never paste their contract, their address, or anything about their budget conversations. If I wouldn't post it on my public Instagram, it doesn't go in the chat. The reply reads the same either way — I just put the real names back in before I hit send.`,
      ],
    ],
    expect: [5],
  },
  {
    name: `L5 ran it but "it was perfect" — check goal must not tick`,
    lesson: '5',
    alreadyMet: [1, 2, 3],
    transcript: [
      ['assistant', `Go run it in your tool and come back with what you got.`],
      [
        'user',
        `Just ran it. Honestly it was perfect, all three pieces came out great. Nothing I'd change.`,
      ],
    ],
    expect: [4],
  },
  {
    name: 'L5 ran it and named the flaw and fixed it',
    lesson: '5',
    alreadyMet: [1, 2, 3],
    transcript: [
      ['assistant', `Go run it in your tool and come back with what you got.`],
      [
        'user',
        `Ran it in ChatGPT. The delivery email and caption were nearly right — changed four words. But the review-ask email was stiff and way too long, so I added "super short, two sentences max" to that output's instructions and the redo nailed it. Next wedding I just swap in the new couple's moments — same prompt forever, twenty minutes instead of an evening.`,
      ],
    ],
    expect: [4, 5, 6],
  },
  {
    name: 'L6 reflection only — build goal and judgment goal must not tick',
    lesson: '6',
    alreadyMet: [],
    transcript: [
      ['assistant', `What's changed for you since Lesson 1? What can you do now that you couldn't before?`],
      [
        'user',
        `I walked in thinking AI was a plagiarism machine. What changed is I stopped treating it like a vending machine and started treating it like an assistant I have to brief. I built a pricing prompt and a gallery workflow that saved me a whole evening this week.`,
      ],
    ],
    expect: [1],
  },
  {
    name: 'L6 confidently-wrong explained with own check-list',
    lesson: '6',
    alreadyMet: [1, 2, 3],
    transcript: [
      [
        'assistant',
        `One last thing you need to own before you go: what do you know now about trusting what AI hands you?`,
      ],
      [
        'user',
        `That it lies with a straight face. Not on purpose — it just fills in gaps and sounds completely sure while doing it. It once gave me a "typical Oahu vendor price" that was pure fiction. So my rule now: any name, number, date, or claim in something it drafts for me gets checked by me before a client ever sees it. The voice edits I was already doing — this is the same pass, but for facts. My name's on the email, not the AI's.`,
      ],
    ],
    expect: [4],
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
