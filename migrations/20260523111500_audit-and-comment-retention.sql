create table if not exists audit_events (
    id uuid primary key,
    actor_id uuid null references users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id uuid not null,
    occurred_on_utc timestamptz not null,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists retained_task_comments (
    comment_id uuid primary key,
    task_id uuid not null,
    author_id uuid not null references users(id) on delete restrict,
    body text not null,
    created_on_utc timestamptz not null,
    retained_on_utc timestamptz not null,
    retained_by uuid null references users(id) on delete set null,
    reason text not null
);

create index if not exists ix_audit_events_actor_id on audit_events(actor_id);
create index if not exists ix_audit_events_entity on audit_events(entity_type, entity_id);
create index if not exists ix_audit_events_occurred_on_utc on audit_events(occurred_on_utc);
create index if not exists ix_retained_task_comments_task_id on retained_task_comments(task_id);
create index if not exists ix_retained_task_comments_author_id on retained_task_comments(author_id);
