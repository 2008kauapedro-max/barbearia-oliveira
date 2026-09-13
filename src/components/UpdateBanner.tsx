import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const attach = async () => {
      const registration = await navigator.serviceWorker.ready;

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowBanner(true);
            }
          });
        }
      });

      // Verifica a cada 10 minutos
      setInterval(() => registration.update(), 600000);
    };

    // Verifica também quando o usuário volta pra aba/app
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then(r => r?.update());
      }
    };

    attach();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      setTimeout(() => window.location.reload(), 500);
    } else {
      window.location.reload();
    }
  };

  if (updating) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200]">
        <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl p-8 text-center max-w-sm mx-4">
          <RefreshCw size={48} className="text-yellow-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-bold text-cream-50 mb-2">Atualizando...</h3>
          <p className="text-sm text-cream-300/60">Isso leva poucos segundos. Você continua logado.</p>
        </div>
      </div>
    );
  }

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-[#0a0a0a] shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} />
          <span className="text-sm font-medium">Nova versão disponível!</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleUpdate} className="bg-[#0a0a0a] text-cream-50 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-zinc-800 transition">
            Atualizar agora
          </button>
          <button onClick={() => setShowBanner(false)} className="p-1 hover:bg-black/10 rounded transition">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}