-- ============================================================
-- SMIIC - Fichas de Matrícula para Oficinas e Escolinhas
-- Migration V3: workshop_enrollments
-- ============================================================

CREATE TABLE IF NOT EXISTS workshop_enrollments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculo com oficina (opcional — pode ser preenchido como texto livre)
  workshop_id               UUID REFERENCES cultural_workshops(id) ON DELETE SET NULL,

  -- Dados da inscrição
  enrollment_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  period                    TEXT,           -- manhã / tarde / noite
  workshop_name             TEXT,           -- nome da oficina/escolinha (texto livre)
  instructor                TEXT,
  schedule                  TEXT,           -- dias e horários
  location                  TEXT,

  -- Dados do aluno
  student_name              TEXT NOT NULL,
  school                    TEXT,           -- escola em que estuda
  grade                     TEXT,           -- ano/série
  school_period             TEXT,           -- período escolar do aluno
  age                       INT,

  -- Dados do responsável
  guardian_name             TEXT,
  phone                     TEXT,
  address                   TEXT,

  -- Autorização de busca
  accompanied_by_guardian   BOOLEAN NOT NULL DEFAULT TRUE,
  authorized_person         TEXT,           -- nome autorizado para buscar

  -- Termo de Autorização de Uso de Imagem e Voz
  image_authorization       BOOLEAN NOT NULL DEFAULT FALSE,
  image_auth_guardian_name  TEXT,           -- nome do responsável no termo
  image_auth_guardian_cpf   TEXT,           -- CPF do responsável

  -- Controle
  status                    TEXT NOT NULL DEFAULT 'PENDENTE'
                            CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'CANCELADA')),
  admin_notes               TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_enrollments_workshop ON workshop_enrollments(workshop_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status   ON workshop_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_created  ON workshop_enrollments(created_at DESC);

-- RLS
ALTER TABLE workshop_enrollments ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode submeter uma ficha (INSERT público)
CREATE POLICY "enrollments_public_insert" ON workshop_enrollments
  FOR INSERT WITH CHECK (TRUE);

-- Somente admins leem
CREATE POLICY "enrollments_admin_read" ON workshop_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR', 'SERVIDOR')
    )
  );

-- Somente admins atualizam (mudar status, notas)
CREATE POLICY "enrollments_admin_update" ON workshop_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'ADMIN_CULTURA', 'GESTOR')
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_enrollment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enrollment_updated_at
  BEFORE UPDATE ON workshop_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_enrollment_updated_at();
