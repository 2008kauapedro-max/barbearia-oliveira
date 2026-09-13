import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Check, Download, Smartphone, MoreVertical } from 'lucide-react';

export default function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [tutorial, setTutorial] = useState<null | 'ios' | 'android'>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem('install_dismissed');
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (dismissed || standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const t = setTimeout(() => setShowBanner(true), 2500);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem('install_dismissed', '1');
    setShowBanner(false);
  };

  const handleAndroid = async () => {
    if (deferredPrompt) {
      setShowBanner(false);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        dismiss();
      } else {
        setShowBanner(true);
      }
      setDeferredPrompt(null);
    } else {
      setTutorial('android');
    }
  };

  const handleIos = () => setTutorial('ios');

  return (
    <>
      {/* BANNER DE INSTALAÇÃO */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] max-w-md mx-auto animate-fade-in">
          <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl p-4 shadow-2xl shadow-black/60">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-cream-50 text-sm">Instale o app da Barbearia</p>
                <p className="text-xs text-cream-300/50 mt-0.5">Acesso rápido direto da sua tela inicial</p>
              </div>
              <button onClick={dismiss} className="text-cream-300/40 hover:text-cream-50 p-1">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAndroid} className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-[#0a0a0a] py-2.5 rounded-xl text-sm font-bold hover:bg-yellow-600 transition">
                <Download size={16} /> Android
              </button>
              <button onClick={handleIos} className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 text-cream-50 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-700 transition">
                <Smartphone size={16} /> iPhone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TUTORIAL DE INSTALAÇÃO */}
      {tutorial && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-cream-50">
                {tutorial === 'ios' ? 'Instalar no iPhone' : 'Instalar no Android'}
              </h3>
              <button onClick={() => setTutorial(null)} className="text-cream-300/40 p-1">
                <X size={18} />
              </button>
            </div>

            {tutorial === 'ios' ? (
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Share size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-sm text-cream-300/70">
                    No navegador <b className="text-cream-50">Safari</b>, toque no botão <b className="text-cream-50">Compartilhar</b> (o quadrado com a seta para cima) na parte de baixo da tela.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <PlusSquare size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-sm text-cream-300/70">
                    Role o menu que abriu e toque em <b className="text-cream-50">"Adicionar à Tela de Início"</b>.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Check size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-sm text-cream-300/70">
                    Toque em <b className="text-cream-50">Adicionar</b> no canto superior direito. Pronto! O app vai aparecer na sua tela inicial. 🎉
                  </p>
                </li>
              </ol>
            ) : (
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <MoreVertical size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-sm text-cream-300/70">
                    No navegador <b className="text-cream-50">Chrome</b>, toque no menu dos <b className="text-cream-50">3 pontinhos (⋮)</b> no canto superior direito.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Download size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-sm text-cream-300/70">
                    Toque em <b className="text-cream-50">"Instalar app"</b> ou <b className="text-cream-50">"Adicionar à tela inicial"</b>.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Check size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-sm text-cream-300/70">
                    Confirme a instalação. Pronto! O app vai aparecer na sua tela inicial. 🎉
                  </p>
                </li>
              </ol>
            )}

            <button onClick={() => setTutorial(null)} className="w-full mt-6 bg-zinc-800 text-cream-50 py-3 rounded-xl font-bold text-sm hover:bg-zinc-700 transition">
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}