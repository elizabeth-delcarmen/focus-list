-- Flexible chore intervals: interval_value + interval_unit replace preset recurrence for scheduled chores.
-- recurrence_type = 'someday' remains the only enum value used for non-scheduled chores.

alter table chores add column if not exists interval_value integer;
alter table chores add column if not exists interval_unit text;

alter table chores drop constraint if exists chores_interval_unit_check;
alter table chores add constraint chores_interval_unit_check
  check (interval_unit is null or interval_unit in ('days', 'weeks', 'months'));

-- Backfill from legacy recurrence_type presets
update chores set interval_value = 1, interval_unit = 'weeks'
  where recurrence_type = 'weekly' and interval_value is null;

update chores set interval_value = 1, interval_unit = 'months'
  where recurrence_type = 'monthly' and interval_value is null;

update chores set interval_value = 2, interval_unit = 'months'
  where recurrence_type = 'bimonthly' and interval_value is null;

update chores set interval_value = 3, interval_unit = 'months'
  where recurrence_type = 'quarterly' and interval_value is null;

update chores set interval_value = 6, interval_unit = 'months'
  where recurrence_type = 'biannual' and interval_value is null;

update chores set interval_value = 12, interval_unit = 'months'
  where recurrence_type = 'yearly' and interval_value is null;

-- Scheduled chores no longer need a preset recurrence_type value
alter table chores alter column recurrence_type drop not null;

update chores set recurrence_type = null
  where recurrence_type is not null and recurrence_type != 'someday';
