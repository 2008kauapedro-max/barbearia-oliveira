import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg border border-cream-100/10 flex items-center justify-center text-cream-300/50 hover:text-gold-400 hover:border-gold-500/30 transition"
      title={theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
