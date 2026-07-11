import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete Account — Surrogate Agency USA',
  description: 'How to permanently delete your Surrogate Agency USA (MySurro) account and associated data.',
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900 hover:text-rose-600">
            MySurro
          </Link>
          <span className="text-sm text-gray-500">Account deletion</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-gray">
        <h1>Delete Your Account</h1>
        <p className="text-sm text-gray-500">Surrogate Agency USA (MySurro)</p>

        <p>
          You can permanently delete your app account and associated profile data. This action cannot
          be undone. After deletion, you will need to register again to use the App.
        </p>

        <h2>Delete in the App (recommended)</h2>
        <ol>
          <li>Open the <strong>Surrogate Agency USA</strong> app and sign in.</li>
          <li>Go to <strong>User Center</strong> (Profile tab).</li>
          <li>Scroll to the bottom, above <strong>Sign Out</strong>.</li>
          <li>Tap <strong>Delete Account</strong>.</li>
          <li>Confirm both prompts to permanently delete your account.</li>
        </ol>

        <h2>What is deleted</h2>
        <ul>
          <li>Your login account (authentication)</li>
          <li>Your profile and associated app data linked to your user ID</li>
        </ul>
        <p>
          Some information may be retained where required by law, for fraud prevention, or to resolve
          disputes. We will not use retained data for marketing.
        </p>

        <h2>Need help?</h2>
        <p>
          If you cannot access the App or need assistance deleting your account, contact us at{' '}
          <a
            href="https://babytreesurrogacy.com/contact-us/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 underline"
          >
            babytreesurrogacy.com/contact-us
          </a>{' '}
          with the email address associated with your account. We will verify your identity and process
          your deletion request.
        </p>

        <p className="mt-10 text-sm text-gray-500">
          <Link href="/privacy-policy" className="text-rose-600 underline">
            Privacy Policy
          </Link>
          {' · '}
          <Link href="/" className="text-rose-600 underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
