-- RLS Policies — executar após prisma migrate dev
-- Garante isolamento multi-tenant a nível de banco.
-- O interceptor da API executa: SET LOCAL app.current_tenant_id = '<uuid>'

-- ─── Habilitar RLS nas tabelas com tenant_id ──────────────────────────────────

ALTER TABLE tenant_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;

-- ─── Policies: tenant_users ───────────────────────────────────────────────────

CREATE POLICY tenant_isolation ON tenant_users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ─── Policies: refresh_tokens ────────────────────────────────────────────────

CREATE POLICY tenant_isolation ON refresh_tokens
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ─── Policies: audit_logs ────────────────────────────────────────────────────
-- Super User acessa todos via conexão com is_super_user=true (sem RLS ativo).
-- Usuários normais veem apenas logs do seu tenant.

CREATE POLICY tenant_isolation ON audit_logs
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ─── Garantir que o app user não é superuser do PG ───────────────────────────
-- O app user (mfuser) NÃO deve ser SUPERUSER — SUPERUSER ignora RLS.
-- Verificar: SELECT rolsuper FROM pg_roles WHERE rolname = 'mfuser';
