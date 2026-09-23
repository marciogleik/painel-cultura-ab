# Resumo das Alterações (Agente Gemini - Set/2026)
**Para o Claude e desenvolvedores futuros:**

## 1. Banco de Dados e Migrations
- **Migration 10 (`agent_ratings`)**: Executada na base de produção. A tabela `agent_ratings` foi criada e a view `public_cultural_agents` foi atualizada para incluir a média de estrelas (`average_rating` calculada como `ROUND(AVG(rating), 1)`) e o total de avaliações (`total_ratings`). Isso corrige a "Tela Branca" ao clicar em um agente e posiciona agentes 5 estrelas no topo da página inicial.
- **Migration 11 (`fix_workshop_enrollments_student_id`)**: A FK do `student_id` estava apontando para a tabela errada. Foi corrigida para apontar para `workshop_enrollments`.
- **Triggers e Policies**: Adicionada verificação rigorosa no RPC `submit_agent` para garantir preenchimento de campos obrigatórios (status submetido). Implementadas as proteções de Tabela (`audit_logs` e `agent_notifications` restritas apenas para Admins). Forçada a leitura pública de agentes apenas via view `public_cultural_agents`.
- **Auto-aceite de Convites**: Configurado auto-accept caso o email do convite coincida com quem cria.

## 2. Limpeza de Dados E2E
- Foram removidos todos os registros gerados pelo teste de ponta-a-ponta (`[E2E-TESTE]`).
- A exclusão exigiu uma limpeza em cascata envolvendo remoção de produtos culturais, associações (memberships), tipologias e endereços, para não ferir as restrições de Foreign Keys. Os usuários fakes também foram removidos do `auth.users`.

## 3. Frontend (UI e Componentes)
- **`ArtistProfilePage.tsx`**: Adicionado `window.scrollTo(0, 0)` ao montar o componente para que o usuário caia diretamente no topo do perfil ao invés do rodapé.
- **`HomePage.tsx` & `ResetPasswordPage.tsx`**: Corrigido o link "Esqueci minha senha" (apontava pro caminho errado) e travada a rota de recuperar-senha para ser acessível apenas com os tokens válidos da URL.
- **`AdminSymbols.tsx`**: O `DOMPurify` foi ajustado para permitir tags `<iframe>`. Isso impede que os vídeos do Youtube embutidos sejam removidos ao salvar os símbolos (Ex: Hinos).
- **`Step9Revisao.tsx` e `WorkshopEnrollmentPage.tsx`**: Corrigidos diversos erros do Typescript (`TS6133`, `TS2339`) envolvendo variáveis não utilizadas (`canSubmit`, `toRemove`) e checagem de tipos ausentes nas interfaces (`vacancies`, `cpf`). O build de produção do Vite e TSC agora passa sem erros.

## 4. Deploy
- O código com todas essas correções foi compilado (`npm run build`) e comitado no Github (branch `main`).
- O script FTP (`npm run deploy` que invoca `deploy_ftp.py`) foi acionado e todos os arquivos atualizados (103 arquivos na pasta `dist`) foram enviados para o servidor de hospedagem `cultura.aguaboa.mt.gov.br`.
