# Barbearia App - Sistema de Agendamento

Sistema completo de agendamento para barbearias com suporte a múltiplos usuários (Owner, Barber, Client).

## 🚀 Estrutura do Projeto

Este projeto é exclusivamente o **APP/SISTEMA** de agendamento. O site público da barbearia é um projeto separado.

### Fluxo de Acesso

```
ABRIR APP (/)
    ↓
Usuário autenticado?
    ↓
SIM → Identificar role → Redirecionar para painel
NÃO → Mostrar LOGIN (/login)
    ↓
E-mail + Senha
    ↓
Autenticar → Buscar role
    ↓
┌────────────┼────────────┐
↓            ↓            ↓
OWNER       BARBER       CLIENT
    ↓            ↓            ↓
/app/dashboard  /app/agenda  /cliente
```

## 👥 Tipos de Usuário

### OWNER (Dono/Administrador)
- **Rota padrão**: `/app/dashboard`
- **Acesso a**:
  - Dashboard com métricas
  - Agenda completa da barbearia
  - Equipe (gerenciar funcionários)
  - Clientes
  - Serviços
  - Financeiro
  - Personalização
  - Configurações

### BARBER (Funcionário/Barbeiro)
- **Rota padrão**: `/app/agenda`
- **Acesso a**:
  - Agenda pessoal
  - Próximos clientes
  - Horários de trabalho
  - Serviços oferecidos
  - Histórico de atendimentos
  - Perfil profissional

### CLIENT (Cliente)
- **Rota padrão**: `/cliente`
- **Acesso a**:
  - Próximo agendamento
  - Meus agendamentos
  - Histórico
  - Perfil
  - Iniciar novo agendamento

## 🔐 Autenticação

### Login Único
Todos os usuários utilizam a **mesma tela de login** em `/login`.

**NÃO há seleção de tipo de usuário.** O sistema identifica automaticamente a role através do banco de dados.

### Cadastro de Cliente
Quando um usuário se cadastra, ele recebe automaticamente `role = CLIENT`.

### Contas OWNER e BARBER
São configuradas manualmente no Supabase pelo administrador do sistema.

## 🛠️ Configuração

### 1. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Execute o script SQL em `supabase/schema.sql` no SQL Editor
3. Copie as credenciais em Settings > API

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**IMPORTANTE**: Use a chave `anon` ou `public`, NUNCA a `service_role`.

### 3. Instalar Dependências

```bash
npm install
```

### 4. Executar o Projeto

```bash
npm run dev
```

Acesse `http://localhost:5173`

## 👤 Criar Contas de Teste

### Conta OWNER (Administrador)

1. No Supabase, vá em **Authentication** > **Users**
2. Clique em **"Add user"** > **"Create new user"**
3. Preencha:
   - Email: `admin@barbearia.com`
   - Password: `admin123`
   - ✅ Marque "Auto Confirm User"
4. Copie o **User UID**
5. No SQL Editor, execute:

```sql
INSERT INTO profiles (id, barbershop_id, role, full_name, phone)
VALUES (
  'COLE_O_USER_UID_AQUI',
  (SELECT id FROM barbershops WHERE slug = 'barbearia-demo'),
  'OWNER',
  'Administrador',
  '+5511999999999'
);
```

### Conta BARBER (Funcionário)

1. Repita o processo acima com:
   - Email: `barber@barbearia.com`
   - Password: `barber123`
2. Copie o User UID
3. Execute no SQL:

```sql
INSERT INTO profiles (id, barbershop_id, role, full_name, phone)
VALUES (
  'COLE_O_USER_UID_AQUI',
  (SELECT id FROM barbershops WHERE slug = 'barbearia-demo'),
  'BARBER',
  'João Barbeiro',
  '+5511888888888'
);
```

### Conta CLIENT (Cliente)

O cliente pode se cadastrar diretamente pela tela de login clicando em "Criar conta".

## 🧪 Testes Obrigatórios

### TESTE 1 — OWNER
1. Acesse `/`
2. Login com `admin@barbearia.com` / `admin123`
3. **Resultado esperado**: Redirecionar para `/app/dashboard`

### TESTE 2 — BARBER
1. Faça logout
2. Login com `barber@barbearia.com` / `barber123`
3. **Resultado esperado**: Redirecionar para `/app/agenda`

### TESTE 3 — CLIENT
1. Faça logout
2. Clique em "Criar conta"
3. Preencha os dados e crie a conta
4. **Resultado esperado**: Redirecionar para `/cliente`

### TESTE 4 — Proteção de Rotas (BARBER)
1. Com BARBER logado, tente acessar:
   - `/app/dashboard`
   - `/app/equipe`
   - `/app/financeiro`
