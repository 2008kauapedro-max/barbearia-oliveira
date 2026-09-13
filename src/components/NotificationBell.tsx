import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Bell, X, Check } from 'lucide-react';

export default function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => { if (profile) loadNotifications(); }, [profile]);

  const loadNotifications = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20);
    if (data) {
      setNotifications(data);
      setUnread(data.filter(n => !n.read_at).length);
    }
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    loadNotifications();
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    }
    loadNotifications();
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) loadNotifications(); }} className="relative p-2 text-cream-300/50 hover:text-cream-50 transition">
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div className="fixed right-3 top-16 w-[calc(100vw-24px)] max-w-sm max-h-[70vh] bg-zinc-900 border border-cream-100/10 rounded-2xl shadow-2xl z-[80] overflow-hidden flex flex-col">
            <div className="p-3 border-b border-cream-100/5 flex items-center justify-between shrink-0">
              <p className="font-bold text-cream-50 text-sm">Notificações</p>
              <div className="flex gap-2 items-center">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-yellow-400 font-medium hover:underline">Marcar todas como lidas</button>
                )}
                <button onClick={() => setOpen(false)} className="text-cream-300/30"><X size={16} /></button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell size={24} className="mx-auto text-cream-300/20 mb-2" />
                  <p className="text-xs text-cream-300/40">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-3 border-b border-cream-100/5 transition ${n.read_at ? 'opacity-50' : 'bg-yellow-500/5'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-cream-50">{n.title}</p>
                        {n.message && <p className="text-[11px] text-cream-300/60 mt-0.5">{n.message}</p>}
                        <p className="text-[10px] text-cream-300/30 mt-1">{new Date(n.created_at).toLocaleDateString('pt-BR')} {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {!n.read_at && (
                        <button onClick={() => markRead(n.id)} className="shrink-0 p-1 text-yellow-400 hover:bg-yellow-500/10 rounded" title="Marcar como lida">
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}