import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, Scissors, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export default function BarberProfile() {
  const { profile, barbershop } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saved, setSaved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('posts').select('*').eq('author_id', profile.id).order('created_at', { ascending: false }).limit(12);
    if (data) setMyPosts(data);
  };

  const handleSave = async () => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const handlePost = async () => {
    if (!file || !profile || !barbershop) return;
    setPosting(true);
    const ext = file.name.split('.').pop();
    const path = `${barbershop.id}/${profile.id}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('posts').upload(path, file);
    if (upErr) { alert('Erro no upload: ' + upErr.message); setPosting(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path);
    const { error } = await supabase.from('posts').insert({
      barbershop_id: barbershop.id, author_id: profile.id, image_url: publicUrl, caption: caption || null,
    });
    setPosting(false);
    if (error) alert('Erro ao publicar.');
    else { setFile(null); setCaption(''); loadPosts(); }
  };

  const handleDeletePost = async (id: string) => {
    await supabase.from('posts').delete().eq('id', id);
    loadPosts();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-cream-50">Meu Perfil</h1>
      {saved && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-2 rounded-xl flex items-center gap-2"><Check size={16} /> Perfil atualizado!</div>}

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-yellow-500 p-[3px]">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
              <span className="text-xl font-bold text-yellow-400">{(fullName || 'B').charAt(0)}</span>
            </div>
          </div>
          <div>
            <p className="font-bold text-cream-50 text-sm">{fullName}</p>
            <p className="text-xs text-cream-300/40 flex items-center gap-1"><Scissors size={12} /> Barbeiro • {barbershop?.name}</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-[10px] text-cream-300/30 uppercase font-bold">Nome</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="block w-full bg-zinc-800/50 border border-cream-100/5 rounded-xl px-3 py-2.5 text-sm text-cream-50 mt-1 focus:outline-none focus:border-yellow-500/50" />
        </div>
        <div>
          <label className="text-[10px] text-cream-300/30 uppercase font-bold">Telefone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="block w-full bg-zinc-800/50 border border-cream-100/5 rounded-xl px-3 py-2.5 text-sm text-cream-50 mt-1 focus:outline-none focus:border-yellow-500/50" />
        </div>
        <button onClick={handleSave} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-2.5 rounded-xl hover:bg-yellow-600 transition text-sm">Salvar alterações</button>
      </div>

      {/* Publicar no feed */}
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 space-y-3">
        <p className="font-bold text-cream-50 text-sm flex items-center gap-2"><ImageIcon size={16} className="text-yellow-400" /> Publicar no Feed</p>
        <label className="cursor-pointer block">
          <div className="flex items-center justify-center gap-2 bg-zinc-800 text-cream-50 px-4 py-2.5 rounded-xl text-xs font-medium">
            <Upload size={14} /> {file ? file.name : 'Escolher foto do corte'}
          </div>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
        </label>
        <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Legenda (ex: degradê navalhado + barba)" className="w-full bg-zinc-800/50 border border-cream-100/5 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" />
        <button onClick={handlePost} disabled={!file || posting} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
          {posting ? 'Publicando...' : 'Publicar'}
        </button>

        {myPosts.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 pt-2">
            {myPosts.map(p => (
              <div key={p.id} className="relative rounded-lg overflow-hidden">
                <img src={p.image_url} className="w-full aspect-square object-cover" alt="" />
                <button onClick={() => handleDeletePost(p.id)} className="absolute top-1 right-1 bg-black/60 rounded p-1 text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}