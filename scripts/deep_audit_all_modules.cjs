const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function deepAudit() {
  console.log('================================================================');
  console.log('         AUDITORIA COMPLETA DE CADA MÓDULO DA PLATAFORMA        ');
  console.log('================================================================\n');

  const tests = [
    {
      name: '1. Módulo Institucional: Identidade e Carrossel',
      fn: async () => {
        const { data, error } = await supabase.from('carousel_images').select('*').eq('is_active', true);
        if (error) throw error;
        return `${data.length} banners ativos configurados`;
      }
    },
    {
      name: '2. Módulo Institucional: Símbolos Cívicos de Água Boa',
      fn: async () => {
        const { data, error } = await supabase.from('municipal_symbols').select('*').eq('is_active', true);
        if (error) throw error;
        return `${data.length} símbolos municipais (Bandeira, Brasão, Hino)`;
      }
    },
    {
      name: '3. Módulo SMIIC: Árvore Taxonômica de Tipologias',
      fn: async () => {
        const { data: l1, error: e1 } = await supabase.from('cultural_typologies').select('*').eq('level', 1);
        const { data: l2, error: e2 } = await supabase.from('cultural_typologies').select('*').eq('level', 2);
        if (e1 || e2) throw e1 || e2;
        return `${l1.length} Macroáreas (Nível 1) e ${l2.length} Subcategorias (Nível 2)`;
      }
    },
    {
      name: '4. Módulo Cultural: Categorias Artísticas Principais',
      fn: async () => {
        const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
        if (error) throw error;
        return `${data.length} áreas artísticas ativas (Música, Teatro, Literatura, etc.)`;
      }
    },
    {
      name: '5. Módulo Fomento: Editais e Chamadas Públicas',
      fn: async () => {
        const { data, error } = await supabase.from('editais').select('id, title, status, end_date');
        if (error) throw error;
        return `${data.length} editais no sistema`;
      }
    },
    {
      name: '6. Módulo Difusão: Espaços Culturais de Água Boa',
      fn: async () => {
        const { data, error } = await supabase.from('cultural_spaces').select('id, name');
        if (error) throw error;
        return `${data.length} espaços culturais cadastrados`;
      }
    },
    {
      name: '7. Módulo Difusão: Agenda Cultural e Eventos',
      fn: async () => {
        const { data, error } = await supabase.from('cultural_events').select('id, title, start_date');
        if (error) throw error;
        return `${data.length} eventos na programação`;
      }
    },
    {
      name: '8. Módulo Formação: Projetos Culturais',
      fn: async () => {
        const { data, error } = await supabase.from('cultural_projects').select('id, title');
        if (error) throw error;
        return `${data.length} projetos culturais cadastrados`;
      }
    },
    {
      name: '9. Módulo Formação: Oficinas Culturais e Matrículas',
      fn: async () => {
        const { data: w, error: ew } = await supabase.from('cultural_workshops').select('id, title');
        const { data: m, error: em } = await supabase.from('workshop_enrollments').select('id');
        if (ew || em) throw ew || em;
        return `${w.length} oficinas cadastradas e ${m.length} inscrições realizadas`;
      }
    },
    {
      name: '10. Módulo Literatura: Biblioteca Digital Municipal',
      fn: async () => {
        const { data, error } = await supabase.from('library_books').select('id, title');
        if (error) throw error;
        return `${data.length} livros/obras no acervo digital`;
      }
    },
    {
      name: '11. Módulo Economia Criativa: Feira de Produtos',
      fn: async () => {
        const { data, error } = await supabase.from('cultural_products').select('id, title');
        if (error) throw error;
        return `${data.length} produtos culturais cadastrados`;
      }
    },
    {
      name: '12. Módulo Agentes: Tabela cultural_agents e Relações',
      fn: async () => {
        const { data, error } = await supabase
          .from('cultural_agents')
          .select(`
            id, display_name, registration_status, is_public,
            agent_typologies(cultural_typologies(name, level)),
            agent_areas(categories(name))
          `);
        if (error) throw error;
        return `${data.length} agentes culturais com tipologias e categorias vinculadas`;
      }
    },
  ];

  let pass = 0;
  let fail = 0;

  for (const t of tests) {
    try {
      const details = await t.fn();
      console.log(`✅ [OK] ${t.name} -> ${details}`);
      pass++;
    } catch (err) {
      console.log(`❌ [ERRO] ${t.name} -> ${err.message}`);
      fail++;
    }
  }

  console.log('\n================================================================');
  console.log(`AUDITORIA CONCLUÍDA: ${pass} SUCESSOS, ${fail} FALHAS`);
  console.log('================================================================\n');

  if (fail > 0) process.exit(1);
}

deepAudit();
