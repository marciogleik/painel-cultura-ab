import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-white/5 transition-all flex items-center justify-center ${className}`}
      aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}
