-- ============================================================
-- SMIIC - Adicionar document_url na tabela editais
-- Migration V4
-- ============================================================

ALTER TABLE editais ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE editais ADD COLUMN IF NOT EXISTS cover_url TEXT;
