import type { AuthChangeEvent, Session } from '@supabase/auth-js';
import { vi } from 'vitest';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const listeners = new Set<Listener>();
let currentSession: Session | null = null;

/** A session as Supabase returns it; only the fields the app reads are meaningful. */
export function fakeSession(email = 'camila@ejemplo.com'): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-10-09T12:00:00Z',
    },
  };
}

interface AuthResult {
  data: object;
  error: unknown;
}

const ok: AuthResult = { data: {}, error: null };

/**
 * Stand-in for the Supabase client in unit tests: `vi.mock('…/lib/supabase', async () => ({ supabase:
 * (await import('…/test/supabaseMock')).supabaseMock }))`. Each test sets the answers it needs.
 */
export const supabaseMock = {
  rpc: vi.fn(),
  auth: {
    onAuthStateChange: vi.fn((listener: Listener) => {
      listeners.add(listener);
      queueMicrotask(() => {
        listener('INITIAL_SESSION', currentSession);
      });
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(listener);
            },
          },
        },
      };
    }),
    signUp: vi.fn(() => Promise.resolve(ok)),
    signInWithPassword: vi.fn(() => Promise.resolve(ok)),
    signInWithOAuth: vi.fn(() => Promise.resolve(ok)),
    signOut: vi.fn((options?: { scope?: 'global' | 'local' | 'others' }) => {
      // Signing out the other sessions keeps this one.
      if (options?.scope !== 'others') setSession(null, 'SIGNED_OUT');
      return Promise.resolve({ error: null });
    }),
    resetPasswordForEmail: vi.fn(() => Promise.resolve(ok)),
    resend: vi.fn(() => Promise.resolve(ok)),
    updateUser: vi.fn(() => Promise.resolve(ok)),
    verifyOtp: vi.fn(() => Promise.resolve(ok)),
  },
};

/** Changes the signed-in state and tells every listener, as Supabase does. */
export function setSession(session: Session | null, event: AuthChangeEvent = 'SIGNED_IN'): void {
  currentSession = session;
  for (const listener of listeners) listener(event, session);
}

type RpcAnswer =
  { data: unknown; error: unknown } | ((args: unknown) => { data: unknown; error: unknown });

/** Answers each database function by name; anything else fails like a missing function. */
export function answerRpc(answers: Readonly<Record<string, RpcAnswer>>): void {
  supabaseMock.rpc.mockImplementation((name: string, args?: unknown) => {
    const answer = answers[name];
    if (!answer) return Promise.resolve({ data: null, error: new Error(`unexpected rpc ${name}`) });
    return Promise.resolve(typeof answer === 'function' ? answer(args) : answer);
  });
}

/** Back to a signed-out visitor with default answers. Call it in afterEach. */
export function resetSupabaseMock(): void {
  currentSession = null;
  listeners.clear();
  supabaseMock.rpc.mockReset();
  for (const method of Object.values(supabaseMock.auth)) method.mockClear();
}
