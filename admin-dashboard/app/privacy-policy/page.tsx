import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Surrogate Agency USA',
  description: 'Privacy policy for the Surrogate Agency USA (MySurro) mobile application.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900 hover:text-rose-600">
            MySurro
          </Link>
          <span className="text-sm text-gray-500">Surrogate Agency USA</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-gray">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: June 2026</p>

        <p>
          Babytree Surrogacy (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Surrogate Agency USA
          mobile application (&quot;MySurro&quot; or the &quot;App&quot;). This Privacy Policy explains how we
          collect, use, disclose, and safeguard your information when you use the App.
        </p>

        <h2>Information We Collect</h2>
        <ul>
          <li>
            <strong>Account information:</strong> email address, name, phone number, date of birth,
            location, and password (stored securely via our authentication provider).
          </li>
          <li>
            <strong>Profile and application data:</strong> information you provide in surrogate or
            intended-parent applications, including health-related and medical history information
            where applicable to our services.
          </li>
          <li>
            <strong>Documents and media:</strong> photos, videos, and files you upload (e.g., journey
            posts, insurance documents, contracts).
          </li>
          <li>
            <strong>Usage data:</strong> app interactions necessary to provide the service (e.g.,
            session identifiers for authentication).
          </li>
        </ul>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>Create and manage your member account</li>
          <li>Provide surrogacy program services, matching, and document management</li>
          <li>Communicate with you about your case and agency updates</li>
          <li>Improve app security and reliability</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>Data Storage and Security</h2>
        <p>
          Data is stored using Supabase (hosted infrastructure) with encryption in transit (HTTPS/TLS).
          Access to production data is restricted to authorized personnel. We implement reasonable
          technical and organizational measures to protect your information.
        </p>

        <h2>Sharing of Information</h2>
        <p>
          We do not sell your personal information. We may share data with service providers who assist
          in operating the App (such as cloud hosting and authentication), subject to confidentiality
          obligations, and when required by law.
        </p>

        <h2>Your Choices and Account Deletion</h2>
        <p>
          You may delete your account at any time:
        </p>
        <ul>
          <li>
            <strong>In the App:</strong> User Center → Delete Account → confirm both prompts.
          </li>
          <li>
            <strong>On the web:</strong>{' '}
            <Link href="/delete-account" className="text-rose-600 underline">
              Account deletion instructions
            </Link>
          </li>
        </ul>
        <p>
          When you delete your account, we delete your authentication account and associated profile
          data from our systems, subject to limited retention required for legal, security, or fraud
          prevention purposes as described at the time of deletion.
        </p>

        <h2>Children</h2>
        <p>
          The App is not directed to individuals under 18. We do not knowingly collect personal
          information from children.
        </p>

        <h2>International Users</h2>
        <p>
          If you access the App from outside the United States, your information may be processed in
          the United States or other countries where our service providers operate.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the updated policy on
          this page and update the &quot;Last updated&quot; date.
        </p>

        <h2>Contact Us</h2>
        <p>
          Questions about this Privacy Policy or your data:
        </p>
        <ul>
          <li>
            <a
              href="https://babytreesurrogacy.com/contact-us/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-600 underline"
            >
              babytreesurrogacy.com/contact-us
            </a>
          </li>
        </ul>

        <p className="mt-10 text-sm text-gray-500">
          <Link href="/" className="text-rose-600 underline">
            Back to home
          </Link>
          {' · '}
          <Link href="/delete-account" className="text-rose-600 underline">
            Delete account
          </Link>
        </p>
      </main>
    </div>
  );
}
