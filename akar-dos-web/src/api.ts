/**
 * Typed API client for AKAR DOS. Handles the unified response envelope
 * `{ success, data, meta }` and attaches the JWT access token from localStorage.
 */
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') as string;
const BASE = `${API_URL}/api/v1`;

export const TOKEN_KEY = 'akar_access_token';
export const REFRESH_KEY = 'akar_refresh_token';
export const USER_KEY = 'akar_user';

export interface AuthUser {
  id: string;
  salesTeamId: string;
  name: string;
  role: string;
}

export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface SuccessBody<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}
interface ErrorBody {
  success: false;
  error: { code: string; message: string };
  meta: ApiMeta;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<{ data: T; meta: ApiMeta }> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Unable to reach the server. Check your connection.', 0);
  }

  const body = (await res.json().catch(() => null)) as SuccessBody<T> | ErrorBody | null;

  if (!body) {
    throw new ApiError('INTERNAL_ERROR', 'Unexpected empty response', res.status);
  }
  if (!body.success) {
    if (res.status === 401) {
      clearSession();
    }
    throw new ApiError(body.error.code, body.error.message, res.status);
  }
  return { data: body.data, meta: body.meta };
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function login(userId: string, password: string): Promise<AuthUser> {
  const { data } = await apiFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId, password }),
  });
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_KEY) ?? undefined;
  try {
    await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  } catch {
    // Best-effort; clear locally regardless.
  }
  clearSession();
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function currentUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  dueAt: string | null;
}

export interface MyWork {
  actionRequired: Task[];
  overdue: Task[];
  dueToday: Task[];
  completedToday: Task[];
}

export async function fetchMyWork(): Promise<MyWork> {
  const { data } = await apiFetch<MyWork>('/tasks/my-work');
  return data;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await apiFetch<Notification[]>('/notifications?pageSize=20');
  return data;
}
