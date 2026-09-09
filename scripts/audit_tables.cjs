const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!url || !key) {
  console.error('Supabase URL ou Key não encontrados no .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function testAllModules() {
  console.log('====================================================');
  console.log('   AUDITORIA GERAL DE BANCO & MÓDULOS CULTURAIS    ');
  console.log('====================================================\n');

  const tables = [
    { name: 'carousel_images', module: 'Home / Carrossel Principal' },
    { name: 'categories', module: 'Home & Editais / Categorias' },
    { name: 'subcategories', module: 'Filtros / Subcategorias' },
    { name: 'cultural_typologies', module: 'SMIIC / Tipologias Oficiais' },
    { name: 'cultural_agents', module: 'SMIIC / Agentes Culturais' },
    { name: 'agent_addresses', module: 'SMIIC / Endereços dos Agentes' },
    { name: 'artists', module: 'Legado / Artistas' },
    { name: 'editais', module: 'Editais & Oportunidades' },
    { name: 'inscriptions', module: 'Inscrições em Editais' },
    { name: 'cultural_products', module: 'Feira / Produtos Culturais' },
    { name: 'cultural_events', module: 'Agenda / Eventos Culturais' },
    { name: 'cultural_spaces', module: 'Mapeamento / Espaços Culturais' },
    { name: 'cultural_projects', module: 'Projetos Culturais' },
    { name: 'workshops', module: 'Oficinas e Cursos' },
    { name: 'workshop_enrollments', module: 'Matrículas em Oficinas' },
    { name: 'library_items', module: 'Biblioteca Digital' },
    { name: 'municipal_symbols', module: 'Símbolos Municipais' },
    { name: 'profiles', module: 'Autenticação / Perfis de Usuários' },
  ];

  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ [${t.module}] (${t.name}): ERRO -> ${error.message} (${error.code})`);
      } else {
        console.log(`✅ [${t.module}] (${t.name}): OK -> ${count ?? 0} registros`);
      }
    } catch (e) {
      console.log(`⚠️ [${t.module}] (${t.name}): EXCEÇÃO -> ${e.message}`);
    }
  }

  console.log('\n====================================================');
  console.log('Auditoria de tabelas concluída.');
  console.log('====================================================\n');
}

testAllModules();
