# Guia de Configuração do Supabase

Este guia vai te ajudar a configurar o Supabase para o sistema da Barbearia Oliveira.

## 📋 Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Name**: Barbearia Oliveira (ou o nome que preferir)
   - **Database Password**: Crie uma senha forte e guarde
   - **Region**: Escolha a mais próxima (ex: South America)
5. Aguarde a criação do projeto (pode levar alguns minutos)

### 2. Executar o Schema SQL

1. No painel do Supabase, vá em **SQL Editor** (ícone de código no menu lateral)
2. Clique em "New Query"
3. Copie todo o conteúdo do arquivo `supabase/schema.sql`
4. Cole no editor e clique em "Run" (ou pressione Ctrl+Enter)
5. Aguarde a execução (deve aparecer "Success. No rows returned")

### 3. Obter Credenciais

1. Vá em **Settings** (ícone de engrenagem) > **API**
2. Copie:
   - **Project URL**: algo como `https://abcdefg.supabase.co`
   - **anon public key**: uma chave longa que começa com `eyJ...`

### 4. Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo `.env` (se ainda não existir)
2. Adicione:

```env
VITE_SUPABASE_URL=https://abcdefg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANTE**: 
- Use a chave `anon` ou `public`, NUNCA a `service_role`
- A chave `anon` é segura para usar no frontend

### 5. Criar Contas de Teste

#### Conta OWNER (Administrador)

1. No Supabase, vá em **Authentication** > **Users**
2. Clique em **"Add user"** > **"Create new user"**
3. Preencha:
   - Email: `admin@barbearia.com`
   - Password: `admin123` (ou outra senha forte)
   - ✅ Marque "Auto Confirm User"
4. Clique em **"Create user"**
5. **Copie o User UID** (aparece na lista de usuários)
6. Vá em **SQL Editor** e execute:

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

Substitua `COLE_O_USER_UID_AQUI` pelo UID copiado (ex: `123e4567-e89b-12d3-a456-426614174000`)

#### Conta BARBER (Funcionário)

1. Repita o processo acima:
   - Email: `barber@barbearia.com`
   - Password: `barber123`
   - ✅ Auto Confirm User
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

### 6. Testar o Sistema

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:5173/app`

3. **Teste 1**: Login como OWNER
   - Email: `admin@barbearia.com`
   - Senha: `admin123`
   - Deve redirecionar para o Dashboard

4. **Teste 2**: Logout e login como BARBER
   - Email: `barber@barbearia.com`
   - Senha: `barber123`
   - Deve redirecionar para a Agenda

5. **Teste 3**: Proteção de rotas
   - Com BARBER logado, tente acessar `/app/dashboard`
   - Deve ser redirecionado para `/app/agenda`

## 🔍 Verificar se Está Tudo OK

### Verificar Tabelas

No Supabase, vá em **Table Editor** e verifique se existem:
- ✅ barbershops
- ✅ profiles
- ✅ services
- ✅ appointments

### Verificar Políticas RLS

1. Vá em **Authentication** > **Policies**
2. Verifique se cada tabela tem políticas criadas

### Verificar Contas

1. Vá em **Authentication** > **Users**
2. Deve ver as contas criadas
3. Clique em uma conta e verifique se tem metadata

## 🐛 Problemas Comuns

### "Invalid API key"

- Verifique se copiou a chave `anon` correta
- Confirme que o arquivo `.env` está na raiz do projeto
- Reinicie o servidor de desenvolvimento

### "User not found" após login

- Verifique se o perfil foi criado na tabela `profiles`
- Confirme que o `id` do perfil é igual ao `User UID` do Auth

### "Permission denied" ao acessar dados

- Verifique se o RLS está habilitado
- Confirme que as políticas foram criadas
- Teste as queries manualmente no SQL Editor

### "Cannot read property of null"

- Verifique se o usuário tem um perfil vinculado
- Confirme que o `barbershop_id` existe na tabela `barbershops`

## 📚 Recursos Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

## 🔐 Segurança em Produção

Antes de ir para produção:

1. **Nunca commite o arquivo `.env`**
2. Use senhas fortes para as contas
3. Habilite autenticação de dois fatores
4. Revise as políticas RLS
5. Configure URLs de redirecionamento corretas
6. Use HTTPS em produção

## 💡 Dicas

- Use o **Table Editor** do Supabase para visualizar e editar dados facilmente
- O **SQL Editor** é ótimo para testar queries antes de implementar no código
- Use **Logs** para debugar problemas de autenticação
- O **Authentication** > **Users** mostra todos os usuários e seus status

## 🆘 Precisa de Ajuda?

Se tiver problemas:

1. Verifique o console do navegador (F12)
2. Verifique os logs no Supabase
3. Teste as queries manualmente no SQL Editor
4. Consulte a documentação do Supabase
