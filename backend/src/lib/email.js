import nodemailer from 'nodemailer'

function createTransporter() {
  // Se não houver SMTP configurado, usa console (dev)
  if (!process.env.SMTP_USER) {
    return nodemailer.createTransport({ jsonTransport: true })
  }
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const transporter = createTransporter()

export async function sendMagicLink(email, token) {
  const url = `${process.env.APP_URL}/auth/verify?token=${token}`

  if (!process.env.SMTP_USER) {
    console.log('\n─────────────────────────────────────────')
    console.log('📧 MAGIC LINK (dev — não é enviado email):')
    console.log(`   ${url}`)
    console.log('─────────────────────────────────────────\n')
    return url   // devolver o URL para incluir na resposta da API
  }

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: '🔗 O teu link de acesso — Fitness Challenge',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Entra no Fitness Challenge</h2>
        <p>Clica no botão abaixo para entrares. O link expira em ${process.env.MAGIC_LINK_EXPIRES_MINUTES} minutos.</p>
        <a href="${url}" style="display:inline-block;background:#4ade80;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
          Entrar agora
        </a>
        <p style="color:#888;font-size:12px">Se não pediste este link, ignora este email.</p>
      </div>
    `,
  })
}