2. **Resultado esperado**: Redirecionar para `/app/agenda`

### TESTE 5 — Proteção de Rotas (CLIENT)
1. Com CLIENT logado, tente acessar:
   - `/app/dashboard`
   - `/app/equipe`
2. **Resultado esperado**: Redirecionar para `/cliente`

### TESTE 6 — Usuário Deslogado
1. Faça logout
2. Tente acessar `/app/dashboard` diretamente
3. **Resultado esperado**: Redirecionar para `/login`

## 📁 Estrutura de Arquivos

```
src/
├── components/
│   └── ProtectedRoute.tsx      # Proteção de rotas por role
├── contexts/
│   └── AuthContext.tsx         # Contexto de autenticação
├── lib/
│   └── supabase.ts            # Cliente Supabase
├── pages/
│   ├── InternalLogin.tsx      # Tela de login única
│   ├── InternalLayout.tsx     # Layout dos painéis Owner/Barber
│   ├── ClientArea.tsx         # Área do cliente
│   ├── owner/                 # Páginas do OWNER
│   │   ├── Dashboard.tsx
│   │   ├── Team.tsx
│   │   ├── Clients.tsx
│   │   ├── Services.tsx
│   │   ├── Financial.tsx
│   │   ├── Customization.tsx
│   │   └── Settings.tsx
│   ├── barber/                # Páginas do BARBER
│   │   ├── Agenda.tsx
│   │   ├── NextClients.tsx
│   │   ├── Schedule.tsx
│   │   ├── Services.tsx
│   │   ├── History.tsx
│   │   └── Profile.tsx
│   └── shared/                # Páginas compartilhadas
│       ├── Agenda.tsx
│       └── Services.tsx
├── types/
│   └── database.ts           # Tipos TypeScript
└── App.tsx                   # Rotas principais
```

## 🛡️ Segurança

### Frontend
- Proteção de rotas por role
- Redirecionamento automático baseado na role
- Validação de permissões antes de renderizar

### Backend (Supabase RLS)
- **OWNER**: acesso completo à sua barbearia
- **BARBER**: acesso apenas aos seus agendamentos e clientes
- **CLIENT**: acesso apenas aos seus próprios dados
- **Isolamento total** entre barbearias (multi-tenant)

## 🔄 Rotas

### Públicas
- `/` → Redireciona baseado no estado de autenticação
- `/login` → Tela de login/cadastro

### OWNER
- `/app/dashboard` → Dashboard administrativo
- `/app/agenda` → Agenda completa
- `/app/equipe` → Gerenciar funcionários
- `/app/clientes` → Gerenciar clientes
- `/app/servicos` → Gerenciar serviços
- `/app/financeiro` → Relatórios financeiros
- `/app/personalizacao` → Personalizar barbearia
- `/app/configuracoes` → Configurações gerais

### BARBER
- `/app/agenda` → Agenda pessoal
- `/app/proximos-clientes` → Próximos clientes
- `/app/horarios` → Horários de trabalho
- `/app/servicos` → Serviços oferecidos
- `/app/historico` → Histórico de atendimentos
- `/app/perfil` → Perfil profissional

### CLIENT
- `/cliente` → Dashboard do cliente
- `/cliente/agendar` → Iniciar agendamento
- `/cliente/agendamentos` → Meus agendamentos
- `/cliente/perfil` → Meu perfil

## 📊 Banco de Dados

### Tabelas Principais
- `barbershops` → Barbearias (multi-tenant)
- `profiles` → Perfis de usuários (OWNER, BARBER, CLIENT)
- `services` → Serviços oferecidos
- `appointments` → Agendamentos

### Row Level Security (RLS)
Todas as tabelas têm políticas de acesso configuradas para garantir isolamento entre barbearias e controle de acesso por role.

## 🚀 Próximos Passos

- [ ] Implementar fluxo completo de agendamento
- [ ] Sistema de convite para barbeiros
- [ ] Notificações push
- [ ] Relatórios financeiros completos
- [ ] Integração com gateway de pagamento
- [ ] Sistema de avaliações
- [ ] Chat em tempo real

## 📝 Notas

- As credenciais de teste são apenas para desenvolvimento
- Em produção, use senhas fortes e autenticação de dois fatores
- O sistema está preparado para multi-tenant (múltiplas barbearias)
- Todas as queries são validadas pelo RLS do Supabase
- O site público da barbearia é um projeto separado

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs no Supabase
3. Consulte a [documentação do Supabase](https://supabase.com/docs)

## 📄 Licença

Este projeto é proprietário e confidencial.
