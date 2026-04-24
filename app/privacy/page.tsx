import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Operator',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <nav className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto">
        <Link href="/" className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Operator
        </Link>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>by AIGA LLC</span>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--accent)' }}>Legal</p>
        <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
        <p className="text-sm mb-12" style={{ color: 'var(--muted)' }}>Effective date: April 24, 2026 · AIGA LLC</p>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>

          <section>
            <h2 className="text-lg font-semibold mb-3">What we collect</h2>
            <p style={{ color: 'var(--muted)' }}>When you use Operator, we collect:</p>
            <ul className="mt-3 space-y-2" style={{ color: 'var(--muted)' }}>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> Your email address (when you join the waitlist or purchase a tier)</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> Conversation transcripts with Gojo, our AI teacher</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> Lesson progress (which lessons you have started and completed)</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> Payment information, processed and stored by Stripe — we never see or store your card number</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">How we use it</h2>
            <ul className="space-y-2" style={{ color: 'var(--muted)' }}>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> To deliver your access link and course content</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> To resume your lesson where you left off</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> To send re-engagement emails if you go quiet (days 3 and 7 after signup)</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> To process payments and manage your account tier</li>
            </ul>
            <p className="mt-3" style={{ color: 'var(--muted)' }}>We do not sell your data. We do not use your data for advertising.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Third-party services</h2>
            <p className="mb-3" style={{ color: 'var(--muted)' }}>Operator uses the following third-party services to operate:</p>
            <ul className="space-y-2" style={{ color: 'var(--muted)' }}>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> <strong style={{ color: 'var(--foreground)' }}>Stripe</strong> — payment processing. Your payment data is subject to Stripe&apos;s privacy policy.</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> <strong style={{ color: 'var(--foreground)' }}>Resend</strong> — transactional email delivery</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> <strong style={{ color: 'var(--foreground)' }}>Anthropic / Claude</strong> — powers the Gojo AI teacher. Conversation messages are sent to Anthropic&apos;s API. Anthropic&apos;s data usage policy applies.</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> <strong style={{ color: 'var(--foreground)' }}>Supabase</strong> — database and storage for your account and lesson sessions</li>
              <li className="flex gap-2"><span style={{ color: 'var(--accent)' }}>—</span> <strong style={{ color: 'var(--foreground)' }}>Vercel</strong> — hosting and edge delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Conversation data</h2>
            <p style={{ color: 'var(--muted)' }}>
              Your conversations with Gojo are stored so you can resume lessons across sessions. We do not read your conversations for purposes other than operating the course. Conversation data is stored in Supabase and transmitted to Anthropic&apos;s API to generate responses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Data retention</h2>
            <p style={{ color: 'var(--muted)' }}>
              We retain your account data for as long as your account is active. If you request deletion, we will remove your email, lesson progress, and conversation history from our systems within 30 days. Payment records may be retained by Stripe as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Your rights</h2>
            <p style={{ color: 'var(--muted)' }}>
              You may request access to, correction of, or deletion of your personal data at any time. California residents have additional rights under the CCPA. To exercise any of these rights, contact us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Contact</h2>
            <p style={{ color: 'var(--muted)' }}>
              AIGA LLC<br />
              Kapolei, Hawaii<br />
              privacy@buildyouroperator.com
            </p>
          </section>

        </div>
      </article>

      <footer className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between border-t" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Operator</Link>
        <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--muted)' }}>
          <Link href="/terms" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms</Link>
          <Link href="/faq" style={{ color: 'var(--muted)', textDecoration: 'none' }}>FAQ</Link>
          <span>© 2026 AIGA LLC</span>
        </div>
      </footer>
    </main>
  )
}
