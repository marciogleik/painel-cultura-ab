-- ============================================================
-- Migration 7: Tipologias Oficiais SMIIC (SECTUR)
-- 5 macroáreas (nível 1) + 143 categorias (nível 2)
-- Gerada a partir de src/data/smiicTypologies.ts.
-- UUIDs próprios (prefixo a000000x) para não colidir com a seed da migration 5.
-- A taxonomia antiga (migration 5) é desativada, exceto itens já usados por agentes.
-- ============================================================

-- Slugs da seed antiga que colidem com a taxonomia oficial recebem o sufixo "-legado",
-- para que as linhas novas entrem com seus próprios ids (e os filhos apontem para elas).
UPDATE public.cultural_typologies
SET slug = slug || '-legado'
WHERE context = 'agent'
  AND id::text NOT LIKE 'a000000%'
  AND slug IN ('demais-agentes-culturais', 'acrobata', 'agentes-de-leitura', 'apresentador-de-eventos-programas-e-espetaculos', 'arte-de-rua', 'artesanato', 'artesao', 'artista-plastico-a', 'assistente-de-camera', 'atividade-circense', 'ator', 'atriz', 'bailarino-a-dancarino-a', 'breaking', 'cantor', 'cenografo', 'cenografo-a', 'cenotecnico', 'ceramista', 'cineasta', 'cinegrafista', 'circo', 'colorista', 'compositor', 'continuista', 'contrarregra', 'coral', 'coreografo-a', 'desenhista-de-animacao', 'desenho', 'diretor-a', 'diretor-coreografo-a', 'diretor-de-arte', 'diretor-de-cinema', 'diretor-de-espetaculo-teatral', 'diretor-de-fotografia', 'diretor-musical', 'dj', 'editor', 'editor-a', 'escritor-a', 'escultor-a', 'figurinista', 'fotografo-de-cena', 'grafite', 'gravurista', 'humorista', 'iluminacao', 'instrumentista', 'instrutor', 'interprete-cantor-a', 'literatura', 'logger', 'maquiador-a', 'maquiador-a-artistica', 'maquiador-e-cabeleireiro', 'marcador-de-luz', 'mestre-de-capoeira', 'mestres-de-cultura', 'mestres-de-cultura-saberes-tradicionais-cultura-popular', 'musico', 'organizadora-produtora-de-eventos', 'outros', 'poeta', 'produtor', 'produtor-cultural', 'produtor-executivo-e-assistente-de-producao', 'produtor-musical', 'professor-de-capoeira', 'professor-de-danca', 'professor-de-musica', 'professor-de-teatro', 'publicidade', 'radialista', 'rapper', 'regente-de-banda-marcial', 'regente-de-coral', 'regente-de-orquestra', 'repentista', 'revisor', 'roteirista', 'sonoplasta', 'street-dance', 'tecnico', 'economia-criativa-conhecimento-inovacao-negocio', 'cartunista', 'culinaria', 'design-grafico', 'estudio-fotografico', 'fotografo-a', 'laboratorio-fotografico', 'mestre-em-culinaria', 'economia-outros', 'tecnico-em-culinaria', 'empresas-do-setor-cultural-cnae', 'empresas-audiovisual', 'empresas-da-cultura-digital', 'empresas-da-musica', 'empresas-de-arquitetura', 'empresas-de-artes-cenicas', 'empresas-de-fotografia', 'empresas-de-moda', 'empresas-do-mercado-editorial', 'empresas-do-patrimonio-cultural', 'gestao-cultural', 'empresas-organizadora-produtora-de-eventos', 'empresas-outros', 'prestadora-de-servicos-de-som-e-iluminacao-de-teatro', 'prestadora-de-servicos-em-cenografia', 'produtoras-de-espetaculos', 'empresas-produtor-cultural', 'grupos-de-cultura-associacoes-coletivos-ou-cooperativas', 'agremiacoes-de-carnaval', 'associacoes-de-amigos', 'banda', 'bloco-de-carnaval', 'grupos-circo', 'conjunto-musical', 'grupos-coral', 'escola-de-samba', 'grupo-associacao-coletivo-de-amigos-da-banda-musical', 'grupo-associacao-coletivo-de-amigos-da-biblioteca', 'grupo-associacao-coletivo-de-amigos-de-museu', 'grupo-associacao-coletivo-de-artesanato', 'grupo-de-arte-digital', 'grupo-de-arte-visual', 'grupo-de-audiovisual', 'grupo-de-capoeira', 'grupo-de-circo', 'grupo-de-danca', 'grupo-de-design', 'grupo-de-fotografia', 'grupo-de-lgbtqiamais', 'grupo-de-livro-e-leitura', 'grupo-de-moda', 'grupo-de-teatro', 'grupo-parafolclorico', 'grupo-relacionado-a-patrimonio-cultural', 'orquestra', 'grupos-outros', 'povos-comunidades-ou-grupos-tradicionais', 'comunidades-de-culturas-estrangeiras', 'cultura-lgbtqiamais', 'outras-etnias', 'povos-outros', 'povos-e-comunidades-tradicionais', 'povos-indigenas', 'xavante');

