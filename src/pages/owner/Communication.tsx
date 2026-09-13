import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Megaphone, Send, Clock, FileText, AlertCircle, Check } from 'lucide-react';

const AUDIENCES = [
  { key: 'all', label: 'Todos os clientes' },
  { key: 'active', label: 'Clientes ativos (corte nos últimos 30 dias)' },
  { key: 'inactive', label: 'Clientes inativos' },
  { key: 'subscribers', label: 'Assinantes ativos' },
  { key: 'expiring', label: 'Assinaturas próximas do vencimento' },
  { key: 'expired', label: 'Assinaturas vencidas' },
  { key: 'no_booking_30d', label: 'Sem agendar há 30 dias' },
];

export default function OwnerCommunication() {
  const { barbershop } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [scheduleAt, setScheduleAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    // Processa campanhas programadas que já deram a hora
    supabase.rpc('process_scheduled_campaigns').then(() => loadCampaigns());
  }, []);

  const loadCampaigns = async () => {
    if (!barbershop?.id) return;
    const { data } = await supabase.from('campaigns').select('*').eq('barbershop_id', barbershop.id).order('created_at', { ascending: false });
    if (data) setCampaigns(data);
    setLoading(false);
  };

  const handleSend = async (mode: 'now' | 'schedule' | 'draft') => {
    if (!barbershop) return;
    if (mode !== 'draft' && (!title || !message)) { setError('Preencha título e mensagem.'); return; }
    setSaving(true);
    setError('');
    setOk('');

    const payload: any = {
      barbershop_id: barbershop.id,
      title,
      message,
      audience,
      channel: 'internal',
      status: mode === 'now' ? 'draft' : mode === 'schedule' ? 'scheduled' : 'draft',
      scheduled_for: mode === 'schedule' && scheduleAt ? new Date(scheduleAt).toISOString() : null,
    };

    const { data, error: err } = await supabase.from('campaigns').insert(payload).select('id').single();
    if (err || !data) { setError('Erro ao salvar campanha.'); setSaving(false); return; }

    if (mode === 'now') {
      const { data: res } = await supabase.rpc('send_campaign', { p_campaign_id: data.id });
      if (res?.error) { setError(res.error); setSaving(false); return; }
      setOk('Campanha enviada para as notificações dos clientes!');
    } else if (mode === 'schedule') {
      setOk('Campanha programada! Será enviada automaticamente no horário.');
    } else {
      setOk('Rascunho salvo.');
    }

    setTitle(''); setMessage(''); setScheduleAt('');
    setSaving(false);
    loadCampaigns();
  };

  const handleSendDraft = async (id: string) => {
    const { data } = await supabase.rpc('send_campaign', { p_campaign_id: id });
    if (data?.error) alert(data.error);
    else loadCampaigns();
  };

  const statusBadge = (c: any) => {
    if (c.status === 'sent') return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-green-500/10 text-green-400">ENVIADA</span>;
    if (c.status === 'scheduled') return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400">PROGRAMADA</span>;
    return <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-500/10 text-zinc-400">RASCUNHO</span>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-cream-50">Comunicação</h1>
        <p className="text-sm text-cream-300/50 mt-1">Envie mensagens para os clientes certos</p>
      </div>

      {ok && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2"><Check size={16} /> {ok}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

      {/* Criar campanha */}
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 space-y-3">
        <p className="font-bold text-cream-50 flex items-center gap-2"><Megaphone size={16} className="text-yellow-400" /> Nova mensagem</p>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (ex: Promoção de sexta!)" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Mensagem que os clientes vão receber nas notificações..." rows={3} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50 resize-none" />
        <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50">
          {AUDIENCES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
        <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" />

        <div className="flex gap-2">
          <button onClick={() => handleSend('now')} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-[#0a0a0a] py-3 rounded-xl font-bold text-sm disabled:opacity-50">
            <Send size={16} /> Enviar agora
          </button>
          <button onClick={() => handleSend('schedule')} disabled={saving || !scheduleAt} className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 text-blue-400 py-3 rounded-xl font-bold text-sm disabled:opacity-40">
            <Clock size={16} /> Programar
          </button>
          <button onClick={() => handleSend('draft')} disabled={saving} className="flex items-center justify-center gap-2 bg-zinc-800 text-cream-300/60 px-4 py-3 rounded-xl font-bold text-sm">
            <FileText size={16} />
          </button>
        </div>
        <p className="text-[10px] text-cream-300/30">Por enquanto as mensagens chegam como notificação interna (sininho). WhatsApp entra numa fase futura.</p>
      </div>

      {/* Histórico */}
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
        <p className="font-bold text-cream-50 mb-3">Histórico de campanhas</p>
        {loading ? <p className="text-cream-300/40 text-sm">Carregando...</p> : campaigns.length === 0 ? (
          <p className="text-center text-cream-300/40 text-xs py-6">Nenhuma campanha criada ainda.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="bg-zinc-800/50 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-cream-50 truncate">{c.title}</p>
                    <p className="text-xs text-cream-300/50 mt-0.5 line-clamp-2">{c.message}</p>
                    <p className="text-[10px] text-cream-300/30 mt-1">
                      Público: {AUDIENCES.find(a => a.key === c.audience)?.label || c.audience}
                      {c.sent_at && ` • enviada em ${new Date(c.sent_at).toLocaleDateString('pt-BR')} ${new Date(c.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                      {c.status === 'scheduled' && c.scheduled_for && ` • programada para ${new Date(c.scheduled_for).toLocaleDateString('pt-BR')} ${new Date(c.scheduled_for).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {statusBadge(c)}
                    {c.status === 'draft' && (
                      <button onClick={() => handleSendDraft(c.id)} className="text-[10px] text-yellow-400 font-bold hover:underline">Enviar agora</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}