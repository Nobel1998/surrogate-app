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

export default function ResetPasswordBridgePage() {
  const [deepLink, setDeepLink] = useState(`${APP_SCHEME}?type=recovery`);
  const [status, setStatus] = useState('Preparing to open the app…');
  const [hasToken, setHasToken] = useState(true);

  useEffect(() => {
    const params = collectParams();
    const link = buildAppDeepLink(params);
    setDeepLink(link);

    const ok = !!(params.code || (params.access_token && params.refresh_token));
    setHasToken(ok);

    if (!ok) {
      setStatus(
        'This page is missing a reset token. Please request a new password reset email from the app, then open the new link on your phone.'
      );
      return;
    }

    setStatus('Opening Surrogate Agency USA…');
    const timer = window.setTimeout(() => {
      window.location.href = link;
    }, 300);

    const fallback = window.setTimeout(() => {
      setStatus('If the app did not open, tap the button below.');
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Reset Password</h1>
        <p className="text-slate-600 mb-6">{status}</p>

        <a
          href={deepLink}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#2A7BF6] px-4 py-3 text-white font-semibold hover:bg-[#1f6ae0] transition"
        >
          Open App to Set New Password
        </a>

        {!hasToken && (
          <p className="mt-4 text-sm text-amber-700">
            Tip: open the reset link from the email on the same phone where the app is installed.
          </p>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Surrogate Agency USA · mysurro.com
        </p>
      </div>
    </main>
  );
}
