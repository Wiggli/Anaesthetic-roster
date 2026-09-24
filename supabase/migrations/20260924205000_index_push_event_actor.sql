-- Cover the server-only push dispatch actor foreign key flagged by the Supabase performance adviser.
create index if not exists push_event_dispatches_actor_id_idx
on public.push_event_dispatches(actor_id)
where actor_id is not null;