INSERT INTO public.cultural_typologies (id, name, slug, level, parent_id, context, sort_order, is_active) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'DEMAIS AGENTES CULTURAIS', 'demais-agentes-culturais', 1, NULL, 'agent', 1, TRUE),
  ('a0000002-0001-4000-8000-000000000001', 'ACROBATA', 'acrobata', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 1, TRUE),
  ('a0000002-0001-4000-8000-000000000002', 'AGENTES DE LEITURA', 'agentes-de-leitura', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 2, TRUE),
  ('a0000002-0001-4000-8000-000000000003', 'APRESENTADOR DE EVENTOS, PROGRAMAS E ESPETÁCULOS', 'apresentador-de-eventos-programas-e-espetaculos', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 3, TRUE),
  ('a0000002-0001-4000-8000-000000000004', 'ARTE DE RUA', 'arte-de-rua', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 4, TRUE),
  ('a0000002-0001-4000-8000-000000000005', 'ARTESANATO', 'artesanato', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 5, TRUE),
  ('a0000002-0001-4000-8000-000000000006', 'ARTESÃO', 'artesao', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 6, TRUE),
  ('a0000002-0001-4000-8000-000000000007', 'ARTISTA PLASTICO(A)', 'artista-plastico-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 7, TRUE),
  ('a0000002-0001-4000-8000-000000000008', 'ASSISTENTE DE CÂMERA', 'assistente-de-camera', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 8, TRUE),
  ('a0000002-0001-4000-8000-000000000009', 'ATIVIDADE CIRCENSE', 'atividade-circense', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 9, TRUE),
  ('a0000002-0001-4000-8000-000000000010', 'ATOR', 'ator', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 10, TRUE),
  ('a0000002-0001-4000-8000-000000000011', 'ATRIZ', 'atriz', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 11, TRUE),
  ('a0000002-0001-4000-8000-000000000012', 'BAILARINO(A) / DANÇARINO(A)', 'bailarino-a-dancarino-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 12, TRUE),
  ('a0000002-0001-4000-8000-000000000013', 'BREAKING', 'breaking', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 13, TRUE),
  ('a0000002-0001-4000-8000-000000000014', 'CANTOR', 'cantor', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 14, TRUE),
  ('a0000002-0001-4000-8000-000000000015', 'CENOGRAFO', 'cenografo', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 15, TRUE),
  ('a0000002-0001-4000-8000-000000000016', 'CENÓGRAFO(A)', 'cenografo-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 16, TRUE),
  ('a0000002-0001-4000-8000-000000000017', 'CENOTÉCNICO', 'cenotecnico', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 17, TRUE),
  ('a0000002-0001-4000-8000-000000000018', 'CERAMISTA', 'ceramista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 18, TRUE),
  ('a0000002-0001-4000-8000-000000000019', 'CINEASTA', 'cineasta', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 19, TRUE),
  ('a0000002-0001-4000-8000-000000000020', 'CINEGRAFISTA', 'cinegrafista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 20, TRUE),
  ('a0000002-0001-4000-8000-000000000021', 'CIRCO', 'circo', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 21, TRUE),
  ('a0000002-0001-4000-8000-000000000022', 'COLORISTA', 'colorista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 22, TRUE),
  ('a0000002-0001-4000-8000-000000000023', 'COMPOSITOR', 'compositor', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 23, TRUE),
  ('a0000002-0001-4000-8000-000000000024', 'CONTINUÍSTA', 'continuista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 24, TRUE),
  ('a0000002-0001-4000-8000-000000000025', 'CONTRARREGRA', 'contrarregra', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 25, TRUE),
  ('a0000002-0001-4000-8000-000000000026', 'CORAL', 'coral', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 26, TRUE),
  ('a0000002-0001-4000-8000-000000000027', 'COREÓGRAFO(A)', 'coreografo-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 27, TRUE),
  ('a0000002-0001-4000-8000-000000000028', 'DESENHISTA DE ANIMAÇÃO', 'desenhista-de-animacao', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 28, TRUE),
  ('a0000002-0001-4000-8000-000000000029', 'DESENHO', 'desenho', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 29, TRUE),
  ('a0000002-0001-4000-8000-000000000030', 'DIRETOR(A)', 'diretor-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 30, TRUE),
  ('a0000002-0001-4000-8000-000000000031', 'DIRETOR COREOGRAFO(A)', 'diretor-coreografo-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 31, TRUE),
  ('a0000002-0001-4000-8000-000000000032', 'DIRETOR DE ARTE', 'diretor-de-arte', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 32, TRUE),
  ('a0000002-0001-4000-8000-000000000033', 'DIRETOR DE CINEMA', 'diretor-de-cinema', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 33, TRUE),
  ('a0000002-0001-4000-8000-000000000034', 'DIRETOR DE ESPETACULO TEATRAL', 'diretor-de-espetaculo-teatral', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 34, TRUE),
  ('a0000002-0001-4000-8000-000000000035', 'DIRETOR DE FOTOGRAFIA', 'diretor-de-fotografia', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 35, TRUE),
  ('a0000002-0001-4000-8000-000000000036', 'DIRETOR MUSICAL', 'diretor-musical', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 36, TRUE),
  ('a0000002-0001-4000-8000-000000000037', 'DJ', 'dj', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 37, TRUE),
  ('a0000002-0001-4000-8000-000000000038', 'EDITOR', 'editor', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 38, TRUE),
  ('a0000002-0001-4000-8000-000000000039', 'EDITOR(A)', 'editor-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 39, TRUE),
  ('a0000002-0001-4000-8000-000000000040', 'ESCRITOR(A)', 'escritor-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 40, TRUE),
  ('a0000002-0001-4000-8000-000000000041', 'ESCULTOR(A)', 'escultor-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 41, TRUE),
  ('a0000002-0001-4000-8000-000000000042', 'FIGURINISTA', 'figurinista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 42, TRUE),
  ('a0000002-0001-4000-8000-000000000043', 'FOTÓGRAFO DE CENA', 'fotografo-de-cena', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 43, TRUE),
  ('a0000002-0001-4000-8000-000000000044', 'GRAFITE', 'grafite', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 44, TRUE),
  ('a0000002-0001-4000-8000-000000000045', 'GRAVURISTA', 'gravurista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 45, TRUE),
  ('a0000002-0001-4000-8000-000000000046', 'HUMORISTA', 'humorista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 46, TRUE),
  ('a0000002-0001-4000-8000-000000000047', 'ILUMINAÇÃO', 'iluminacao', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 47, TRUE),
  ('a0000002-0001-4000-8000-000000000048', 'INSTRUMENTISTA', 'instrumentista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 48, TRUE),
  ('a0000002-0001-4000-8000-000000000049', 'INSTRUTOR', 'instrutor', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 49, TRUE),
  ('a0000002-0001-4000-8000-000000000050', 'INTERPRETE/CANTOR(A)', 'interprete-cantor-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 50, TRUE),
  ('a0000002-0001-4000-8000-000000000051', 'LITERATURA', 'literatura', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 51, TRUE),
  ('a0000002-0001-4000-8000-000000000052', 'LOGGER', 'logger', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 52, TRUE),
  ('a0000002-0001-4000-8000-000000000053', 'MAQUIADOR(A)', 'maquiador-a', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 53, TRUE),
  ('a0000002-0001-4000-8000-000000000054', 'MAQUIADOR(A) ARTISTICA', 'maquiador-a-artistica', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 54, TRUE),
  ('a0000002-0001-4000-8000-000000000055', 'MAQUIADOR E CABELEIREIRO', 'maquiador-e-cabeleireiro', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 55, TRUE),
  ('a0000002-0001-4000-8000-000000000056', 'MARCADOR DE LUZ', 'marcador-de-luz', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 56, TRUE),
  ('a0000002-0001-4000-8000-000000000057', 'MESTRE DE CAPOEIRA', 'mestre-de-capoeira', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 57, TRUE),
  ('a0000002-0001-4000-8000-000000000058', 'MESTRES DE CULTURA', 'mestres-de-cultura', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 58, TRUE),
  ('a0000002-0001-4000-8000-000000000059', 'MESTRES DE CULTURA / SABERES TRADICIONAIS / CULTURA POPULAR', 'mestres-de-cultura-saberes-tradicionais-cultura-popular', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 59, TRUE),
  ('a0000002-0001-4000-8000-000000000060', 'MÚSICO', 'musico', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 60, TRUE),
  ('a0000002-0001-4000-8000-000000000061', 'ORGANIZADORA/PRODUTORA DE EVENTOS', 'organizadora-produtora-de-eventos', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 61, TRUE),
  ('a0000002-0001-4000-8000-000000000062', 'OUTROS', 'outros', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 62, TRUE),
  ('a0000002-0001-4000-8000-000000000063', 'POETA', 'poeta', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 63, TRUE),
  ('a0000002-0001-4000-8000-000000000064', 'PRODUTOR', 'produtor', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 64, TRUE),
  ('a0000002-0001-4000-8000-000000000065', 'PRODUTOR CULTURAL', 'produtor-cultural', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 65, TRUE),
  ('a0000002-0001-4000-8000-000000000066', 'PRODUTOR EXECUTIVO E ASSISTENTE DE PRODUÇÃO', 'produtor-executivo-e-assistente-de-producao', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 66, TRUE),
  ('a0000002-0001-4000-8000-000000000067', 'PRODUTOR MUSICAL', 'produtor-musical', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 67, TRUE),
  ('a0000002-0001-4000-8000-000000000068', 'PROFESSOR DE CAPOEIRA', 'professor-de-capoeira', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 68, TRUE),
  ('a0000002-0001-4000-8000-000000000069', 'PROFESSOR DE DANÇA', 'professor-de-danca', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 69, TRUE),
  ('a0000002-0001-4000-8000-000000000070', 'PROFESSOR DE MUSICA', 'professor-de-musica', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 70, TRUE),
  ('a0000002-0001-4000-8000-000000000071', 'PROFESSOR DE TEATRO', 'professor-de-teatro', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 71, TRUE),
  ('a0000002-0001-4000-8000-000000000072', 'PUBLICIDADE', 'publicidade', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 72, TRUE),
  ('a0000002-0001-4000-8000-000000000073', 'RADIALISTA', 'radialista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 73, TRUE),
  ('a0000002-0001-4000-8000-000000000074', 'RAPPER', 'rapper', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 74, TRUE),
  ('a0000002-0001-4000-8000-000000000075', 'REGENTE DE BANDA MARCIAL', 'regente-de-banda-marcial', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 75, TRUE),
  ('a0000002-0001-4000-8000-000000000076', 'REGENTE DE CORAL', 'regente-de-coral', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 76, TRUE),
  ('a0000002-0001-4000-8000-000000000077', 'REGENTE DE ORQUESTRA', 'regente-de-orquestra', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 77, TRUE),
  ('a0000002-0001-4000-8000-000000000078', 'REPENTISTA', 'repentista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 78, TRUE),
  ('a0000002-0001-4000-8000-000000000079', 'REVISOR', 'revisor', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 79, TRUE),
  ('a0000002-0001-4000-8000-000000000080', 'ROTEIRISTA', 'roteirista', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 80, TRUE),
  ('a0000002-0001-4000-8000-000000000081', 'SONOPLASTA', 'sonoplasta', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 81, TRUE),
  ('a0000002-0001-4000-8000-000000000082', 'STREET DANCE', 'street-dance', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 82, TRUE),
  ('a0000002-0001-4000-8000-000000000083', 'TÉCNICO', 'tecnico', 2, 'a0000001-0000-4000-8000-000000000001', 'agent', 83, TRUE),
  ('a0000001-0000-4000-8000-000000000002', 'ECONOMIA CRIATIVA CONHECIMENTO INOVAÇÃO/NEGÓCIO', 'economia-criativa-conhecimento-inovacao-negocio', 1, NULL, 'agent', 2, TRUE),
  ('a0000002-0002-4000-8000-000000000001', 'CARTUNISTA', 'cartunista', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 1, TRUE),
  ('a0000002-0002-4000-8000-000000000002', 'CULINARIA', 'culinaria', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 2, TRUE),
  ('a0000002-0002-4000-8000-000000000003', 'DESIGN GRÁFICO', 'design-grafico', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 3, TRUE),
  ('a0000002-0002-4000-8000-000000000004', 'ESTÚDIO FOTOGRÁFICO', 'estudio-fotografico', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 4, TRUE),
  ('a0000002-0002-4000-8000-000000000005', 'FOTÓGRAFO(A)', 'fotografo-a', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 5, TRUE),
  ('a0000002-0002-4000-8000-000000000006', 'LABORATÓRIO FOTOGRÁFICO', 'laboratorio-fotografico', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 6, TRUE),
  ('a0000002-0002-4000-8000-000000000007', 'MESTRE EM CULINARIA', 'mestre-em-culinaria', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 7, TRUE),
  ('a0000002-0002-4000-8000-000000000008', 'OUTROS', 'economia-outros', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 8, TRUE),
  ('a0000002-0002-4000-8000-000000000009', 'TECNICO EM CULINARIA', 'tecnico-em-culinaria', 2, 'a0000001-0000-4000-8000-000000000002', 'agent', 9, TRUE),
  ('a0000001-0000-4000-8000-000000000003', 'EMPRESAS DO SETOR CULTURAL (CNAE)', 'empresas-do-setor-cultural-cnae', 1, NULL, 'agent', 3, TRUE),
  ('a0000002-0003-4000-8000-000000000001', 'EMPRESAS AUDIOVISUAL', 'empresas-audiovisual', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 1, TRUE),
  ('a0000002-0003-4000-8000-000000000002', 'EMPRESAS DA CULTURA DIGITAL', 'empresas-da-cultura-digital', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 2, TRUE),
  ('a0000002-0003-4000-8000-000000000003', 'EMPRESAS DA MÚSICA', 'empresas-da-musica', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 3, TRUE),
  ('a0000002-0003-4000-8000-000000000004', 'EMPRESAS DE ARQUITETURA', 'empresas-de-arquitetura', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 4, TRUE),
  ('a0000002-0003-4000-8000-000000000005', 'EMPRESAS DE ARTES CÊNICAS', 'empresas-de-artes-cenicas', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 5, TRUE),
  ('a0000002-0003-4000-8000-000000000006', 'EMPRESAS DE FOTOGRAFIA', 'empresas-de-fotografia', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 6, TRUE),
  ('a0000002-0003-4000-8000-000000000007', 'EMPRESAS DE MODA', 'empresas-de-moda', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 7, TRUE),
  ('a0000002-0003-4000-8000-000000000008', 'EMPRESAS DO MERCADO EDITORIAL', 'empresas-do-mercado-editorial', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 8, TRUE),
  ('a0000002-0003-4000-8000-000000000009', 'EMPRESAS DO PATRIMÔNIO CULTURAL', 'empresas-do-patrimonio-cultural', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 9, TRUE),
  ('a0000002-0003-4000-8000-000000000010', 'GESTÃO CULTURAL', 'gestao-cultural', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 10, TRUE),
  ('a0000002-0003-4000-8000-000000000011', 'ORGANIZADORA/PRODUTORA DE EVENTOS', 'empresas-organizadora-produtora-de-eventos', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 11, TRUE),
  ('a0000002-0003-4000-8000-000000000012', 'OUTROS', 'empresas-outros', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 12, TRUE),
  ('a0000002-0003-4000-8000-000000000013', 'PRESTADORA DE SERVIÇOS DE SOM E ILUMINAÇÃO DE TEATRO', 'prestadora-de-servicos-de-som-e-iluminacao-de-teatro', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 13, TRUE),
  ('a0000002-0003-4000-8000-000000000014', 'PRESTADORA DE SERVIÇOS EM CENOGRAFIA', 'prestadora-de-servicos-em-cenografia', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 14, TRUE),
  ('a0000002-0003-4000-8000-000000000015', 'PRODUTORAS DE ESPETÁCULOS', 'produtoras-de-espetaculos', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 15, TRUE),
  ('a0000002-0003-4000-8000-000000000016', 'PRODUTOR CULTURAL', 'empresas-produtor-cultural', 2, 'a0000001-0000-4000-8000-000000000003', 'agent', 16, TRUE),
  ('a0000001-0000-4000-8000-000000000004', 'GRUPOS DE CULTURA (ASSOCIAÇÕES, COLETIVOS OU COOPERATIVAS)', 'grupos-de-cultura-associacoes-coletivos-ou-cooperativas', 1, NULL, 'agent', 4, TRUE),
  ('a0000002-0004-4000-8000-000000000001', 'AGREMIAÇÕES DE CARNAVAL', 'agremiacoes-de-carnaval', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 1, TRUE),
  ('a0000002-0004-4000-8000-000000000002', 'ASSOCIAÇÕES DE AMIGOS', 'associacoes-de-amigos', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 2, TRUE),
  ('a0000002-0004-4000-8000-000000000003', 'BANDA', 'banda', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 3, TRUE),
  ('a0000002-0004-4000-8000-000000000004', 'BLOCO DE CARNAVAL', 'bloco-de-carnaval', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 4, TRUE),
  ('a0000002-0004-4000-8000-000000000005', 'CIRCO', 'grupos-circo', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 5, TRUE),
  ('a0000002-0004-4000-8000-000000000006', 'CONJUNTO MUSICAL', 'conjunto-musical', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 6, TRUE),
  ('a0000002-0004-4000-8000-000000000007', 'CORAL', 'grupos-coral', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 7, TRUE),
  ('a0000002-0004-4000-8000-000000000008', 'ESCOLA DE SAMBA', 'escola-de-samba', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 8, TRUE),
  ('a0000002-0004-4000-8000-000000000009', 'GRUPO/ASSOCIAÇÃO/COLETIVO DE AMIGOS DA BANDA MUSICAL', 'grupo-associacao-coletivo-de-amigos-da-banda-musical', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 9, TRUE),
  ('a0000002-0004-4000-8000-000000000010', 'GRUPO/ASSOCIAÇÃO/COLETIVO DE AMIGOS DA BIBLIOTECA', 'grupo-associacao-coletivo-de-amigos-da-biblioteca', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 10, TRUE),
  ('a0000002-0004-4000-8000-000000000011', 'GRUPO/ASSOCIAÇÃO/COLETIVO DE AMIGOS DE MUSEU', 'grupo-associacao-coletivo-de-amigos-de-museu', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 11, TRUE),
  ('a0000002-0004-4000-8000-000000000012', 'GRUPO/ASSOCIAÇÃO/COLETIVO DE ARTESANATO', 'grupo-associacao-coletivo-de-artesanato', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 12, TRUE),
  ('a0000002-0004-4000-8000-000000000013', 'GRUPO DE ARTE DIGITAL', 'grupo-de-arte-digital', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 13, TRUE),
  ('a0000002-0004-4000-8000-000000000014', 'GRUPO DE ARTE VISUAL', 'grupo-de-arte-visual', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 14, TRUE),
  ('a0000002-0004-4000-8000-000000000015', 'GRUPO DE AUDIOVISUAL', 'grupo-de-audiovisual', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 15, TRUE),
  ('a0000002-0004-4000-8000-000000000016', 'GRUPO DE CAPOEIRA', 'grupo-de-capoeira', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 16, TRUE),
  ('a0000002-0004-4000-8000-000000000017', 'GRUPO DE CIRCO', 'grupo-de-circo', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 17, TRUE),
  ('a0000002-0004-4000-8000-000000000018', 'GRUPO DE DANÇA', 'grupo-de-danca', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 18, TRUE),
  ('a0000002-0004-4000-8000-000000000019', 'GRUPO DE DESIGN', 'grupo-de-design', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 19, TRUE),
  ('a0000002-0004-4000-8000-000000000020', 'GRUPO DE FOTOGRAFIA', 'grupo-de-fotografia', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 20, TRUE),
  ('a0000002-0004-4000-8000-000000000021', 'GRUPO DE LGBTQIA+', 'grupo-de-lgbtqiamais', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 21, TRUE),
  ('a0000002-0004-4000-8000-000000000022', 'GRUPO DE LIVRO E LEITURA', 'grupo-de-livro-e-leitura', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 22, TRUE),
  ('a0000002-0004-4000-8000-000000000023', 'GRUPO DE MODA', 'grupo-de-moda', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 23, TRUE),
  ('a0000002-0004-4000-8000-000000000024', 'GRUPO DE TEATRO', 'grupo-de-teatro', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 24, TRUE),
  ('a0000002-0004-4000-8000-000000000025', 'GRUPO PARAFOLCLÓRICO', 'grupo-parafolclorico', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 25, TRUE),
  ('a0000002-0004-4000-8000-000000000026', 'GRUPO RELACIONADO A PATRIMÔNIO CULTURAL', 'grupo-relacionado-a-patrimonio-cultural', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 26, TRUE),
  ('a0000002-0004-4000-8000-000000000027', 'ORQUESTRA', 'orquestra', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 27, TRUE),
  ('a0000002-0004-4000-8000-000000000028', 'OUTROS', 'grupos-outros', 2, 'a0000001-0000-4000-8000-000000000004', 'agent', 28, TRUE),
  ('a0000001-0000-4000-8000-000000000005', 'POVOS, COMUNIDADES OU GRUPOS TRADICIONAIS', 'povos-comunidades-ou-grupos-tradicionais', 1, NULL, 'agent', 5, TRUE),
  ('a0000002-0005-4000-8000-000000000001', 'COMUNIDADES DE CULTURAS ESTRANGEIRAS', 'comunidades-de-culturas-estrangeiras', 2, 'a0000001-0000-4000-8000-000000000005', 'agent', 1, TRUE),
  ('a0000002-0005-4000-8000-000000000002', 'CULTURA LGBTQIA+', 'cultura-lgbtqiamais', 2, 'a0000001-0000-4000-8000-000000000005', 'agent', 2, TRUE),
  ('a0000002-0005-4000-8000-000000000003', 'OUTRAS ETNIAS', 'outras-etnias', 2, 'a0000001-0000-4000-8000-000000000005', 'agent', 3, TRUE),
  ('a0000002-0005-4000-8000-000000000004', 'OUTROS', 'povos-outros', 2, 'a0000001-0000-4000-8000-000000000005', 'agent', 4, TRUE),
  ('a0000002-0005-4000-8000-000000000005', 'POVOS E COMUNIDADES TRADICIONAIS', 'povos-e-comunidades-tradicionais', 2, 'a0000001-0000-4000-8000-000000000005', 'agent', 5, TRUE),
  ('a0000002-0005-4000-8000-000000000006', 'POVOS INDÍGENAS', 'povos-indigenas', 2, 'a0000001-0000-4000-8000-000000000005', 'agent', 6, TRUE),
  ('a0000002-0005-4000-8000-000000000007', 'XAVANTE', 'xavante', 2, 'a0000001-0000-4000-8000-000000000005', 'agent', 7, TRUE)
ON CONFLICT (slug, context) DO UPDATE SET
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

-- Desativar a taxonomia antiga de agentes (migration 5), preservando o que já está em uso
-- (tipologias referenciadas por agentes e seus ancestrais continuam ativas).
WITH used AS (
  SELECT typology_id AS id FROM public.agent_typologies
), ancestors AS (
  SELECT t.id FROM public.cultural_typologies t WHERE t.id IN (SELECT id FROM used)
  UNION
  SELECT p.id FROM public.cultural_typologies p
    JOIN public.cultural_typologies c ON c.parent_id = p.id
    WHERE c.id IN (SELECT id FROM used)
  UNION
  SELECT gp.id FROM public.cultural_typologies gp
    JOIN public.cultural_typologies p ON p.parent_id = gp.id
    JOIN public.cultural_typologies c ON c.parent_id = p.id
    WHERE c.id IN (SELECT id FROM used)
)
UPDATE public.cultural_typologies t
SET is_active = FALSE
WHERE t.context = 'agent'
  AND t.id::text NOT LIKE 'a000000%'
  AND t.id NOT IN (SELECT id FROM ancestors);
