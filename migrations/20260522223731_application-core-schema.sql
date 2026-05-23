create table if not exists users (
    id uuid primary key,
    full_name text not null,
    email text not null unique,
    password_hash text not null,
    system_role smallint not null,
    account_origin smallint not null,
    created_on_utc timestamptz not null,
    updated_on_utc timestamptz not null
);

create table if not exists projects (
    id uuid primary key,
    name text not null,
    description text not null,
    external_reference text not null,
    owner_id uuid not null references users(id) on delete restrict,
    created_on_utc timestamptz not null,
    updated_on_utc timestamptz not null
);

create table if not exists project_members (
    project_id uuid not null references projects(id) on delete cascade,
    user_id uuid not null references users(id) on delete restrict,
    role smallint not null,
    joined_on_utc timestamptz not null,
    primary key (project_id, user_id)
);

create table if not exists user_stories (
    id uuid primary key,
    project_id uuid not null references projects(id) on delete restrict,
    title text not null,
    description text not null,
    created_on_utc timestamptz not null,
    updated_on_utc timestamptz not null
);

create table if not exists sprint_tasks (
    id uuid primary key,
    project_id uuid not null references projects(id) on delete restrict,
    user_story_id uuid not null references user_stories(id) on delete restrict,
    title text not null,
    description text not null,
    is_completed boolean not null default false,
    created_on_utc timestamptz not null,
    updated_on_utc timestamptz not null
);

create table if not exists sprint_task_assignments (
    task_id uuid not null references sprint_tasks(id) on delete cascade,
    user_id uuid not null references users(id) on delete restrict,
    primary key (task_id, user_id)
);

create table if not exists task_comments (
    id uuid primary key,
    task_id uuid not null references sprint_tasks(id) on delete cascade,
    author_id uuid not null references users(id) on delete restrict,
    body text not null,
    created_on_utc timestamptz not null
);

create index if not exists ix_projects_owner_id on projects(owner_id);
create index if not exists ix_project_members_user_id on project_members(user_id);
create index if not exists ix_user_stories_project_id on user_stories(project_id);
create index if not exists ix_sprint_tasks_project_id on sprint_tasks(project_id);
create index if not exists ix_sprint_tasks_user_story_id on sprint_tasks(user_story_id);
create index if not exists ix_sprint_task_assignments_user_id on sprint_task_assignments(user_id);
create index if not exists ix_task_comments_task_id on task_comments(task_id);
