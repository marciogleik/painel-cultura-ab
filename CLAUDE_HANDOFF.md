# Resumo de Atualizações e Arquitetura - SMIIC Água Boa
**Para: Claude (Claude Code) / Assistente de Continuidade**
**Data/Hora:** 17 de Setembro de 2026

Olá, Claude! O usuário solicitou que eu documentasse todas as alterações recentes e o estado atual do projeto para que você possa assumir ou auxiliar em futuras demandas com total contexto.

Abaixo está o resumo do que foi construído, modificado e as decisões de arquitetura recentes:

## 1. Banco de Dados e MCP (Supabase)
O banco de dados é gerido via Supabase na nuvem. Nós conectamos via MCP e rodamos uma atualização importante recentemente.

### Sistema de Avaliação (Estrelas)
- **Tabela Criada:** `agent_ratings` (composta por `agent_id`, `evaluator_id`, `rating` de 1 a 5).
- **View Atualizada:** A view `public_cultural_agents` foi recriada para injetar os cálculos `average_rating` (AVG) e `total_ratings` (COUNT) para cada agente público aprovado.
- **Segurança (RLS):** Usuários autenticados podem inserir/atualizar sua própria avaliação (1 nota por usuário por agente).
- **Importante:** O arquivo `supabase/migrations/20260917000010_agent_ratings.sql` existe localmente como backup/referência da migração, mas as alterações **já foram aplicadas em produção** no banco de dados através do MCP.

## 2. Frontend (React / TypeScript / Tailwind)

### Ajustes Globais e de UX
- **Modo Escuro (Dark Mode) Removido:** O usuário pediu para remover completamente o site escuro. O `ThemeContext` foi forçado para `light`, os botões de toggle de tema foram removidos e o CSS `index.css` foi ajustado para remover inversões de cores. O site agora é 100% branco/claro.
- **Scroll To Top:** Criado o componente `ScrollToTop.tsx` e importado no `App.tsx` (`<BrowserRouter>`) para garantir que ao navegar entre perfis e páginas, o React Router jogue o usuário para o topo da página (antes ficava preservando o scroll da Home).

### Home Page e Destaques
- **Ordenação:** A seção "Agentes Culturais em Destaque" na `HomePage.tsx` agora usa a query `getPublicAgents({ pageSize: 6, sort: 'rating' })`.
- O cache do React Query da chave `['home-featured-agents']` dita a ordem de quem tem as maiores médias.

### Perfil do Agente (`ArtistProfilePage.tsx`)
- Implementada interface de "Estrelas" (1 a 5). 
- O componente agora exibe a nota do banco. Visitantes vêem a nota mas não podem interagir. Usuários logados podem clicar nas estrelas.
- Ao avaliar um agente (`rateMutation`), o cache da home (`['home-featured-agents']`) é invalidado no `onSuccess` para que o ranking atualize imediatamente. Há um fallback seguro `?? 0` na renderização caso o backend mande o valor `undefined` pelo cache desatualizado.

### Painel Administrativo de Agentes (`AdminAgentes.tsx`)
- Melhorias de **Legibilidade e Responsividade**: 
  - Cartões de estatísticas superiores (`AgentStatsCards.tsx`) tiveram a fonte aumentada e ícones remodelados.
  - A tabela administrativa (`AdminTable.tsx`) recebeu maior preenchimento (padding) nas colunas para a leitura não ficar "massante".
  - A exibição das tipologias no `AgentTable.tsx` foi ajustada para quebrar linhas (`whitespace-normal text-left break-words`) em vez de cortar o texto com `truncate`. 
  - As pílulas (badges) globais no `index.css` ganharam mais espaçamento interno para melhorar o aspecto premium.

## 3. Próximos Passos ou Dicas de Contexto
- A aplicação usa `react-query` para state management de dados. Tenha cuidado ao fazer mutations (sempre invalide ou atualize o cache de forma otimista).
- Autenticação e Storage estão 100% baseados no cliente Supabase (`@supabase/supabase-js`).
- O usuário já mencionou que vai linkar você (Claude) no projeto dele via MCP para rodar e visualizar queries no Supabase diretamente, então sinta-se livre para usar o servidor MCP "supabase" se já estiver configurado no seu ambiente.

Qualquer dúvida técnica que encontrar, confira o `src/types/index.ts` que possui as tipagens mapeadas das tabelas e views principais.

Bom trabalho!
