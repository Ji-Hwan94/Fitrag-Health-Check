drop index if exists public.rag_documents_embedding_idx;

update public.rag_documents
set embedding = null
where embedding is not null;

alter table public.rag_documents
alter column embedding type vector(768);

create index rag_documents_embedding_idx
  on public.rag_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100)
  where embedding is not null;
