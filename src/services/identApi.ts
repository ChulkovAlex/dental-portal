import type { IdentIntegrationSettings } from './integrationModule';

export type IdentConnectionResource = 'doctors' | 'branches' | 'schedule' | 'leads' | 'calls';

export interface IdentConnectionConfig {
  host: string;
  port?: string | number;
  username: string;
  password: string;
}

export interface IdentPreviewResult {
  counts: Partial<Record<IdentConnectionResource, number | null>>;
  errors: Partial<Record<IdentConnectionResource, string>>;
}

const DEFAULT_ENDPOINTS: Record<IdentConnectionResource, string> = {
  doctors: '/api/doctors',
  branches: '/api/branches',
  schedule: '/api/schedule',
  leads: '/api/leads',
  calls: '/api/calls',
};

const ensureLeadingSlash = (path: string): string => {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }
  return path;
};

const encodeBasicAuth = (username: string, password: string) => {
  const raw = `${username}:${password}`;

  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    try {
      return window.btoa(unescape(encodeURIComponent(raw)));
    } catch (error) {
      console.error('Не удалось выполнить base64-encoding через window.btoa', error);
    }
  }

  if (typeof globalThis !== 'undefined') {
    const maybeBuffer = (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer;
    if (maybeBuffer) {
      return maybeBuffer.from(raw, 'utf-8').toString('base64');
    }
  }

  throw new Error('В окружении недоступны инструменты для base64-encoding.');
};

export const createIdentConnectionConfig = (
  settings: Pick<IdentIntegrationSettings, 'host' | 'port' | 'username' | 'password'>,
): IdentConnectionConfig => ({
  host: settings.host,
  port: settings.port,
  username: settings.username,
  password: settings.password,
});

const buildBaseUrl = ({ host, port }: IdentConnectionConfig) => {
  const trimmedHost = host.trim();
  const sanitizedHost = trimmedHost.replace(/^https?:\/\//i, '');
  const trimmedPort = typeof port === 'number' ? String(Math.trunc(port)) : port?.trim?.();
  const sanitizedPort = trimmedPort ? trimmedPort.replace(/^:/, '') : undefined;
  if (!sanitizedHost) {
    throw new Error('Не указан адрес сервера интеграции.');
  }

  if (sanitizedPort) {
    return `http://${sanitizedHost}:${sanitizedPort}`;
  }

  return `http://${sanitizedHost}`;
};

export async function callIdentApi<T>(
  config: IdentConnectionConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const baseUrl = buildBaseUrl(config);
  const url = new URL(ensureLeadingSlash(path), baseUrl);

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Basic ${encodeBasicAuth(config.username, config.password)}`);
  headers.set('Accept', 'application/json');

  const response = await fetch(url.toString(), {
    ...init,
    headers,
    credentials: 'omit',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `iDent API вернул ошибку ${response.status}. ${text ? `Ответ сервера: ${text}` : 'Тело ответа пустое.'}`,
    );
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  // Попытка разобрать даже без корректного заголовка
  const fallback = await response.text();
  try {
    return JSON.parse(fallback) as T;
  } catch (error) {
    throw new Error('Сервер вернул данные в неизвестном формате.');
  }
}

const normalizeCount = (data: unknown): number | null => {
  if (Array.isArray(data)) {
    return data.length;
  }

  if (data && typeof data === 'object' && 'items' in (data as Record<string, unknown>)) {
    const maybeItems = (data as Record<string, unknown>).items;
    if (Array.isArray(maybeItems)) {
      return maybeItems.length;
    }
  }

  if (data === null || data === undefined) {
    return 0;
  }

  return 1;
};

export async function fetchIdentPreview(
  config: IdentConnectionConfig,
  endpoints: Partial<Record<IdentConnectionResource, string>> = {},
): Promise<IdentPreviewResult> {
  const counts: IdentPreviewResult['counts'] = {};
  const errors: IdentPreviewResult['errors'] = {};

  await Promise.all(
    (Object.entries({ ...DEFAULT_ENDPOINTS, ...endpoints }) as Array<[
      IdentConnectionResource,
      string,
    ]>).map(async ([resource, path]) => {
      try {
        const data = await callIdentApi<unknown>(config, path);
        counts[resource] = normalizeCount(data);
      } catch (error) {
        console.error(`Ошибка загрузки ресурса ${resource} из iDent`, error);
        errors[resource] =
          error instanceof Error ? error.message : 'Неизвестная ошибка при обращении к API iDent';
      }
    }),
  );

  return { counts, errors };
}
