'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Short deep link only — never put JWTs in the URL (causes iOS/Android crashes). */
const APP_OPEN_LOGIN = 'surrogateagency://login';
const APP_OPEN_RESET = 'surrogateagency://reset-password?type=recovery';

type Lang = 'en' | 'zh' | 'es';

const COPY: Record<
  Lang,
  {
    brand: string;
    title: string;
    loading: string;
    invalidLink: string;
    successTitle: string;
    successBody: string;
    openAppLogin: string;
    needAppBody: string;
    openAppReset: string;
    needAppHint: string;
    formIntro: string;
    newPassword: string;
    confirmPassword: string;
    show: string;
    hide: string;
    submit: string;
    submitting: string;
    errShort: string;
    errMismatch: string;
    afterWebHint: string;
  }
> = {
  en: {
    brand: 'Surrogate Agency USA',
    title: 'Reset Password',
    loading: 'Verifying your link…',
    invalidLink:
      'This link is invalid or has expired. Please request a new reset email from the app login screen.',
    successTitle: 'Password updated',
    successBody: 'Your password has been changed. Open the app and sign in with your new password.',
    openAppLogin: 'Open App to Sign In',
    needAppBody:
      'We could not finish reset in the browser. Please set your new password on this page after requesting a fresh email, or open the app if it shows the reset screen.',
    openAppReset: 'Open App',
    needAppHint:
      'Tip: Prefer resetting on this webpage. Opening the app from here will not pass your secure session (that can crash the app).',
    formIntro: 'Choose a new password (at least 6 characters).',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    show: 'Show',
    hide: 'Hide',
    submit: 'Update Password',
    submitting: 'Updating…',
    errShort: 'Password must be at least 6 characters',
    errMismatch: 'Passwords do not match',
    afterWebHint: 'After updating here, open the app and sign in — no need to reset again in the app.',
  },
  zh: {
    brand: 'Surrogate Agency USA',
    title: '重置密码',
    loading: '正在验证链接…',
    invalidLink: '链接无效或已过期。请回到 App 登录页重新发送重置邮件。',
    successTitle: '密码已更新',
    successBody: '请打开 App，使用新密码登录。',
    openAppLogin: '打开 App 登录',
    needAppBody: '网页无法完成验证。请重新发送重置邮件后在本页设置密码。',
    openAppReset: '打开 App',
    needAppHint: '建议在本网页直接重置。从网页跳进 App 时不会携带安全会话，强行带 token 可能导致闪退。',
    formIntro: '请设置新密码（至少 6 位）。',
    newPassword: '新密码',
    confirmPassword: '确认密码',
    show: '显示',
    hide: '隐藏',
    submit: '确认更新密码',
    submitting: '更新中…',
    errShort: '密码至少 6 位',
    errMismatch: '两次输入的密码不一致',
    afterWebHint: '在本页更新后，打开 App 用新密码登录即可，无需再在 App 里重置。',
  },
  es: {
    brand: 'Surrogate Agency USA',
    title: 'Restablecer contraseña',
    loading: 'Verificando el enlace…',
    invalidLink:
      'Este enlace no es válido o ha caducado. Solicite un nuevo correo desde la pantalla de inicio de sesión de la app.',
    successTitle: 'Contraseña actualizada',
    successBody: 'Abra la app e inicie sesión con su nueva contraseña.',
    openAppLogin: 'Abrir la app para iniciar sesión',
    needAppBody:
      'No se pudo completar el restablecimiento en el navegador. Solicite un correo nuevo y restablezca aquí.',
    openAppReset: 'Abrir la app',
    needAppHint:
      'Recomendamos restablecer en esta página. Abrir la app desde aquí no transfiere la sesión segura.',
    formIntro: 'Elija una nueva contraseña (mínimo 6 caracteres).',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    show: 'Mostrar',
    hide: 'Ocultar',
    submit: 'Actualizar contraseña',
    submitting: 'Actualizando…',
    errShort: 'La contraseña debe tener al menos 6 caracteres',
    errMismatch: 'Las contraseñas no coinciden',
    afterWebHint:
      'Después de actualizar aquí, abra la app e inicie sesión. No es necesario restablecer de nuevo en la app.',
  },
};

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
  const [lang, setLang] = useState<Lang>('en');
  const t = COPY[lang];
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [client] = useState(() => getBrowserSupabase());

  const canSubmit = useMemo(
    () => password.length >= 6 && password === confirm && !submitting,
    [password, confirm, submitting]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = collectParams();
      const hasTokens = !!(params.access_token && params.refresh_token);
      const hasCode = !!params.code;

      if (!hasTokens && !hasCode) {
        if (!cancelled) {
          setPhase('error');
          setErrorMsg(COPY.en.invalidLink);
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
          window.history.replaceState({}, '', '/reset-password');
          return;
        }

        const { error } = await client.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
        if (!cancelled) setPhase('form');
        window.history.replaceState({}, '', '/reset-password');
      } catch (e: unknown) {
        console.warn('Web recovery session failed:', e);
        if (!cancelled) setPhase('need_app');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (phase === 'error') {
      setErrorMsg(t.invalidLink);
    }
  }, [lang, phase, t.invalidLink]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    if (password.length < 6) {
      setErrorMsg(t.errShort);
      return;
    }
    if (password !== confirm) {
      setErrorMsg(t.errMismatch);
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
      const message = err instanceof Error ? err.message : 'Update failed';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F4F7FB] flex flex-col">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#2A7BF6]">{t.brand}</p>
          <p className="text-xs text-slate-500 mt-0.5">MySurro</p>
        </div>
        <div className="flex rounded-full bg-white border border-slate-200 p-0.5 shrink-0">
          {([
            ['en', 'EN'],
            ['zh', '中文'],
            ['es', 'ES'],
          ] as const).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`min-h-9 min-w-11 px-2.5 rounded-full text-xs font-bold ${
                lang === code ? 'bg-[#2A7BF6] text-white' : 'text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-[0_12px_40px_rgba(15,23,42,0.08)] px-6 py-8">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F1FF] flex items-center justify-center mb-5">
            <span className="text-2xl" aria-hidden>
              🔐
            </span>
          </div>

          <h1 className="text-[1.75rem] leading-tight font-extrabold text-slate-900 tracking-tight">
            {t.title}
          </h1>

          {phase === 'loading' && (
            <p className="mt-6 text-[15px] leading-6 text-slate-700">{t.loading}</p>
          )}

          {phase === 'error' && (
            <p className="mt-6 text-[15px] leading-6 text-red-600">{errorMsg || t.invalidLink}</p>
          )}

          {phase === 'success' && (
            <div className="mt-6 space-y-4">
              <p className="text-[15px] font-semibold text-slate-900">{t.successTitle}</p>
              <p className="text-[15px] leading-6 text-slate-700">{t.successBody}</p>
              <a
                href={APP_OPEN_LOGIN}
                className="mt-2 flex w-full min-h-[56px] items-center justify-center rounded-2xl bg-[#2A7BF6] px-4 text-[17px] font-bold text-white"
              >
                {t.openAppLogin}
              </a>
            </div>
          )}

          {phase === 'need_app' && (
            <div className="mt-6 space-y-4">
              <p className="text-[15px] leading-6 text-slate-700">{t.needAppBody}</p>
              <a
                href={APP_OPEN_RESET}
                className="flex w-full min-h-[56px] items-center justify-center rounded-2xl bg-[#2A7BF6] px-4 text-[17px] font-bold text-white"
              >
                {t.openAppReset}
              </a>
              <p className="text-xs leading-5 text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                {t.needAppHint}
              </p>
            </div>
          )}

          {phase === 'form' && (
            <form className="mt-6 space-y-4" onSubmit={handleUpdatePassword}>
              <p className="text-[15px] leading-6 text-slate-700">{t.formIntro}</p>

              <label className="block text-left">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t.newPassword}
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
                    {showPassword ? t.hide : t.show}
                  </button>
                </div>
              </label>

              <label className="block text-left">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t.confirmPassword}
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
                {submitting ? t.submitting : t.submit}
              </button>

              <p className="text-xs leading-5 text-slate-500 text-center pt-1">{t.afterWebHint}</p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">mysurro.com</p>
      </main>
    </div>
  );
}
