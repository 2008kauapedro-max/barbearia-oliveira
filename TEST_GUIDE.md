# Guia Rápido de Testes

Este guia vai te ajudar a testar rapidamente o sistema após a configuração.

## ✅ Checklist de Configuração

Antes de testar, confirme:

- [ ] Projeto Supabase criado
- [ ] Script `supabase/schema.sql` executado
- [ ] Arquivo `.env` criado com credenciais
- [ ] Servidor rodando (`npm run dev`)
- [ ] Conta OWNER criada no Supabase
- [ ] Conta BARBER criada no Supabase

## 🧪 Testes Rápidos

### 1. Acessar o APP

```
Abra: http://localhost:5173
```

**Resultado esperado**: Redirecionar para `/login`

---

### 2. Login como OWNER

```
Email: admin@barbearia.com
Senha: admin123
```

**Resultado esperado**: 
- Login bem-sucedido
- Redirecionar para `/app/dashboard`
- Ver dashboard do administrador

---

### 3. Verificar Menu do OWNER

No dashboard, confirme que você vê:
- ✅ Dashboard
- ✅ Agenda
- ✅ Equipe
- ✅ Clientes
- ✅ Serviços
- ✅ Financeiro
- ✅ Personalização
- ✅ Configurações

---

### 4. Logout

Clique no botão de logout (ícone de porta).

**Resultado esperado**: Redirecionar para `/login`

---

### 5. Login como BARBER

```
Email: barber@barbearia.com
Senha: barber123
```

**Resultado esperado**:
- Login bem-sucedido
- Redirecionar para `/app/agenda`
- Ver agenda do funcionário

---

### 6. Verificar Menu do BARBER

Na agenda, confirme que você vê APENAS:
- ✅ Agenda
- ✅ Próximos Clientes
- ✅ Horários
- ✅ Serviços
- ✅ Histórico
- ✅ Perfil

**NÃO deve ver**:
- ❌ Dashboard
- ❌ Equipe
- ❌ Clientes
- ❌ Financeiro
- ❌ Personalização
- ❌ Configurações

---

### 7. Testar Proteção de Rotas (BARBER)

Com BARBER logado, tente acessar manualmente:

```
http://localhost:5173/#/app/dashboard
```

**Resultado esperado**: Redirecionar para `/app/agenda` (acesso negado)

---

### 8. Logout e Criar Conta CLIENT

1. Faça logout
2. Clique em "Criar conta"
3. Preencha:
   - Nome: João Cliente
   - Telefone: (11) 97777-7777
   - Email: cliente@teste.com
   - Senha: cliente123
4. Clique em "Criar conta"

**Resultado esperado**:
- Conta criada
- Login automático
- Redirecionar para `/cliente`
- Ver área do cliente

---

### 9. Verificar Menu do CLIENT

Na área do cliente, confirme que você vê APENAS:
- ✅ Início
- ✅ Agendar
- ✅ Horários
- ✅ Perfil

**NÃO deve ter acesso a**:
- ❌ Nenhuma rota `/app/*`

---

### 10. Testar Proteção de Rotas (CLIENT)

Com CLIENT logado, tente acessar manualmente:

```
http://localhost:5173/#/app/dashboard
```

**Resultado esperado**: Redirecionar para `/cliente` (acesso negado)

---

### 11. Testar Sessão Persistente

1. Com qualquer usuário logado
2. Recarregue a página (F5)

**Resultado esperado**: 
- Manter logado
- Redirecionar para o painel correto

---

### 12. Testar "Esqueci minha senha"

1. Faça logout
2. Na tela de login, clique em "Esqueci minha senha"
3. Digite um email válido
4. Clique em "Enviar instruções"

**Resultado esperado**:
- Mensagem de sucesso
- Email de recuperação enviado (verifique no Supabase)

---

## 🐛 Problemas Comuns

### "Invalid API key"
- Verifique se o arquivo `.env` existe
- Confirme que as credenciais estão corretas
- Reinicie o servidor

### "User not found" após login
- Verifique se o perfil foi criado na tabela `profiles`
- Confirme que o `id` do perfil é igual ao User UID do Auth

### "Permission denied" ao acessar dados
- Verifique se o RLS está habilitado
- Confirme que as políticas foram criadas
- Teste as queries manualmente no SQL Editor

### Redirecionamento incorreto
- Verifique se a role está correta na tabela `profiles`
- Confirme que o `barbershop_id` existe

### Tela de login não aparece
- Verifique se o servidor está rodando
- Confirme que não há erros no console do navegador
- Tente limpar o cache do navegador

---

## 📊 Verificar Dados no Supabase

### Verificar Barbearias
```sql
SELECT * FROM barbershops;
```

### Verificar Perfis
```sql
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.phone,
  b.name as barbershop
FROM profiles p
JOIN barbershops b ON b.id = p.barbershop_id;
```

### Verificar Usuários Auth
1. Vá em **Authentication** > **Users**
2. Confirme que os usuários existem
3. Verifique se estão confirmados

---

## 🎯 Fluxo Completo de Teste

```
1. Abrir APP (/)
   ↓
2. Redirecionar para /login
   ↓
3. Login como OWNER
   ↓
4. Verificar Dashboard (/app/dashboard)
   ↓
5. Logout
   ↓
6. Login como BARBER
   ↓
7. Verificar Agenda (/app/agenda)
   ↓
8. Tentar acessar /app/dashboard → BLOQUEADO
   ↓
9. Logout
   ↓
10. Criar conta CLIENT
    ↓
11. Verificar Área do Cliente (/cliente)
    ↓
12. Tentar acessar /app/dashboard → BLOQUEADO
    ↓
13. TESTE COMPLETO ✅
```

---

## ✅ Checklist Final

Após todos os testes, confirme:

- [ ] OWNER consegue acessar todas as áreas administrativas
- [ ] BARBER consegue acessar apenas suas áreas
- [ ] BARBER não consegue acessar áreas do OWNER
- [ ] CLIENT consegue acessar apenas sua área
- [ ] CLIENT não consegue acessar áreas internas
- [ ] Sessão persiste ao recarregar página
- [ ] Logout funciona corretamente
- [ ] "Esqueci minha senha" envia email
- [ ] Cadastro cria conta CLIENT automaticamente
- [ ] Redirecionamento automático baseado na role

---

## 🆘 Precisa de Ajuda?

Se algum teste falhar:

1. Verifique o console do navegador (F12)
2. Verifique os logs no Supabase
3. Confirme que o schema foi executado corretamente
4. Verifique se as contas foram criadas com as roles corretas
5. Consulte a [documentação do Supabase](https://supabase.com/docs)
