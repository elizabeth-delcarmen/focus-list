-- Allow tasks to live in Backlog (scheduled_date = null)
alter table tasks alter column scheduled_date drop not null;
alter table tasks alter column scheduled_date drop default;

-- Move incomplete past-day tasks into Backlog
update tasks
set scheduled_date = null
where status != 'done'
  and scheduled_date is not null
  and scheduled_date < current_date;
