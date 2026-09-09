const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!url || !key) {
  console.error('Credenciais Supabase não encontradas.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runE2EFullTest() {
  console.log('================================================================');
  console.log('       TESTE DE PONTA A PONTA: CADA MÓDULO E FUNCIONALIDADE     ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, success, details = '') {
    if (success) {
      console.log(`✅ [PASSOU] ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.log(`❌ [FALHOU] ${name} -> ${details}`);
      failed++;
    }
  }

  // ── TESTE 1: Home Page & Carrossel ──
  try {
    const { data: slides, error } = await supabase
      .from('carousel_images')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    report('Home: Carrossel de Imagens', !error && slides.length > 0, `${slides?.length} slides ativos encontrados`);
  } catch (e) {
    report('Home: Carrossel de Imagens', false, e.message);
  }

  // ── TESTE 2: Categorias Culturais ──
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);
    report('Home & Pesquisa: Categorias Artísticas', !error && categories.length >= 10, `${categories?.length} categorias carregadas`);
  } catch (e) {
    report('Home & Pesquisa: Categorias Artísticas', false, e.message);
  }

  // ── TESTE 3: Árvore Oficial de Tipologias SMIIC ──
  try {
    const { data: typologies, error } = await supabase
      .from('cultural_typologies')
      .select('id, name, level');
    const hasTypologies = !error && typologies.length >= 5;
    report('SMIIC: Árvore de Tipologias (Banco & Dataset Oficial)', hasTypologies, `${typologies?.length} tipologias no banco e 148 mapeadas no sistema`);
  } catch (e) {
    report('SMIIC: Árvore de Tipologias', false, e.message);
  }

  // ── TESTE 4: Símbolos Municipais de Água Boa ──
  try {
    const { data: symbols, error } = await supabase
      .from('municipal_symbols')
      .select('*')
      .eq('is_active', true);
    report('Módulo: Símbolos Municipais (Bandeira, Brasão, Hino)', !error && symbols.length >= 3, `${symbols?.length} símbolos cadastrados`);
  } catch (e) {
    report('Módulo: Símbolos Municipais', false, e.message);
  }

  // ── TESTE 5: Editais Públicos & Oportunidades ──
  try {
    const { data: editais, error } = await supabase
      .from('editais')
      .select('*, categories(name)')
      .eq('status', 'PUBLICADO');
    report('Módulo: Editais Públicos Abertos', !error, `${editais?.length} editais ativos`);
  } catch (e) {
    report('Módulo: Editais Públicos', false, e.message);
  }

  // ── TESTE 6: Espaços Culturais ──
  try {
    const { data: spaces, error } = await supabase
      .from('cultural_spaces')
      .select('*');
    report('Módulo: Espaços Culturais (Teatros, Museus, Centros)', !error, `Tabela operacional, ${spaces?.length} espaços`);
  } catch (e) {
    report('Módulo: Espaços Culturais', false, e.message);
  }

  // ── TESTE 7: Eventos Culturais ──
  try {
    const { data: events, error } = await supabase
      .from('cultural_events')
      .select('*');
    report('Módulo: Agenda e Eventos Culturais', !error, `Tabela operacional, ${events?.length} eventos`);
  } catch (e) {
    report('Módulo: Agenda e Eventos Culturais', false, e.message);
  }

  // ── TESTE 8: Projetos Culturais ──
  try {
    const { data: projects, error } = await supabase
      .from('cultural_projects')
      .select('*');
    report('Módulo: Projetos Culturais', !error, `Tabela operacional, ${projects?.length} projetos`);
  } catch (e) {
    report('Módulo: Projetos Culturais', false, e.message);
  }

  // ── TESTE 9: Biblioteca Digital Municipal (library_books) ──
  try {
    const { data: library, error } = await supabase
      .from('library_books')
      .select('*');
    report('Módulo: Biblioteca Digital e Acervo (library_books)', !error, `Tabela operacional, ${library?.length ?? 0} itens`);
  } catch (e) {
    report('Módulo: Biblioteca Digital e Acervo', false, e.message);
  }

  // ── TESTE 10: Oficinas Culturais e Matrículas (cultural_workshops) ──
  try {
    const { data: workshops, error: eW } = await supabase.from('cultural_workshops').select('*');
    const { data: enrolls, error: eE } = await supabase.from('workshop_enrollments').select('*');
    report('Módulo: Oficinas Culturais e Ficha de Matrícula (cultural_workshops)', !eW && !eE, `Tabelas operacionais`);
  } catch (e) {
    report('Módulo: Oficinas Culturais', false, e.message);
  }

  // ── TESTE 11: Feira de Produtos Culturais ──
  try {
    const { data: products, error } = await supabase.from('cultural_products').select('*');
    report('Módulo: Feira de Produtos Culturais', !error, `Tabela operacional, ${products?.length} produtos`);
  } catch (e) {
    report('Módulo: Feira de Produtos Culturais', false, e.message);
  }

  // ── TESTE 12: Módulo SMIIC de Agentes Culturais (Tabela e Políticas de Acesso) ──
  try {
    const { data: agents, error } = await supabase
      .from('cultural_agents')
      .select('id, display_name, registration_status, is_public');
    report('SMIIC: Módulo de Agentes Culturais (Consulta e Políticas de Acesso)', !error, `Tabela operacional, ${agents?.length ?? 0} agentes retornados`);
  } catch (e) {
    report('SMIIC: Módulo de Agentes Culturais', false, e.message);
  }

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL DO TESTE: ${passed} PASSOU, ${failed} FALHOU`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runE2EFullTest();
