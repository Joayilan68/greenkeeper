-- Base de production (Supabase), lecture seule. Période : du {{debut}} au {{fin}} inclus, heure de Paris
-- ({{debut_utc}} et {{fin_utc}} : minuit de Paris en UTC, le lendemain de la fin pour {{fin_utc}}).
-- Une lecture = une page Conseils vue pendant une visite (conseils_vue, identifiant de visite tiré au hasard, sans compte).
-- Suite de la même visite : passage vers l'app (page_view), diagnostic d'essai lancé, compte créé (signup_completed).
with lectures as (
  select visite, meta->>'page' as article, coalesce(meta->>'source', 'autre') as source, min(created_at) as t
  from public.funnel_events
  where step = 'conseils_vue' and created_at >= '{{debut_utc}}' and created_at < '{{fin_utc}}'
  group by 1, 2, 3
), suite as (
  select l.article, l.source,
         exists (select 1 from public.funnel_events f where f.visite = l.visite and f.created_at > l.t and f.step = 'page_view') as app,
         exists (select 1 from public.funnel_events f where f.visite = l.visite and f.created_at > l.t and f.step = 'anon_diag_started') as diag,
         exists (select 1 from public.funnel_events f where f.visite = l.visite and f.created_at > l.t and f.step = 'signup_completed') as inscrit
  from lectures l
)
select json_object_agg(article, json_build_array(n, g, fb, autres, app, diag, ins) order by article) as par_article
from (
  select article, count(*) n,
         count(*) filter (where source = 'google') g,
         count(*) filter (where source = 'facebook') fb,
         count(*) filter (where source not in ('google', 'facebook')) autres,
         count(*) filter (where app) app, count(*) filter (where diag) diag, count(*) filter (where inscrit) ins
  from suite group by article
) x;
