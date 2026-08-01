-- Nearest enrolled participant for a face embedding.
--
-- security invoker on purpose: called by the service role from the admin tool.
-- If anon ever reached it, participant_face_signatures has no select policy, so
-- the query would return nothing rather than leaking biometric data. EXECUTE is
-- revoked as well, so it is not reachable at /rest/v1/rpc/ with a browser key.
create or replace function public.match_participant_faces(
  query_embedding extensions.vector(128),
  match_threshold real default 0.363,
  max_results integer default 5
)
returns table (participant_id uuid, score real)
language sql
security invoker
set search_path = ''
as $$
  select
    s.participant_id,
    max(1 - (s.embedding operator(extensions.<=>) query_embedding))::real as score
  from public.participant_face_signatures s
  group by s.participant_id
  having max(1 - (s.embedding operator(extensions.<=>) query_embedding)) >= match_threshold
  order by score desc
  limit max_results;
$$;

revoke all on function public.match_participant_faces(extensions.vector, real, integer)
  from public, anon, authenticated;
