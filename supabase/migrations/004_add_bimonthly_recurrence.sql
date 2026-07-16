-- Add bimonthly (every 2 months) to chore recurrence enum

alter type chore_recurrence add value if not exists 'bimonthly' after 'monthly';
