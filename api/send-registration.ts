import type { VercelRequest, VercelResponse } from '@vercel/node';
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

type RegistrationAction = 'request' | 'decision';
type DecisionStatus = 'approved' | 'rejected';

interface BasePayload {
  name?: string;
  email?: string;
  role?: string;
  comment?: string;
}

interface RequestPayload extends BasePayload {
  action: 'request';
}

interface DecisionPayload extends BasePayload {
  action: 'decision';
  status?: DecisionStatus;
}

type Payload = RequestPayload | DecisionPayload;

const ADMIN_EMAIL = 'caldv@docdenisenko.ru';

const responseError = (res: VercelResponse, status: number, message: string) =>
  res.status(status).json({ error: message });

const assertPost = (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    responseError(res, 405, 'Метод не поддерживается');
    return false;
  }
  return true;
};

const parsePayload = (req: VercelRequest): Payload | null => {
  const body = (req.body ?? {}) as Partial<Payload>;
  const action = (body.action ?? 'request') as RegistrationAction;
  if (action === 'request') {
    return {
      action,
      name: typeof body.name === 'string' ? body.name : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      role: typeof body.role === 'string' ? body.role : undefined,
      comment: typeof body.comment === 'string' ? body.comment : undefined,
    };
  }
  return {
    action,
    status: body.status === 'approved' || body.status === 'rejected' ? body.status : undefined,
    name: typeof body.name === 'string' ? body.name : undefined,
    email: typeof body.email === 'string' ? body.email : undefined,
    role: typeof body.role === 'string' ? body.role : undefined,
    comment: typeof body.comment === 'string' ? body.comment : undefined,
  };
};

const validateEmail = (value?: string) =>
  !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildLink = (origin: string, path: string, params: Record<string, string | undefined>) => {
  const url = new URL(path, origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const sendRegistrationRequest = async (payload: RequestPayload, origin: string) => {
  if (!validateEmail(payload.email) || !payload.name || !payload.role) {
    throw new Error('Не заполнены обязательные поля');
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const safeName = escapeHtml(payload.name.trim());
  const safeRole = escapeHtml(payload.role.trim());
  const safeComment = payload.comment ? escapeHtml(payload.comment.trim()) : null;

  const approveLink = buildLink(origin, '/approve', {
    email: normalizedEmail,
    name: payload.name,
    role: payload.role,
    comment: payload.comment,
  });

  const rejectLink = buildLink(origin, '/reject', {
    email: normalizedEmail,
    name: payload.name,
    role: payload.role,
    comment: payload.comment,
  });

  await transporter.sendMail({
    from: '"Клиника Денисенко" <caldv@docdenisenko.ru>',
    to: ADMIN_EMAIL,
    subject: 'Новая заявка на доступ к порталу',
    html: `
      <h2>Новая заявка на регистрацию</h2>
      <p><strong>Имя:</strong> ${safeName}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(normalizedEmail)}</p>
      <p><strong>Роль:</strong> ${safeRole}</p>
      ${safeComment ? `<p><strong>Комментарий:</strong> ${safeComment}</p>` : ''}
      <p>
        <a href="${approveLink}" style="background:#22c55e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;margin-right:8px;">
          Одобрить заявку
        </a>
        <a href="${rejectLink}" style="background:#ef4444;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
          Отклонить заявку
        </a>
      </p>
    `,
  });

  await transporter.sendMail({
    from: '"Клиника Денисенко" <caldv@docdenisenko.ru>',
    to: normalizedEmail,
    subject: 'Ваша заявка получена',
    html: `
      <p>Здравствуйте, ${safeName}!</p>
      <p>Мы получили вашу заявку на доступ к порталу сотрудников клиники.</p>
      <p>Администратор свяжется с вами после рассмотрения. Обычно это занимает не более одного рабочего дня.</p>
      <p>Если вы отправляли заявку по ошибке, просто проигнорируйте это письмо.</p>
    `,
  });
};

const sendDecisionNotification = async (payload: DecisionPayload) => {
  if (!validateEmail(payload.email) || !payload.status) {
    throw new Error('Некорректные данные для уведомления');
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const safeName = payload.name ? escapeHtml(payload.name.trim()) : 'коллега';
  const roleLabel = payload.role ? escapeHtml(payload.role.trim()) : undefined;
  const decisionComment = payload.comment ? escapeHtml(payload.comment.trim()) : null;

  if (payload.status === 'approved') {
    await transporter.sendMail({
      from: '"Клиника Денисенко" <caldv@docdenisenko.ru>',
      to: normalizedEmail,
      subject: 'Доступ к порталу одобрен',
      html: `
        <p>Здравствуйте, ${safeName}!</p>
        <p>Ваша заявка на доступ к порталу сотрудников клиники одобрена${roleLabel ? `, вам назначена роль <strong>${roleLabel}</strong>` : ''}.</p>
        <p>Для первого входа перейдите на <a href="https://docdenisenko.ru/">портал клиники</a>, используйте вашу почту и задайте новый пароль. Портал предложит установить пароль при первом входе.</p>
        <p>Если у вас возникнут вопросы, свяжитесь с администратором клиники.</p>
      `,
    });
    return;
  }

  await transporter.sendMail({
    from: '"Клиника Денисенко" <caldv@docdenisenko.ru>',
    to: normalizedEmail,
    subject: 'Заявка на доступ отклонена',
    html: `
      <p>Здравствуйте, ${safeName}.</p>
      <p>К сожалению, ваша заявка на доступ к порталу сотрудников была отклонена. Если вы считаете это решением ошибочным, пожалуйста, свяжитесь с администратором клиники.</p>
      ${decisionComment ? `<p><strong>Комментарий администратора:</strong> ${decisionComment}</p>` : ''}
    `,
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!assertPost(req, res)) {
    return;
  }

  try {
    const payload = parsePayload(req);
    if (!payload) {
      responseError(res, 400, 'Некорректный запрос');
      return;
    }

    if (payload.action === 'request') {
      const origin = `${req.headers['x-forwarded-proto'] ?? 'https'}://${req.headers['x-forwarded-host'] ?? req.headers.host}`;
      await sendRegistrationRequest(payload, origin);
      res.status(200).json({ ok: true });
      return;
    }

    await sendDecisionNotification(payload);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[send-registration] error', error);
    responseError(res, 500, 'Не удалось отправить письмо');
  }
}
