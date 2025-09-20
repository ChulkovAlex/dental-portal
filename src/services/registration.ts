import type { UserRole } from './authDb';

export interface RegistrationRequestPayload {
  name: string;
  email: string;
  role: UserRole;
  comment?: string;
}

export interface RegistrationDecisionPayload {
  name?: string;
  email: string;
  role?: UserRole;
  status: 'approved' | 'rejected';
  comment?: string;
}

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const handleResponse = async (response: Response) => {
  if (response.ok) {
    return response.json().catch(() => ({ ok: true }));
  }

  let message = 'Не удалось связаться с сервером. Попробуйте позже.';
  try {
    const data = await response.json();
    if (typeof data?.error === 'string' && data.error.trim().length > 0) {
      message = data.error;
    }
  } catch (error) {
    // ignore JSON parse error
  }
  throw new Error(message);
};

export const submitRegistrationRequest = async (payload: RegistrationRequestPayload) => {
  const response = await fetch('/api/send-registration', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      action: 'request',
      ...payload,
    }),
  });
  return handleResponse(response);
};

export const notifyRegistrationDecision = async (payload: RegistrationDecisionPayload) => {
  const response = await fetch('/api/send-registration', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      action: 'decision',
      ...payload,
    }),
  });
  return handleResponse(response);
};
