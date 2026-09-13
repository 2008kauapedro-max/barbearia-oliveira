import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Image as ImageIcon, Star } from 'lucide-react';


export default function ClientFeed() {
  const { barbershop } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barbershop?.id) return;
    supabase.from('profiles').select('id, full_name, avatar_url, role').eq('barbershop_id', barbershop.id).in('role', ['BARBER', 'OWNER']).eq('is_active', true).order('full_name').then(({ data }) => { if (data) setTeam(data); });
    supabase.from('posts').select('*, author:author_id(full_name, avatar_url)').eq('barbershop_id', barbershop.id).order('created_at', { ascending: false }).limit(60).then(({ data }) => { if (data) setPosts(data); setLoading(false); });
    supabase.from('reviews').select('barber_id, rating').eq('barbershop_id', barbershop.id).then(({ data }) => {
      const map: Record<string, { sum: number; count: number }> = {};
      (data || []).forEach((r: any) => {
        const cur = map[r.barber_id] || { sum: 0, count: 0 };
        cur.sum += r.rating; cur.count += 1;
        map[r.barber_id] = cur;
      });
      const avg: Record<string, { avg: number; count: number }> = {};
      Object.entries(map).forEach(([k, v]) => { avg[k] = { avg: v.sum / v.count, count: v.count }; });
      setRatings(avg);
    });
  }, [barbershop]);

  const list = filter ? posts.filter(p => p.author_id === filter) : posts;

  const timeAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d <= 0) return 'hoje';
    if (d === 1) return 'ontem';
    if (d < 30) return `há ${d} dias`;
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-cream-50">Feed</h1>
        <p className="text-xs text-cream-300/50 mt-0.5">Trabalhos da equipe</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <button onClick={() => setFilter('')} className={`shrink-0 flex flex-col items-center gap-1 ${!filter ? '' : 'opacity-50'}`}>
          <div className={`w-14 h-14 rounded-full p-[2px] ${!filter ? 'bg-yellow-500' : 'bg-zinc-700'}`}>
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center"><ImageIcon size={18} className="text-cream-300/60" /></div>
          </div>
          <span className="text-[10px] text-cream-300/60">Todos</span>
        </button>
        {team.map(b => (
          <button key={b.id} onClick={() => setFilter(b.id)} className={`shrink-0 flex flex-col items-center gap-1 ${filter === b.id ? '' : 'opacity-50'}`}>
            <div className={`w-14 h-14 rounded-full p-[2px] ${filter === b.id ? 'bg-yellow-500' : 'bg-zinc-700'}`}>
              <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                {b.avatar_url ? <img src={b.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="font-bold text-yellow-500">{b.full_name.charAt(0)}</span>}
              </div>
            </div>
            <span className="text-[10px] text-cream-300/60 max-w-[60px] truncate">{b.full_name.split(' ')[0]}</span>
            {ratings[b.id] && (
              <span className="text-[9px] text-yellow-400 font-bold flex items-center gap-0.5"><Star size={8} fill="currentColor" />{ratings[b.id].avg.toFixed(1)}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? <p className="text-cream-300/40 text-xs">Carregando...</p> : list.length === 0 ? (
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-8 text-center">
          <ImageIcon size={28} className="mx-auto text-cream-300/20 mb-2" />
          <p className="text-cream-300/40 text-xs">Nenhuma foto publicada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {list.map(p => (
            <div key={p.id} className="relative rounded-xl overflow-hidden bg-zinc-900">
              <img src={p.image_url} alt={p.caption || ''} className="w-full aspect-[3/4] object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-[10px] font-bold text-cream-50 truncate flex items-center gap-1">
                  {p.author?.full_name}
                  {ratings[p.author_id] && <span className="text-yellow-400 flex items-center gap-0.5"><Star size={8} fill="currentColor" />{ratings[p.author_id].avg.toFixed(1)}</span>}
                </p>
                {p.caption && <p className="text-[9px] text-cream-300/70 truncate">{p.caption}</p>}
                <p className="text-[8px] text-cream-300/40">{timeAgo(p.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}