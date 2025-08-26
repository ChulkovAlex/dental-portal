import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.reg.ru',
  port: 587,
  secure: false,
  auth: {
    user: 'caldv@docdenisenko.ru',
    pass: 'lW0zS7jM0pmX1sG4',
  },
});

export const sendMail = async (to: string, subject: string, html: string) =>
  transporter.sendMail({
    from: '"Клиника Денисенко" <caldv@docdenisenko.ru>',
    to,
    subject,
    html,
  });