const http = require('http');

const routes = [
  '/',
  '/pesquisa',
  '/artistas',
  '/editais',
  '/produtos',
  '/espacos',
  '/eventos',
  '/projetos',
  '/biblioteca',
  '/oficinas',
  '/oficinas/matricula',
  '/simbolos',
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/painel',
  '/painel/agentes',
  '/painel/agentes/cadastrar',
  '/admin',
  '/admin/agentes',
  '/admin/editais',
  '/admin/inscricoes',
  '/admin/usuarios',
  '/admin/indicadores',
  '/admin/espacos',
  '/admin/eventos',
  '/admin/projetos',
  '/admin/oficinas',
  '/admin/biblioteca',
  '/admin/simbolos',
  '/admin/produtos',
  '/admin/matriculas',
  '/admin/site',
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5173${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          path,
          statusCode: res.statusCode,
          hasHtml: body.includes('<div id="root">') || body.includes('<!DOCTYPE html>'),
        });
      });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function runRouteTests() {
  console.log('=== TESTANDO ROTAS DO SERVIDOR VITE (http://localhost:5173) ===\n');
  let failures = 0;
  for (const r of routes) {
    const res = await checkRoute(r);
    if (res.error) {
      console.log(`❌ [${r}]: Falha de conexão -> ${res.error}`);
      failures++;
    } else if (res.statusCode === 200 && res.hasHtml) {
      console.log(`✅ [${r}]: 200 OK (HTML renderizado)`);
    } else {
      console.log(`⚠️ [${r}]: Status ${res.statusCode}`);
      failures++;
    }
  }
  console.log(`\nResultado: ${routes.length - failures} rotas OK, ${failures} falhas.`);
}

runRouteTests();
