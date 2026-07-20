'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Path-style deep link so React Native treats reset-password as path, not host */
const APP_DEEP_LINK_BASE = 'surrogateagency:///reset-password';

function collectParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params: Record<string, string> = {};
  const collect = (raw: string) => {
    raw.replace(/^[?#]/, '').split('&').forEach((pair) => {
      if (!pair) return;
      const eq = pair.indexOf('=');
      const k = eq >= 0 ? pair.slice(0, eq) : pair;
      const v = eq >= 0 ? pair.slice(eq + 1) : '';
      if (!k) return;
      try {
        params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
      } catch {
        params[k] = v;
      }
    });
  };
  collect(window.location.search);
  if (window.location.hash) collect(window.location.hash);
  return params;
}

function buildAppDeepLink(params: Record<string, string>): string {
  const qs = new URLSearchParams();
  if (params.code) qs.set('code', params.code);
  if (params.access_token) qs.set('access_token', params.access_token);
  if (params.refresh_token) qs.set('refresh_token', params.refresh_token);
  qs.set('type', params.type || 'recovery');
  const query = qs.toString();
  return `${APP_DEEP_LINK_BASE}?${query}`;
}

function getBrowserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  });
}

type Phase = 'loading' | 'form' | 'success' | 'need_app' | 'error';

export default function ResetPasswordBridgePage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deepLink, setDeepLink] = useState(APP_DEEP_LINK_BASE);
  const [client] = useState(() => getBrowserSupabase());

  const canSubmit = useMemo(
    () => password.length >= 6 && password === confirm && !submitting,
    [password, confirm, submitting]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = collectParams();
      setDeepLink(buildAppDeepLink(params));

      const hasTokens = !!(params.access_token && params.refresh_token);
      const hasCode = !!params.code;

      if (!hasTokens && !hasCode) {
        if (!cancelled) {
          setPhase('error');
          setErrorMsg('链接无效或已过期。请回到 App 登录页重新发送重置邮件。');
        }
        return;
      }

      if (!client) {
        if (!cancelled) setPhase('need_app');
        return;
      }

      try {
        if (hasTokens) {
          const { error } = await client.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
          if (!cancelled) setPhase('form');
          // Clean tokens from address bar after session is set
          window.history.replaceState({}, '', '/reset-password');
          return;
        }

        // PKCE code from the mobile app usually cannot be exchanged in the browser
        // (code_verifier lives on the phone). Try once, then fall back to Open App.
        const { error } = await client.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
        if (!cancelled) setPhase('form');
        window.history.replaceState({}, '', '/reset-password');
      } catch (e: unknown) {
        console.warn('Web recovery session failed, fall back to app:', e);
        if (!cancelled) setPhase('need_app');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    if (password.length < 6) {
      setErrorMsg('密码至少 6 位 / Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('两次输入的密码不一致 / Passwords do not match');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setPhase('success');
      await client.auth.signOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '更新失败，请重试';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F4F7FB] flex flex-col">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <p className="text-sm font-semibold text-[#2A7BF6]">Surrogate Agency USA</p>
        <p className="text-xs text-slate-500 mt-0.5">MySurro</p>
      </header>

      <main className="flex-1 flex flex-col justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-[0_12px_40px_rgba(15,23,42,0.08)] px-6 py-8">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F1FF] flex items-center justify-center mb-5">
            <span className="text-2xl" aria-hidden>
              🔐
            </span>
          </div>

          <h1 className="text-[1.75rem] leading-tight font-extrabold text-slate-900 tracking-tight">
            重置密码
          </h1>
          <p className="mt-1 text-base font-medium text-slate-500">Reset Password</p>

          {phase === 'loading' && (
            <p className="mt-6 text-[15px] leading-6 text-slate-700">正在验证链接，请稍候…</p>
          )}

          {phase === 'error' && (
            <p className="mt-6 text-[15px] leading-6 text-red-600">{errorMsg}</p>
          )}

          {phase === 'success' && (
            <div className="mt-6 space-y-4">
              <p className="text-[15px] leading-6 text-slate-700">
                密码已更新成功。请打开 App，用新密码登录。
              </p>
              <p className="text-sm text-slate-500">
                Password updated. Open the app and sign in with your new password.
              </p>
              <a
                href={APP_DEEP_LINK_BASE}
                className="mt-2 flex w-full min-h-[56px] items-center justify-center rounded-2xl bg-[#2A7BF6] px-4 text-[17px] font-bold text-white"
              >
                打开 App
              </a>
            </div>
          )}

          {phase === 'need_app' && (
            <div className="mt-6 space-y-4">
              <p className="text-[15px] leading-6 text-slate-700">
                请点击下方按钮，在 App 里完成新密码设置。
              </p>
              <p className="text-sm text-slate-500">
                Tap below to finish resetting your password in the app.
              </p>
              <a
                href={deepLink}
                className="flex w-full min-h-[56px] items-center justify-center rounded-2xl bg-[#2A7BF6] px-4 text-[17px] font-bold text-white shadow-[0_10px_24px_rgba(42,123,246,0.35)]"
              >
                打开 App 设置新密码
              </a>
              <p className="text-xs leading-5 text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                若 App 打开后没有重置页：请完全关闭 App 再点一次，或更新到最新版本后再试。也可重新点一次「Forgot Password?」发新邮件。
              </p>
            </div>
          )}

          {phase === 'form' && (
            <form className="mt-6 space-y-4" onSubmit={handleUpdatePassword}>
              <p className="text-[15px] leading-6 text-slate-700">
                请设置新密码（至少 6 位）。
              </p>

              <label className="block text-left">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  New Password
                </span>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-base text-slate-900 outline-none focus:border-[#2A7BF6]"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label className="block text-left">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Confirm Password
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-base text-slate-900 outline-none focus:border-[#2A7BF6]"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </label>

              {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full min-h-[56px] items-center justify-center rounded-2xl bg-[#2A7BF6] px-4 text-[17px] font-bold text-white disabled:bg-slate-300 shadow-[0_10px_24px_rgba(42,123,246,0.35)] disabled:shadow-none"
              >
                {submitting ? '更新中…' : '确认更新密码'}
              </button>

              <a href={deepLink} className="block text-center text-sm font-semibold text-[#2A7BF6] pt-1">
                或在 App 中设置 / Or set in the app
              </a>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">mysurro.com</p>
      </main>
    </div>
  );
}
