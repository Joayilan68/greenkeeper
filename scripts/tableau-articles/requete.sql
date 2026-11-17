-- Base de production (Supabase), lecture seule. Période : du {{debut}} au {{fin}} inclus, heure de Paris
-- ({{debut_utc}} et {{fin_utc}} : minuit de Paris en UTC, le lendemain de la fin pour {{fin_utc}}).
-- Une lecture = une page Conseils vue pendant une visite (conseils_vue, identifiant de visite tiré au hasard, sans compte).
-- Suite de la même visite : passage vers l'app (page_view), diagnostic d'essai lancé, compte créé (signup_completed).
-- Clics Amazon : clics sur les produits de l'encadré « Le matériel conseillé » de l'article (amazon_clic).
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
), par_article as (
  select article, count(*) n,
         count(*) filter (where source = 'google') g,
         count(*) filter (where source = 'facebook') fb,
         count(*) filter (where source not in ('google', 'facebook')) autres,
         count(*) filter (where app) app, count(*) filter (where diag) diag, count(*) filter (where inscrit) ins
  from suite group by article
), amazon as (
  select meta->>'page' as article, count(*) clics
  from public.funnel_events
  where step = 'amazon_clic' and meta->>'page' is not null and created_at >= '{{debut_utc}}' and created_at < '{{fin_utc}}'
  group by 1
)
select json_object_agg(coalesce(p.article, a.article), json_build_array(coalesce(p.n, 0), coalesce(p.g, 0), coalesce(p.fb, 0),
         coalesce(p.autres, 0), coalesce(p.app, 0), coalesce(p.diag, 0), coalesce(p.ins, 0), coalesce(a.clics, 0))
         order by coalesce(p.article, a.article)) as par_article
from par_article p full join amazon a on a.article = p.article;
