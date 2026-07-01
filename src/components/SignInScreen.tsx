import { useState } from 'react';

interface SignInScreenProps {
  onSignIn: (email: string) => Promise<void>;
}

export function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onSignIn(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">Focus List</h1>
        <p className="mb-8 text-sm text-text-muted">
          Daily task planning with focus timers
        </p>

        {sent ? (
          <div className="rounded-[14px] border border-border bg-surface p-6 text-left">
            <p className="font-medium text-text-primary">Check your email</p>
            <p className="mt-2 text-sm text-text-muted">
              We sent a magic link to <span className="font-medium">{email}</span>.
            </p>
            <div className="mt-4 rounded-[10px] bg-surface-raised px-3 py-2.5 text-[12px] leading-relaxed text-text-muted">
              <p className="font-medium text-text-primary">Using Cursor&apos;s preview?</p>
              <p className="mt-1">
                Email links open in Safari/Chrome by default. Either sign in there at{' '}
                <span className="font-medium text-text-primary">localhost:5173</span>, or
                copy the link from your email and paste it into this preview&apos;s address bar.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-full border border-border bg-surface px-5 py-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
            />
            {error && <p className="text-sm text-urgent">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-bright disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
