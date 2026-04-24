import { SignJWT } from 'jose'
import { redirect } from 'next/navigation'

export default async function PreviewPage() {
  const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET!)
  const token = await new SignJWT({
    email: 'preview@buildyouroperator.com',
    tier: 'recruit',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)

  redirect(`/recruit/1?token=${encodeURIComponent(token)}`)
}
