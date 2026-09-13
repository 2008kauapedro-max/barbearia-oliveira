import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react';

export default function InternalLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
            // Bloqueia senha fraca no cadastro
      if (mode === 'register') {
        const forte = password.length >= 10 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
        if (!forte) {
          setError('Senha fraca! Use pelo menos 10 caracteres, com letras e números.');
          setLoading(false);
          return;
        }
      }

      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError('E-mail ou senha incorretos.');
          setLoading(false);
          return;
        }
        navigate('/', { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        if (data.user) {
          const { data: barbershopData } = await supabase
            .from('barbershops').select('id').eq('slug', 'barbearia-oliveira').single();
          
          if (!barbershopData) {
            setError('Barbearia não encontrada.');
            setLoading(false);
            return;
          }
          
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            barbershop_id: barbershopData.id,
            role: 'CLIENT',
            full_name: fullName,
            phone: phone,
          });
          
          if (profileError) {
            setError('Erro ao criar perfil.');
            setLoading(false);
            return;
          }
          await signIn(email, password);
          navigate('/cliente', { replace: true });
        }
      }
    } catch (err) {
      setError('Erro ao fazer login.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/login',
      });
      if (error) {
        setError('Erro ao enviar e-mail.');
        setLoading(false);
        return;
      }
      setResetSuccess(true);
      setLoading(false);
    } catch (err) {
      setError('Erro ao enviar e-mail.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* TEXTURA DE FUNDO */}
      <div 
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage: 'url("/textura.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/30 via-[#0a0a0a]/50 to-[#0a0a0a]/80 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-5">
            <img src="/logo.png" alt="Logo Barbearia" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-cream-50">
            {showResetForm ? 'Recuperar senha' : mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </h1>
          <p className="text-sm text-cream-300/50 mt-2">
            {showResetForm 
              ? 'Informe seu e-mail para receber instruções' 
              : mode === 'login'
              ? 'Entre com suas credenciais'
              : 'Preencha seus dados para criar uma conta'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {resetSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-4">
            E-mail de recuperação enviado!
          </div>
        )}

        {!showResetForm ? (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Nome completo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-300/30" />
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome completo" autoComplete="off" className="w-full bg-zinc-900/80 backdrop-blur-sm border border-cream-100/10 rounded-xl pl-10 pr-4 py-3.5 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition" required />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Telefone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" autoComplete="off" className="w-full bg-zinc-900/80 backdrop-blur-sm border border-cream-100/10 rounded-xl px-4 py-3.5 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition" required />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-300/30" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="off" name="email_field" className="w-full bg-zinc-900/80 backdrop-blur-sm border border-cream-100/10 rounded-xl pl-10 pr-4 py-3.5 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition" required />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-300/30" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Mínimo 10 caracteres, letras e números' : 'Sua senha'} autoComplete="new-password" name="password_field" className="w-full bg-zinc-900/80 backdrop-blur-sm border border-cream-100/10 rounded-xl pl-10 pr-11 py-3.5 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition" required minLength={mode === 'register' ? 10 : undefined} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-300/30 hover:text-yellow-400 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-3.5 rounded-xl hover:bg-yellow-600 transition-all disabled:opacity-50">
              {loading ? (mode === 'login' ? 'Entrando...' : 'Criando conta...') : (mode === 'login' ? 'Entrar' : 'Criar conta')}
            </button>

            {mode === 'login' ? (
              <>
                <button type="button" onClick={() => setShowResetForm(true)} className="w-full text-center text-sm text-cream-300/40 hover:text-yellow-400 transition">Esqueci minha senha</button>
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-cream-100/10"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0a]/80 px-2 text-cream-300/30">Ou</span></div>
                </div>
                <button type="button" onClick={() => { setMode('register'); setError(''); }} className="w-full text-center text-sm text-yellow-400 hover:text-yellow-300 font-medium transition">Criar conta</button>
              </>
            ) : (
              <button type="button" onClick={() => { setMode('login'); setError(''); }} className="w-full text-center text-sm text-cream-300/40 hover:text-yellow-400 transition">Já tenho uma conta</button>
            )}
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4" autoComplete="off">
            <div>
              <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-300/30" />
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="seu@email.com" autoComplete="off" className="w-full bg-zinc-900/80 backdrop-blur-sm border border-cream-100/10 rounded-xl pl-10 pr-4 py-3.5 text-cream-50 placeholder:text-cream-300/20 focus:outline-none focus:border-yellow-500/50 transition" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-3.5 rounded-xl hover:bg-yellow-600 transition-all disabled:opacity-50">
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </button>
            <button type="button" onClick={() => { setShowResetForm(false); setResetSuccess(false); setError(''); }} className="w-full text-center text-sm text-cream-300/40 hover:text-yellow-400 transition">Voltar ao login</button>
          </form>
        )}
      </div>
    </div>
  );
}