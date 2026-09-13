import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Plus, Edit2, Trash2, X, Scissors, DollarSign, Clock, AlertCircle } from 'lucide-react';

export default function BarberServices() {
  const { barbershop, profile } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [canAddServices, setCanAddServices] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; serviceId: string | null; serviceName: string }>({ open: false, serviceId: null, serviceName: '' });
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', description: '', price: '', duration_minutes: '30', is_active: true });

  useEffect(() => { loadServices(); checkPermission(); }, []);

  const checkPermission = async () => {
    if (!barbershop?.id) return;
    const { data } = await supabase.from('barbershops').select('allow_barbers_add_services').eq('id', barbershop.id).single();
    if (data) setCanAddServices(data.allow_barbers_add_services);
  };

  const loadServices = async () => {
    if (!barbershop?.id) return;
    setLoading(true);
    const { data } = await supabase.from('services').select('*').eq('barbershop_id', barbershop.id).order('created_at', { ascending: false });
    if (data) setServices(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!barbershop || !profile) return;

    const serviceData = {
      barbershop_id: barbershop.id,
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      duration_minutes: parseInt(formData.duration_minutes),
      is_active: formData.is_active,
      created_by: profile.id,
    };

    const { error } = editingService 
      ? await supabase.from('services').update(serviceData).eq('id', editingService.id)
      : await supabase.from('services').insert([serviceData]);

    if (error) setError('Erro ao salvar serviço.');
    else {
      setShowForm(false);
      setEditingService(null);
      setFormData({ name: '', description: '', price: '', duration_minutes: '30', is_active: true });
      loadServices();
    }
  };

  const requestDelete = (service: any) => {
    setDeleteConfirm({ open: true, serviceId: service.id, serviceName: service.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.serviceId) return;
    setConfirmLoading(true);
    try {
      await supabase.from('services').delete().eq('id', deleteConfirm.serviceId);
      loadServices();
    } finally {
      setConfirmLoading(false);
      setDeleteConfirm({ open: false, serviceId: null, serviceName: '' });
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  if (loading) return <div className="text-center py-12 animate-pulse text-cream-300/40">Carregando...</div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-cream-50">Serviços</h1>
          <p className="text-sm text-cream-300/50 mt-1">Serviços disponíveis na barbearia</p>
        </div>
        {canAddServices && (
          <button onClick={() => { setEditingService(null); setFormData({ name: '', description: '', price: '', duration_minutes: '30', is_active: true }); setShowForm(true); }} className="flex items-center gap-2 bg-yellow-500 text-[#0a0a0a] px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-bold hover:bg-yellow-600 transition-all text-sm md:text-base">
            <Plus size={18} /> <span className="hidden sm:inline">Novo</span> Serviço
          </button>
        )}
      </div>

      {!canAddServices && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          O dono da barbearia não permite que barbeiros adicionem serviços.
        </div>
      )}

      <div className="grid gap-3 md:gap-4">
        {services.length === 0 ? (
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-8 md:p-12 text-center">
            <Scissors size={40} className="mx-auto text-cream-300/20 mb-4" />
            <h3 className="text-lg font-bold text-cream-50 mb-2">Nenhum serviço cadastrado</h3>
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 hover:border-cream-100/10 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-cream-50">{service.name}</h3>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${service.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {service.description && <p className="text-sm text-cream-300/60 mb-3">{service.description}</p>}
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-yellow-500" />
                      <span className="text-sm font-bold text-cream-50">{formatPrice(service.price)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-400" />
                      <span className="text-sm text-cream-300/60">{service.duration_minutes} min</span>
                    </div>
                  </div>
                </div>

                {canAddServices && service.created_by === profile?.id && (
                  <div className="flex items-center gap-2 self-end sm:self-start">
                    <button onClick={() => { setEditingService(service); setFormData({ name: service.name, description: service.description || '', price: service.price.toString(), duration_minutes: service.duration_minutes.toString(), is_active: service.is_active }); setShowForm(true); }} className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-all">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => requestDelete(service)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-cream-100/5 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold text-cream-50">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={() => { setShowForm(false); setEditingService(null); }} className="p-2 rounded-lg text-cream-300/50 hover:text-cream-50 hover:bg-zinc-800 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16}/>{error}</div>}
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do Serviço *" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição (opcional)" rows={2} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="Preço (R$) *" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
                <input type="number" min="5" step="5" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} placeholder="Duração (min) *" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingService(null); }} className="flex-1 bg-zinc-800 text-cream-50 py-3 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-yellow-500 text-[#0a0a0a] py-3 rounded-xl font-bold">{editingService ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Excluir serviço?"
        description={`O serviço "${deleteConfirm.serviceName}" será removido permanentemente. Atendimentos antigos manterão o valor cobrado, mas perderão a referência do nome. Esta ação não pode ser desfeita.`}
        variant="danger"
        confirmLabel="Sim, excluir"
        loading={confirmLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteConfirm({ open: false, serviceId: null, serviceName: '' }); setConfirmLoading(false); }}
      />
    </div>
  );
}