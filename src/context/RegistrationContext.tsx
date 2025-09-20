import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type RegistrationRole = 'reception' | 'doctor' | 'assistant' | 'admin';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface RegistrationRequest {
  id: string;
  email: string;
  fullName: string;
  role: RegistrationRole;
  note?: string;
  status: RegistrationStatus;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  decisionNote?: string;
  assignedUserId?: number;
}

interface RegistrationContextValue {
  requests: RegistrationRequest[];
  pendingRequests: RegistrationRequest[];
  approvedRequests: RegistrationRequest[];
  rejectedRequests: RegistrationRequest[];
  createRequest: (payload: RegistrationPayload) => RegistrationRequest;
  updateRequestStatus: (
    id: string,
    status: RegistrationStatus,
    options?: {
      processedBy?: string;
      note?: string;
      assignedUserId?: number;
    },
  ) => RegistrationRequest | undefined;
  getRequestById: (id: string) => RegistrationRequest | undefined;
}

export interface RegistrationPayload {
  email: string;
  fullName: string;
  role: RegistrationRole;
  note?: string;
}

const RegistrationContext = createContext<RegistrationContextValue | undefined>(undefined);

const STORAGE_KEY = 'dental-portal-registration-requests';

const loadRequests = (): RegistrationRequest[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RegistrationRequest[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        ...item,
        createdAt: item.createdAt,
        processedAt: item.processedAt,
      }))
      .filter((item) => typeof item.email === 'string' && typeof item.fullName === 'string');
  } catch (error) {
    console.error('Не удалось загрузить заявки на регистрацию', error);
    return [];
  }
};

const persistRequests = (requests: RegistrationRequest[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (error) {
    console.error('Не удалось сохранить заявки на регистрацию', error);
  }
};

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

export const RegistrationProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [requests, setRequests] = useState<RegistrationRequest[]>(() => loadRequests());

  useEffect(() => {
    persistRequests(requests);
  }, [requests]);

  const createRequest = useCallback(
    (payload: RegistrationPayload) => {
      const normalizedEmail = payload.email.trim().toLowerCase();

      if (
        requests.some(
          (request) => request.email.toLowerCase() === normalizedEmail && request.status === 'pending',
        )
      ) {
        throw new Error('Заявка с таким e-mail уже ожидает рассмотрения.');
      }

      const request: RegistrationRequest = {
        id: createRequestId(),
        email: normalizedEmail,
        fullName: payload.fullName.trim(),
        role: payload.role,
        note: payload.note?.trim() ? payload.note.trim() : undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setRequests((prev) => [...prev, request]);
      return request;
    },
    [requests],
  );

  const updateRequestStatus = useCallback(
    (
      id: string,
      status: RegistrationStatus,
      options?: { processedBy?: string; note?: string; assignedUserId?: number },
    ) => {
      let updatedRequest: RegistrationRequest | undefined;

      setRequests((prev) =>
        prev.map((request) => {
          if (request.id !== id) {
            return request;
          }

          const next: RegistrationRequest = {
            ...request,
            status,
            processedBy: options?.processedBy ?? request.processedBy,
            decisionNote: options?.note?.trim() ? options.note.trim() : undefined,
            assignedUserId: options?.assignedUserId ?? request.assignedUserId,
          };

          if (status === 'pending') {
            next.processedAt = undefined;
            next.processedBy = undefined;
            next.decisionNote = undefined;
            next.assignedUserId = undefined;
          } else {
            next.processedAt = new Date().toISOString();
          }

          updatedRequest = next;
          return next;
        }),
      );

      return updatedRequest;
    },
    [],
  );

  const getRequestById = useCallback(
    (id: string) => requests.find((request) => request.id === id),
    [requests],
  );

  const value = useMemo(
    () => {
      const pendingRequests = requests.filter((request) => request.status === 'pending');
      const approvedRequests = requests.filter((request) => request.status === 'approved');
      const rejectedRequests = requests.filter((request) => request.status === 'rejected');

      return {
        requests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        createRequest,
        updateRequestStatus,
        getRequestById,
      } satisfies RegistrationContextValue;
    },
    [createRequest, getRequestById, requests, updateRequestStatus],
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
};

export const useRegistration = (): RegistrationContextValue => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration должен использоваться внутри RegistrationProvider');
  }
  return context;
};
