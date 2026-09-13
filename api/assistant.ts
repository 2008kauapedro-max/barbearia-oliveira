declare const process: { env: Record<string, string | undefined> };
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const key = process.env.GROQ_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  if (!key || !supabaseUrl || !supabaseAnon) {
    return res.status(500).json({ error: 'IA não configurada no servidor (faltam variáveis de ambiente).' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autenticado.' });
  let userId = '';
  try {
    const who = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: supabaseAnon } });
    if (!who.ok) return res.status(401).json({ error: 'Sessão inválida.' });
    const u = await who.json();
    userId = u?.id || '';
  } catch {
    return res.status(401).json({ error: 'Falha ao validar sessão.' });
  }

  let role = 'CLIENT';
  try {
    const pr = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${userId}`, {
      headers: { Authorization: authHeader, apikey: supabaseAnon },
    });
    if (pr.ok) {
      const rows = await pr.json();
      role = rows?.[0]?.role || 'CLIENT';
    }
  } catch { /* mantém CLIENT */ }

  // Rate limit da IA: 10 perguntas/min por usuario (antes de gastar credito Groq)
  const thr = await fetch(`${supabaseUrl}/rest/v1/rpc/throttle`, {
    method: 'POST',
    headers: { Authorization: authHeader, apikey: supabaseAnon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: 'ai:' + userId, p_limit: 10, p_window_seconds: 60 }),
  });
  if (!thr.ok) {
    return res.status(429).json({ error: 'Muitas perguntas em sequência. Respire e tente em instantes. ☕' });
  }

  const { messages, facts } = req.body || {};

  const REGRAS = `Responda SEMPRE em português brasileiro, curto e direto (máximo 8 linhas), tom de parceiro mas profissional.
Entenda gírias e abreviações do brasileiro: blz, eai, mn, opa, suave, vc, td, pq, hj, q, msm, vlw, obg, pfv, cadê, tmj.
FORMATAÇÃO: a interface já renderiza **negrito** e transforma linhas começadas com "- " em bolinhas de lista. Use **negrito** só no essencial e listas com "- ". NUNCA use ###, tabelas markdown ou emojis em excesso.
Use SOMENTE os DADOS REAIS abaixo. NUNCA invente números, nomes ou datas.
Se o dado não existir abaixo, diga: "Não tenho essa informação no sistema agora."
Valores em reais: R$ X,XX. Se pedirem algo FORA do seu escopo, recuse educadamente.`;

  const MANUAL_OWNER = `Você é a IA do DONO da barbearia. Escopo: TUDO do painel do dono.
Passos exatos das telas (ensine assim):
- Equipe: menu Equipe → botão Adicionar → nome + e-mail → Criar → o sistema mostra a SENHA TEMPORÁRIA na tela (entregue ao funcionário). Desativar: botão Desativar → escrever motivo. Reativar: botão Reativar.
- Agenda: botão Novo Agendamento → cliente → serviço → barbeiro → horário → Salvar. Concluir: card do atendimento → Concluir.
- Assinaturas: aba Planos (criar plano) / aba Assinantes → Nova Assinatura → cliente + plano + indicado por → Criar. Renovar/Cancelar: clicar na assinatura → botões.
- Comunicação: escrever título + mensagem → escolher público → Enviar agora / Programar / rascunho.
- Relatórios: escolher período → Baixar relatório.
- Configurações: horários de funcionamento da barbearia.
- Personalização: logo, imagem de fundo, cor, dados da barbearia.
Quando pedirem pra executar algo que você não executa direto, explique o caminho exato com os nomes dos botões.`;

  const MANUAL_BARBER = `Você é a IA do FUNCIONÁRIO/BARBEIRO. Escopo SOMENTE: agenda própria, registrar atendimento avulso (Agenda → botão Registrar Atendimento → cliente → serviço → Salvar), próximos clientes, horários da semana, histórico e faturamento PRÓPRIO, indicações PRÓPRIAS, perfil próprio.
PROIBIDO: faturamento geral da barbearia, dados de outros barbeiros, equipe, configurações, assinaturas de outros. Se perguntarem: "Isso é da área do dono, não tenho acesso."`;

  const MANUAL_CLIENT = `Você é a IA do CLIENTE da barbearia. Escopo SOMENTE: próximos agendamentos próprios, histórico próprio, como agendar (Agendar: serviço → barbeiro → dia → horário), como cancelar (Horários → Próximos → Cancelar), assinatura própria (plano, cortes restantes, vencimento), funcionamento e endereço da barbearia.
PROIBIDO: dados de outros clientes, faturamento, equipe, números internos. Se perguntarem: "Essa informação é interna da barbearia."`;

  const system = role === 'OWNER'
    ? `${MANUAL_OWNER}\n${REGRAS}\n\nDADOS REAIS (agora):\n${JSON.stringify(facts || {})}`
    : role === 'BARBER'
      ? `${MANUAL_BARBER}\n${REGRAS}\n\nDADOS REAIS DO PRÓPRIO BARBEIRO (agora):\n${JSON.stringify(facts || {})}`
      : `${MANUAL_CLIENT}\n${REGRAS}\n\nDADOS REAIS DO PRÓPRIO CLIENTE (agora):\n${JSON.stringify(facts || {})}`;

  const payload = {
    model: 'openai/gpt-oss-120b',
    temperature: 0.3,
    max_tokens: 500,
    messages: [
      { role: 'system', content: system },
      ...((messages || []) as any[]).slice(-8),
    ],
  };

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(502).json({ error: 'A IA não respondeu: ' + txt.slice(0, 180) });
    }
    const data = await resp.json();
    return res.status(200).json({ reply: data?.choices?.[0]?.message?.content || 'Sem resposta da IA.' });
  } catch {
    return res.status(502).json({ error: 'Falha de conexão com a IA.' });
  }
}