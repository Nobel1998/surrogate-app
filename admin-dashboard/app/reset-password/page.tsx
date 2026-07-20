'use client';

import { useEffect, useState } from 'react';

const APP_SCHEME = 'surrogateagency://reset-password';

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
  if (params.type) qs.set('type', params.type);
  else qs.set('type', 'recovery');
  const query = qs.toString();
  return query ? `${APP_SCHEME}?${query}` : `${APP_SCHEME}?type=recovery`;
}

type Phase = 'opening' | 'ready' | 'missing';

export default function ResetPasswordBridgePage() {
  const [deepLink, setDeepLink] = useState(`${APP_SCHEME}?type=recovery`);
  const [phase, setPhase] = useState<Phase>('opening');

  useEffect(() => {
    const params = collectParams();
    const link = buildAppDeepLink(params);
    setDeepLink(link);

    const ok = !!(params.code || (params.access_token && params.refresh_token));
    if (!ok) {
      setPhase('missing');
      return;
    }

    setPhase('opening');
    const timer = window.setTimeout(() => {
      window.location.href = link;
    }, 400);

    const fallback = window.setTimeout(() => {
      setPhase('ready');
    }, 1200);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
  }, []);

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

          {phase === 'missing' ? (
            <div className="mt-6 space-y-3">
              <p className="text-[15px] leading-6 text-slate-700">
                链接无效或已过期。请回到 App，在登录页点击「Forgot Password?」重新发送邮件。
              </p>
              <p className="text-sm leading-5 text-slate-500">
                This link is missing a reset token. Request a new email from the app, then open it on
                this phone.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-[15px] leading-6 text-slate-700">
                {phase === 'opening'
                  ? '正在尝试打开 App，请稍候…'
                  : '如果没有自动打开，请点击下方大按钮继续。'}
              </p>
              <p className="text-sm leading-5 text-slate-500">
                {phase === 'opening'
                  ? 'Opening the app…'
                  : 'Tap the button below if the app did not open automatically.'}
              </p>
            </div>
          )}

          {phase !== 'missing' && (
            <a
              href={deepLink}
              className="mt-8 flex w-full min-h-[56px] items-center justify-center rounded-2xl bg-[#2A7BF6] px-4 text-[17px] font-bold text-white active:bg-[#1f6ae0] shadow-[0_10px_24px_rgba(42,123,246,0.35)]"
            >
              打开 App 设置新密码
            </a>
          )}

          {phase !== 'missing' && (
            <ol className="mt-8 space-y-3 text-left">
              <li className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  1
                </span>
                <span>点击上方按钮打开 Surrogate Agency USA</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  2
                </span>
                <span>在 App 里输入并确认新密码</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  3
                </span>
                <span>完成后用新密码登录即可</span>
              </li>
            </ol>
          )}

          {phase === 'ready' && (
            <p className="mt-6 text-xs leading-5 text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              若按钮无反应：用 Safari / Chrome 打开本页，或确认手机已安装本 App。
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">mysurro.com</p>
      </main>
    </div>
  );
}
