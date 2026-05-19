-- Original upload filename (may include Unicode); storage object key stays ASCII-only in app.
alter table public.resumes
  add column if not exists original_filename text;

comment on column public.resumes.original_filename is 'Client-side file name at upload time'
