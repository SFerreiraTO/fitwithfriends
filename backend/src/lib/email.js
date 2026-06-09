import { Resend } from 'resend'

export async function sendMagicLink(email, token) {
  const url = `${process.env.APP_URL}/auth/verify?token=${token}`

  if (!process.env.RESEND_API_KEY) {
    console.log('\n─────────────────────────────────────────')
    console.log('📧 MAGIC LINK (dev — não é enviado email):')
    console.log(`   ${url}`)
    console.log('─────────────────────────────────────────\n')
    return url
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'FitWithFriends <onboarding@resend.dev>',
    to:      email,
    subject: '🔗 O teu link de acesso — FitWithFriends',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f0f0f;padding:32px;border-radius:12px">
        <h2 style="color:#fff;margin-bottom:8px">💪 FitWithFriends</h2>
        <p style="color:#888;margin-bottom:24px">Clica no botão abaixo para entrares. O link expira em ${process.env.MAGIC_LINK_EXPIRES_MINUTES} minutos.</p>
        <a href="${url}" style="display:inline-block;background:#4ade80;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
          Entrar agora →
        </a>
        <p style="color:#555;font-size:12px;margin-top:24px">Se não pediste este link, ignora este email.</p>
      </div>
    `,
  })
}
