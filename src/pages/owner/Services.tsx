import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Plus, Edit2, Trash2, X, Check, Scissors, DollarSign, Clock, Users } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export default function OwnerServices() {
  const { barbershop, profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [allowBarbersAddServices, setAllowBarbersAddServices] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; serviceId: string | null; serviceName: string }>({ open: false, serviceId: null, serviceName: '' });
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '30',
    is_active: true,
  });

  useEffect(() => {
    loadServices();
    loadBarbershopSettings();
  }, []);

  const loadBarbershopSettings = async () => {
    if (!barbershop?.id) return;
    
    const { data } = await supabase
      .from('barbershops')
      .select('allow_barbers_add_services')
      .eq('id', barbershop.id)
      .single();
    
    if (data) {
      setAllowBarbersAddServices(data.allow_barbers_add_services);
    }
  };

  const loadServices = async () => {
    if (!barbershop?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar serviços:', error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const handleToggleBarbersPermission = async () => {
    if (!barbershop?.id) return;
    
    const newValue = !allowBarbersAddServices;
    const { error } = await supabase
      .from('barbershops')
      .update({ allow_barbers_add_services: newValue })
      .eq('id', barbershop.id);
    
    if (error) {
      console.error('Erro ao atualizar permissão:', error);
    } else {
      setAllowBarbersAddServices(newValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const serviceData = {
      barbershop_id: barbershop?.id,
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      duration_minutes: parseInt(formData.duration_minutes),
      is_active: formData.is_active,
      created_by: profile?.id,
    };

    let error;
    
    if (editingService) {
      const { error: updateError } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('services')
        .insert([serviceData]);
      error = insertError;
    }

    if (error) {
      console.error('Erro ao salvar serviço:', error);
      alert('Erro ao salvar serviço. Tente novamente.');
    } else {
      setShowForm(false);
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        duration_minutes: '30',
        is_active: true,
      });
      loadServices();
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString(),
      is_active: service.is_active,
    });
    setShowForm(true);
  };

  const requestDelete = (service: Service) => {
    setDeleteConfirm({ open: true, serviceId: service.id, serviceName: service.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.serviceId) return;
    setConfirmLoading(true);
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', deleteConfirm.serviceId);
      
      if (error) {
        console.error('Erro ao excluir serviço:', error);
        alert('Erro ao excluir serviço.');
      } else {
        loadServices();
      }
    } finally {
      setConfirmLoading(false);
      setDeleteConfirm({ open: false, serviceId: null, serviceName: '' });
    }
  };

  const handleToggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);
    
    if (error) {
      console.error('Erro ao atualizar serviço:', error);
    } else {
      loadServices();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cream-300/40">Carregando serviços...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream-50">Serviços</h1>
          <p className="text-sm text-cream-300/50 mt-1">
            Gerencie os serviços oferecidos pela barbearia
          </p>
        </div>
        <button
          onClick={() => {
            setEditingService(null);
            setFormData({
              name: '',
              description: '',
              price: '',
              duration_minutes: '30',
              is_active: true,
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-yellow-500 text-[#0a0a0a] px-4 py-2.5 rounded-xl font-bold hover:bg-yellow-600 transition-all"
        >
          <Plus size={18} />
          Novo Serviço
        </button>
      </div>

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-cream-50">Permissão dos Barbeiros</h3>
              <p className="text-sm text-cream-300/50 mt-0.5">
                {allowBarbersAddServices 
                  ? 'Barbeiros podem adicionar seus próprios serviços' 
                  : 'Barbeiros não podem adicionar serviços'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleBarbersPermission}
            className={`relative w-14 h-7 rounded-full transition-all ${
              allowBarbersAddServices ? 'bg-green-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                allowBarbersAddServices ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {services.length === 0 ? (
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-12 text-center">
            <Scissors size={48} className="mx-auto text-cream-300/20 mb-4" />
            <h3 className="text-lg font-bold text-cream-50 mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-sm text-cream-300/50">
              Clique em "Novo Serviço" para começar
            </p>
          </div>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-6 hover:border-cream-100/10 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-cream-50">{service.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        service.is_active
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  
                  {service.description && (
                    <p className="text-sm text-cream-300/60 mb-3">{service.description}</p>
                  )}
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-yellow-500" />
                      <span className="text-sm font-bold text-cream-50">
                        {formatPrice(service.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-400" />
                      <span className="text-sm text-cream-300/60">
                        {service.duration_minutes} min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(service)}
                    className={`p-2 rounded-lg transition-all ${
                      service.is_active
                        ? 'text-green-400 hover:bg-green-500/10'
                        : 'text-red-400 hover:bg-red-500/10'
                    }`}
                    title={service.is_active ? 'Desativar' : 'Ativar'}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-all"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => requestDelete(service)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-cream-100/5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-cream-50">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingService(null);
                  }}
                  className="p-2 rounded-lg text-cream-300/50 hover:text-cream-50 hover:bg-zinc-800 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-cream-300/60 mb-1.5 block">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Corte Masculino"
                  className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-cream-300/60 mb-1.5 block">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do serviço (opcional)"
                  rows={3}
                  className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-cream-300/60 mb-1.5 block">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-cream-300/60 mb-1.5 block">
                    Duração (min) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="30"
                    className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative w-14 h-7 rounded-full transition-all ${
                    formData.is_active ? 'bg-green-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                      formData.is_active ? 'left-8' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-cream-300/60">
                  {formData.is_active ? 'Serviço Ativo' : 'Serviço Inativo'}
                </span>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingService(null);
                  }}
                  className="flex-1 bg-zinc-800 text-cream-50 py-3 rounded-xl font-bold hover:bg-zinc-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-yellow-500 text-[#0a0a0a] py-3 rounded-xl font-bold hover:bg-yellow-600 transition-all"
                >
                  {editingService ? 'Salvar' : 'Criar'}
                </button>
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