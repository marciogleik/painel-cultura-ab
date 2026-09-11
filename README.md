# Plataforma Municipal de Cultura — Água Boa/MT (SMIIC)

Sistema Municipal de Informações e Indicadores Culturais da Secretaria de Esporte, Cultura, Lazer e Eventos da Prefeitura Municipal de Água Boa. Cadastro e homologação de agentes culturais, mapa cultural público, editais com inscrição, espaços, eventos, projetos, oficinas com ficha de matrícula, biblioteca, símbolos municipais, produtos culturais e CMS do site.

## Stack

- React 19 + TypeScript + Vite 8, Tailwind v4, React Query, react-hook-form + zod
- Supabase (Postgres + Auth + Storage), acessado direto do navegador com Row Level Security
- Sem backend próprio: as regras de negócio sensíveis vivem no banco (políticas, triggers e funções RPC)

## Rodando localmente

```bash
cp .env.example .env      # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev               # http://localhost:5173
```

Verificações:

```bash
npm run typecheck   # tsc
npm run lint        # oxlint
npm test            # vitest (utilitários de data, CPF/CNPJ, sanitização)
npm run build       # gera dist/
```

## Estrutura

```
src/
  App.tsx                  rotas (carregadas sob demanda) e provedores
  contexts/                AuthContext (sessão + perfil + papéis), ThemeContext
  services/                acesso ao Supabase: culturalAgentService, editalService
  hooks/                   useMyAgents, useCrud (CRUD genérico do admin), useStorageUpload
  components/ui/           Modal, ConfirmDialog, Toast, EmptyState, PageHeader, SearchInput, Spinner
  components/layout/       PublicLayout (site) e AppLayout (painéis)
  pages/public/            site público
  pages/auth/              login, cadastro, esqueci/redefinir senha
  pages/agente/            wizard de cadastro do agente cultural (9 passos), meus agentes, detalhe
  pages/artist/            painel: dashboard, inscrições, produtos, privacidade
  pages/admin/             painel administrativo
  lib/utils.ts             datas locais, máscaras/validação de CPF-CNPJ, sanitização, erros
supabase/migrations/       schema, políticas, funções e seeds
scripts/                   deploy por FTP e scripts de verificação
```

## Papéis

| Papel | O que pode |
|---|---|
| USUARIO_PUBLICO / ARTISTA | Painel do agente cultural: cadastrar agentes, inscrever-se em editais, produtos, privacidade |
| SERVIDOR | Tudo acima + leitura do painel administrativo |
| GESTOR, ADMIN_CULTURA, SUPER_ADMIN | Escrita no painel administrativo e homologação (`is_admin()` no banco) |

Ninguém altera o próprio papel: um trigger em `profiles` bloqueia; só administradores mudam papéis, e só um SUPER_ADMIN concede SUPER_ADMIN.

## Modelo de dados do agente cultural

- `cultural_agents` guarda dados públicos e privados (CPF, CNPJ, nascimento, gênero, raça). A tabela só é legível pelo dono, membros e servidores.
- O site público lê a **view `public_cultural_agents`**, que expõe apenas o que pode ser visto por qualquer pessoa (telefone só quando "exibir contato" está ligado, currículo só quando liberado, cidade/UF sempre, bairro conforme privacidade).
- Status de homologação (`registration_status`) só muda por RPC: `submit_agent` (o agente envia; o banco valida o mínimo do manual SMIIC) e `review_agent` (a Secretaria aprova, devolve, coloca em análise ou suspende; o dono é notificado).
- Convites para agentes coletivos: `invite_agent_member` e `respond_agent_invite`.
- Mudanças de status, papel e CPF ficam em `audit_logs` (escrito por trigger).

## Storage

| Bucket | Conteúdo | Leitura | Escrita |
|---|---|---|---|
| `site-media` | carrossel, capas, PDFs de editais, mídia do CMS | pública | administradores |
| `media` | fotos de agentes em `agents/<id>/` | pública | membros admin do agente |
| `agent-files` | currículos em `curriculos/<id>/` | membros, servidores e, se liberado, público via URL assinada | membros admin do agente |

## Migrations

Os arquivos em `supabase/migrations/` são a fonte de verdade. Para aplicar em um projeto:

```bash
supabase link --project-ref <ref>
supabase db push
```

Ou cole cada arquivo, em ordem, no SQL Editor do dashboard. As migrations 6 a 9 são idempotentes (podem ser reaplicadas). Notas:

- A migration 7 substitui a taxonomia de agentes pela oficial do SMIIC (5 macroáreas e 143 categorias) e desativa a antiga, preservando itens já usados.
- A migration 8 documenta um trigger de auto-confirmação de e-mail que existe apenas em produção (`trg_auto_confirm_user`). Ele não é recriado pelo repositório: é uma decisão de produto a revisar.
- Depois de aplicar, gere os tipos: `supabase gen types typescript --linked > src/types/database.ts`.

## Deploy

`npm run deploy` faz o build e envia `dist/` por FTP (ver `scripts/deploy_ftp.py`). O `.htaccess` em `public/` cuida do fallback da SPA, HTTPS, cache e compressão.

## Referência

`Manual_Agente_SMIIC_Antigravity.md` descreve o fluxo funcional do SMIIC (SECTUR, Campo Grande/MS) que serve de base para o cadastro de agentes, espaços, eventos e projetos.
