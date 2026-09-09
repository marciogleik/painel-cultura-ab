const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function syncAllTypologies() {
  console.log('Iniciando sincronização completa de 148 tipologias no Supabase...');

  // Extrai o JSON de smiicTypologies.ts
  const content = fs.readFileSync('src/data/smiicTypologies.ts', 'utf-8');
  const equalsIdx = content.indexOf('=');
  const startIdx = content.indexOf('[', equalsIdx);
  const endIdx = content.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) {
    console.error('Array não encontrado.');
    process.exit(1);
  }

  const typologies = JSON.parse(content.substring(startIdx, endIdx + 1));
  console.log(`Carregadas ${typologies.length} macroáreas com suas subcategorias.`);

  let insertedMacros = 0;
  let insertedSubs = 0;

  for (const macro of typologies) {
    // Insere Macroárea (Nível 1)
    const { error: eMacro } = await supabase.from('cultural_typologies').upsert({
      id: macro.id,
      name: macro.name,
      slug: macro.slug,
      level: macro.level,
      parent_id: null,
      context: macro.context,
      is_active: true,
      sort_order: macro.sort_order,
    }, { onConflict: 'slug,context' });

    if (eMacro) {
      console.log(`Erro ao inserir macro ${macro.name}:`, eMacro.message);
    } else {
      insertedMacros++;
    }

    // Insere Subcategorias (Nível 2)
    if (macro.children && macro.children.length > 0) {
      for (const sub of macro.children) {
        const { error: eSub } = await supabase.from('cultural_typologies').upsert({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          level: sub.level,
          parent_id: sub.parent_id,
          context: sub.context,
          is_active: true,
          sort_order: sub.sort_order,
        }, { onConflict: 'slug,context' });

        if (eSub) {
          console.log(`Erro ao inserir subcategoria ${sub.name} (${sub.slug}):`, eSub.message);
        } else {
          insertedSubs++;
        }
      }
    }
  }

  console.log(`\nSincronização concluída com sucesso!`);
  console.log(`- Macroáreas: ${insertedMacros}`);
  console.log(`- Subcategorias: ${insertedSubs}`);
  console.log(`- Total de Tipologias cadastradas: ${insertedMacros + insertedSubs}`);
}

syncAllTypologies();
