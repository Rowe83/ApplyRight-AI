alter table public.matching_histories
  add column if not exists analysis_json jsonb;

comment on column public.matching_histories.analysis_json is
  'Structured match analysis: score_summary, gap_items, changes, optimized_content_plain';
