import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Upload, Save, Check, Image, Palette, AlertCircle } from 'lucide-react';

export default function OwnerCustomization() {
  const { barbershop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '', address: '', phone: '', email: '',
    logo_url: '', background_image_url: '', primary_color: '#eab308', settings: {}
  });

  // BUSCA DIRETO DO BANCO (nada de cache velho)
  const loadFromDatabase = async () => {
    if (!barbershop?.id) return;
    const { data, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', barbershop.id)
      .single();

    if (!error && data) {
      setFormData({
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        logo_url: data.logo_url || '',
        background_image_url: data.settings?.background_image_url || '',
        primary_color: data.settings?.primary_color || '#eab308',
        settings: data.settings || {}
      });
    }
    setLoading(false);
  };

  useEffect(() => { loadFromDatabase(); }, [barbershop]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'background_image_url') => {
    const file = e.target.files?.[0];
    if (!file || !barbershop) return;
    setUploading(true);
    setError('');

    const fileExt = file.name.split('.').pop();
    const filePath = `${barbershop.id}/${field}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('barbershop-images')
      .upload(filePath, file);

    if (uploadError) {
      setError('Erro no upload da imagem: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('barbershop-images')
      .getPublicUrl(filePath);

    setFormData({ ...formData, [field]: publicUrl });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!barbershop) return;
    setSaving(true);
    setError('');

    const settings = {
      ...formData.settings,
      background_image_url: formData.background_image_url,
      primary_color: formData.primary_color
    };

    const { error } = await supabase
      .from('barbershops')
      .update({
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        logo_url: formData.logo_url,
        settings
      })
      .eq('id', barbershop.id);

    setSaving(false);

    if (error) {
      setError('Erro ao salvar: ' + error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    loadFromDatabase(); // recarrega do banco pra confirmar
  };

  if (loading) return <p className="text-cream-300/40">Carregando...</p>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-cream-50">Personalização</h1>
        <p className="text-sm text-cream-300/50 mt-1">Customize a aparência da sua barbearia</p>
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <Check size={16} /> Alterações salvas com sucesso!
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Logo */}
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Image size={20} className="text-yellow-400" />
          </div>
          <h3 className="font-bold text-cream-50">Logo da Barbearia</h3>
        </div>
        <div className="flex items-center gap-4">
          {formData.logo_url ? (
            <img src={formData.logo_url} alt="Logo" className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-contain" />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Image size={24} className="text-cream-300/20" />
            </div>
          )}
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center justify-center gap-2 bg-zinc-800 text-cream-50 px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition text-sm">
              <Upload size={16} />
              {uploading ? 'Enviando...' : 'Upload da Logo'}
            </div>
            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo_url')} className="hidden" />
          </label>
        </div>
      </div>

      {/* Imagem de Fundo */}
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Image size={20} className="text-blue-400" />
          </div>
          <h3 className="font-bold text-cream-50">Imagem de Fundo</h3>
        </div>
        <div className="space-y-3">
          {formData.background_image_url && (
            <img src={formData.background_image_url} alt="Fundo" className="w-full h-32 md:h-40 rounded-xl object-cover" />
          )}
          <label className="cursor-pointer block">
            <div className="flex items-center justify-center gap-2 bg-zinc-800 text-cream-50 px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition text-sm w-full md:w-fit md:px-4">
              <Upload size={16} />
              {uploading ? 'Enviando...' : 'Upload da Imagem de Fundo'}
            </div>
            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'background_image_url')} className="hidden" />
          </label>
          <p className="text-xs text-cream-300/40">Essa imagem aparece como papel de parede no app</p>
        </div>
      </div>

      {/* Cor Primária */}
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Palette size={20} className="text-purple-400" />
          </div>
          <h3 className="font-bold text-cream-50">Cor Principal</h3>
        </div>
        <div className="flex items-center gap-4">
          <input type="color" value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} className="w-14 h-14 md:w-16 md:h-16 rounded-xl cursor-pointer bg-transparent border-0" />
          <input type="text" value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} className="flex-1 bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-2 text-cream-50 text-sm focus:outline-none focus:border-yellow-500/50" />
        </div>
      </div>

      {/* Dados da Barbearia */}
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 md:p-6">
        <h3 className="font-bold text-cream-50 mb-4">Informações da Barbearia</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Nome</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Endereço</label>
            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Telefone</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">E-mail</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" />
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-3.5 rounded-xl hover:bg-yellow-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        <Save size={18} />
        {saving ? 'Salvando...' : 'Salvar Alterações'}
      </button>
    </div>
  );
}