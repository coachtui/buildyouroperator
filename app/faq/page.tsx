import Link from 'next/link'

export const metadata = {
  title: 'FAQ — Operator',
}

const faqs = [
  {
    q: 'What is Operator?',
    a: 'Operator is an AI course taught entirely through conversation. Instead of watching videos, you talk to Gojo — an AI teacher built on Claude — who asks you questions, corrects your thinking, and does not move on until you actually understand. Recruit is the first tier: six conversations that take you from zero to daily AI user.',
  },
  {
    q: 'Do I need any prior experience with AI?',
    a: 'No. Recruit is designed for people who have tried AI a few times and bounced, or who have never used it at all. You do not need any technical background. If you have a browser and a willingness to have a real conversation, you are ready.',
  },
  {
    q: 'How does the free preview work?',
    a: 'Lesson 1 is free — no payment required. Join the waitlist with your email and you will receive your access link immediately. You can complete Lesson 1 at any time. Lessons 2–6 require a Recruit tier purchase.',
  },
  {
    q: 'How long does Recruit take?',
    a: 'Six lessons, each 15–30 minutes depending on the depth of your conversation. Most people complete Recruit over 1–2 weeks. There is no deadline — go at your own pace.',
  },
  {
    q: 'What is the difference between Recruit, Agent, and Operator?',
    a: 'Recruit (Use It): zero to daily AI user. Six conversations that turn a skeptic into someone who opens the tool before anything else.\n\nAgent (Build It): workflows, prompt systems, and repeatable processes you can hand to anyone. Requires Recruit completion. Currently in design — shaped by what Recruit graduates say they needed.\n\nOperator (Run It): running AI at scale across a team or business. Requires Agent completion. Small cohort, 20 seats max.',
  },
  {
    q: 'When are Agent and Operator launching?',
    a: 'Agent is designed after the first Recruit cohort completes. Operator is designed after the first Agent cohort completes. If you purchase now, you will be notified directly when each tier opens. Founding prices are locked at purchase — they will not go up.',
  },
  {
    q: 'Who is Gojo?',
    a: 'Gojo is the AI teacher inside Operator. He is built on Claude (by Anthropic) and trained to teach using a Socratic approach: he asks before he tells, uses your specific situation as the example, and will not move on until you show you understand. He does not lecture. He has a conversation.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'Yes. Operator works on any modern browser, including mobile. The conversation interface is designed to work well on small screens.',
  },
  {
    q: 'Can I share my access with someone else?',
    a: 'No. Access is tied to your account and is for individual use only. If someone else wants to take the course, they can sign up at buildyouroperator.com.',
  },
  {
    q: 'What is the refund policy?',
    a: 'We offer a full refund within 7 days of purchase if you have completed no more than one lesson. After that window, or after completing more than one lesson, purchases are final. Contact support@buildyouroperator.com to request a refund.',
  },
  {
    q: 'What happens to my conversation data?',
    a: 'Your conversations with Gojo are stored so you can resume where you left off. They are not used to train any AI model. We do not sell your data. See our Privacy Policy for full details.',
  },
  {
    q: 'I lost my access link. How do I get it back?',
    a: 'Go to buildyouroperator.com and scroll to the "already signed up?" section at the bottom. Enter your email and we will resend your link immediately.',
  },
]

export default function FAQPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <nav className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto">
        <Link href="/" className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Operator
        </Link>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>by AIGA LLC</span>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--accent)' }}>Support</p>
        <h1 className="text-4xl font-bold mb-3">Frequently Asked Questions</h1>
        <p className="text-sm mb-12" style={{ color: 'var(--muted)' }}>
          Anything missing? Email us at support@buildyouroperator.com.
        </p>

        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b pb-8" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-base font-semibold mb-3">{faq.q}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--muted)' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </article>

      <footer className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between border-t" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Operator</Link>
        <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--muted)' }}>
          <Link href="/privacy" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms</Link>
          <span>© 2026 AIGA LLC</span>
        </div>
      </footer>
    </main>
  )
}
