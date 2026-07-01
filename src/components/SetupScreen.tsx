export function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-[14px] border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Focus List</h1>
        <p className="mt-3 text-base text-text-muted md:text-sm">
          Supabase isn&apos;t configured yet, so the app can&apos;t load tasks or sign you in.
        </p>
        <ol className="mt-6 space-y-3 text-left text-base text-text-muted md:text-sm">
          <li>
            1. Copy <code className="rounded bg-surface-raised px-1.5 py-0.5 text-text-primary">.env.example</code> to{' '}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 text-text-primary">.env.local</code>
          </li>
          <li>2. Add your Supabase URL and anon key</li>
          <li>3. Run the SQL in <code className="rounded bg-surface-raised px-1.5 py-0.5 text-text-primary">supabase/migrations/001_create_tasks.sql</code></li>
          <li>4. Restart the dev server</li>
        </ol>
      </div>
    </div>
  );
}
