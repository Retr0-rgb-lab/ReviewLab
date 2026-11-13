with root as (
  insert into folders (name, created_at, updated_at)
  values ('Software Engineering', '2026-11-12 09:00:00+08', '2026-11-12 09:00:00+08')
  returning id
),
topic as (
  insert into folders (name, parent_id, created_at, updated_at)
  select 'Integration', id, '2026-11-12 09:01:00+08', '2026-11-12 09:01:00+08'
  from root
  returning id
)
insert into cards (title, body, folder_id, mastery, created_at, updated_at)
select 'What is a requirement?',
       'A condition or capability needed by the user.',
       root.id,
       'mastered',
       '2026-11-12 09:02:00+08',
       '2026-11-12 09:02:00+08'
from root
union all
select 'What is integration?',
       'Assembling components into one system.',
       topic.id,
       'unmastered',
       '2026-11-12 09:03:00+08',
       '2026-11-12 09:03:00+08'
from topic
union all
select 'What is configuration?',
       '',
       topic.id,
       'unmarked',
       '2026-11-12 09:04:00+08',
       '2026-11-12 09:04:00+08'
from topic;