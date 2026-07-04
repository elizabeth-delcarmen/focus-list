import { useState } from 'react';
import { Button } from './Button';
import { isStandalonePwa } from '../lib/pwa';

interface SignInScreenProps {
  onSignIn: (email: string) => Promise<void>;
  onSignInWithLink?: (url: string) => Promise<void>;
}

export function SignInScreen({ onSignIn, onSignInWithLink }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedLink, setPastedLink] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const isHomeScreen = isStandalonePwa();

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

  const handlePasteLink = async () => {
    if (!pastedLink.trim() || !onSignInWithLink) return;

    setLinkLoading(true);
    setLinkError(null);

    try {
      await onSignInWithLink(pastedLink.trim());
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Could not sign in with that link');
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">Focus List</h1>
        <p className="mb-8 text-base text-text-muted md:text-sm">
          Daily task planning with focus timers
        </p>

        {sent ? (
          <div className="rounded-[14px] border border-border bg-surface p-6 text-left">
            <p className="font-medium text-text-primary">Check your email</p>
            <p className="mt-2 text-base text-text-muted md:text-sm">
              We sent a magic link to <span className="font-medium">{email}</span>.
            </p>

            {isHomeScreen ? (
              <div className="mt-4 space-y-3 rounded-[10px] bg-surface-raised px-3 py-3 text-base leading-relaxed text-text-muted md:text-[12px]">
                <p className="font-medium text-text-primary">Using the home screen app?</p>
                <p>
                  Email links usually open in Safari, not this app. Copy the full link from your
                  email, then paste it below to sign in here.
                </p>
                {onSignInWithLink ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={pastedLink}
                      onChange={(e) => setPastedLink(e.target.value)}
                      placeholder="Paste full link from email"
                      className="w-full rounded-full border border-border bg-bg px-4 py-2.5 text-base text-text-primary outline-none placeholder:text-text-faint focus:border-accent md:text-sm"
                    />
                    {linkError ? (
                      <p className="text-base text-urgent md:text-sm">{linkError}</p>
                    ) : null}
                    <Button
                      type="button"
                      disabled={linkLoading || !pastedLink.trim()}
                      className="w-full"
                      onClick={() => void handlePasteLink()}
                    >
                      {linkLoading ? 'Signing in…' : 'Sign in with pasted link'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-[10px] bg-surface-raised px-3 py-2.5 text-base leading-relaxed text-text-muted md:text-[12px]">
                <p className="font-medium text-text-primary">Link opened in another browser?</p>
                <p className="mt-1">
                  Copy the link from your email and paste it into this window&apos;s address bar, or
                  add Focus List to your home screen and use the paste option there.
                </p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-full border border-border bg-surface px-5 py-3 text-base text-text-primary outline-none placeholder:text-base placeholder:text-text-faint focus:border-accent md:text-sm md:placeholder:text-sm"
            />
            {error && <p className="text-base text-urgent md:text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full py-3">
              {loading ? 'Sending…' : 'Send magic link'}
            </Button>
            {isHomeScreen && onSignInWithLink ? (
              <div className="rounded-[10px] border border-border bg-surface px-3 py-3 text-left text-base text-text-muted md:text-[12px]">
                <p className="font-medium text-text-primary">Already have a magic link?</p>
                <p className="mt-1">Copy it from your email and paste it here.</p>
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={pastedLink}
                    onChange={(e) => setPastedLink(e.target.value)}
                    placeholder="Paste full link from email"
                    className="w-full rounded-full border border-border bg-bg px-4 py-2.5 text-base text-text-primary outline-none placeholder:text-text-faint focus:border-accent md:text-sm"
                  />
                  {linkError ? (
                    <p className="text-base text-urgent md:text-sm">{linkError}</p>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={linkLoading || !pastedLink.trim()}
                    className="w-full"
                    onClick={() => void handlePasteLink()}
                  >
                    {linkLoading ? 'Signing in…' : 'Sign in with pasted link'}
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
