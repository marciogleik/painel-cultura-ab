import { Check } from 'lucide-react'
import { WIZARD_STEP_LABELS, TOTAL_STEPS } from './useAgentWizard'

interface WizardProgressProps {
  currentStep: number
  onGoToStep?: (step: number) => void
  completedSteps?: Set<number>
}

export function WizardProgress({ currentStep, onGoToStep, completedSteps }: WizardProgressProps) {
  return (
    <div className="mb-8">
      {/* Mobile: compact progress bar */}
      <div className="flex items-center justify-between mb-2 sm:hidden">
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Etapa {currentStep} de {TOTAL_STEPS}
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          {WIZARD_STEP_LABELS[currentStep]}
        </span>
      </div>
      <div className="h-1.5 rounded-full sm:hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${(currentStep / TOTAL_STEPS) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent-dark), var(--accent-light))',
          }}
        />
      </div>

      {/* Desktop: step indicators */}
      <div className="hidden sm:flex items-center gap-0">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => {
          const isCompleted = completedSteps?.has(step) || step < currentStep
          const isCurrent = step === currentStep
          const isClickable = onGoToStep && (isCompleted || step <= currentStep)

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Step dot */}
              <button
                onClick={() => isClickable && onGoToStep?.(step)}
                disabled={!isClickable}
                className={`
                  relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold
                  transition-all duration-200 flex-shrink-0
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  ${isCompleted
                    ? 'text-slate-900'
                    : isCurrent
                    ? 'text-slate-900'
                    : 'text-slate-500'}
                `}
                style={{
                  background: isCompleted
                    ? 'var(--accent)'
                    : isCurrent
                    ? 'var(--accent)'
                    : 'var(--bg-card)',
                  border: isCompleted || isCurrent
                    ? 'none'
                    : '2px solid var(--border)',
                  boxShadow: isCurrent
                    ? '0 0 0 4px rgba(245,158,11,0.2)'
                    : 'none',
                }}
                title={WIZARD_STEP_LABELS[step]}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  step
                )}
              </button>

              {/* Connector line */}
              {step < TOTAL_STEPS && (
                <div
                  className="flex-1 h-0.5 transition-all duration-500"
                  style={{
                    background: step < currentStep ? 'var(--accent)' : 'var(--border)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: current step label */}
      <div className="hidden sm:flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Etapa {currentStep} de {TOTAL_STEPS}
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
          {WIZARD_STEP_LABELS[currentStep]}
        </span>
      </div>
    </div>
  )
}
