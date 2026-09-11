import { Check } from 'lucide-react'
import { WIZARD_STEP_LABELS, TOTAL_STEPS } from './useAgentWizard'

interface WizardProgressProps {
  currentStep: number
  onGoToStep?: (step: number) => void
  completedSteps?: Set<number>
  /** Desabilita a navegação (ex.: enquanto salva) */
  disabled?: boolean
}

export function WizardProgress({ currentStep, onGoToStep, completedSteps, disabled }: WizardProgressProps) {
  const percent = Math.round((currentStep / TOTAL_STEPS) * 100)

  return (
    <nav className="mb-8" aria-label="Etapas do cadastro">
      {/* Mobile: compact progress bar */}
      <div className="flex items-center justify-between mb-2 sm:hidden">
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Etapa {currentStep} de {TOTAL_STEPS}
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          {WIZARD_STEP_LABELS[currentStep]}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full sm:hidden"
        style={{ background: 'var(--border)' }}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={currentStep}
        aria-valuetext={`Etapa ${currentStep} de ${TOTAL_STEPS}: ${WIZARD_STEP_LABELS[currentStep]}`}
      >
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, var(--accent-dark), var(--accent-light))',
          }}
        />
      </div>

      {/* Desktop: step indicators */}
      <ol className="hidden sm:flex items-center gap-0 list-none p-0 m-0">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => {
          const isCompleted = completedSteps?.has(step) || step < currentStep
          const isCurrent = step === currentStep
          const isClickable = !!onGoToStep && !disabled && !isCurrent && (isCompleted || step <= currentStep)
          const label = WIZARD_STEP_LABELS[step]

          return (
            <li key={step} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && onGoToStep?.(step)}
                disabled={!isClickable}
                aria-label={`Etapa ${step}: ${label}${isCompleted && !isCurrent ? ' (concluída)' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                title={label}
                className={`
                  relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold
                  transition-all duration-200 flex-shrink-0
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  ${isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-500'}
                `}
                style={{
                  background: isCompleted || isCurrent ? 'var(--accent)' : 'var(--bg-card)',
                  border: isCompleted || isCurrent ? 'none' : '2px solid var(--border)',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(245,158,11,0.2)' : 'none',
                }}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{step}</span>
                )}
              </button>

              {step < TOTAL_STEPS && (
                <div
                  aria-hidden="true"
                  className="flex-1 h-0.5 transition-all duration-500"
                  style={{
                    background: step < currentStep ? 'var(--accent)' : 'var(--border)',
                  }}
                />
              )}
            </li>
          )
        })}
      </ol>

      {/* Desktop: current step label */}
      <div className="hidden sm:flex items-center justify-between mt-2" aria-live="polite">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Etapa {currentStep} de {TOTAL_STEPS}
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
          {WIZARD_STEP_LABELS[currentStep]}
        </span>
      </div>
    </nav>
  )
}
