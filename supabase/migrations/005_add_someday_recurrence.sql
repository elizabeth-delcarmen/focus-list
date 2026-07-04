-- Add "someday" recurrence (no schedule).
-- Run in Supabase SQL Editor if not applied via CLI.
-- If the enum add succeeds but the column alter fails, run only the ALTER TABLE line.

alter type chore_recurrence add value if not exists 'someday';

alter table chores alter column next_due_at drop not null;
