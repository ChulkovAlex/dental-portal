import { sendMail } from './email';

export async function sendRegistrationRequest(
  userData: { email: string; name: string; role: string }
) {
  const { email, name, role } = userData;
  const approveLink = `${window.location.origin}/approve?email=${encodeURIComponent(email)}`;
  const rejectLink = `${window.location.origin}/reject?email=${encodeURIComponent(email)}`;

  await sendMail(
    'caldv@docdenisenko.ru',
    'Новая заявка на регистрацию',
    `
      <h3>Заявка на регистрацию</h3>
      <p><strong>Имя:</strong> ${name}</p>
      <p><strong>E-mail:</strong> ${email}</p>
      <p><strong>Роль:</strong> ${role}</p>
      <p>
        <a href="${approveLink}" style="background:#22c55e;color:#fff;padding:8px 12px;border-radius:4px;margin-right:8px;">Одобрить</a>
        <a href="${rejectLink}"  style="background:#ef4444;color:#fff;padding:8px 12px;border-radius:4px;">Отклонить</a>
      </p>
    `
  );
  await sendMail(email, 'Заявка отправлена', `<p>Ваша заявка на регистрацию принята. Администратор скоро рассмотрит её.</p>`);
}