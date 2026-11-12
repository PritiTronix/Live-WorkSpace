import React from 'react';
import { HelpCircle, ArrowDown, Target } from 'lucide-react';

/**
 * RCAFiveWhysEditor
 * 5-Whys Root Cause Methodology component.
 * Supports both interactive editing (Form mode) and read-only structured flow (View mode).
 */
export const RCAFiveWhysEditor = ({
  whys = ['', '', '', '', ''],
  onChange,
  isReadOnly = false,
}) => {
  const currentWhys = whys && whys.length === 5 ? whys : ['', '', '', '', ''];

  const handleChange = (index, value) => {
    if (onChange) {
      const updated = [...currentWhys];
      updated[index] = value;
      onChange(updated);
    }
  };

  const steps = [
    { num: 1, label: 'Why did the incident occur?', placeholder: 'Initial immediate symptom or failure...' },
    { num: 2, label: 'Why did that happen?', placeholder: 'Direct trigger or component failure...' },
    { num: 3, label: 'Why was that component affected?', placeholder: 'System dependency, concurrency, or load...' },
    { num: 4, label: 'Why was that not caught or isolated?', placeholder: 'Missing alert, circuit breaker, or test...' },
    { num: 5, label: 'Root Cause Conclusion', placeholder: 'Underlying architectural or process deficiency...' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-headline text-sm font-bold text-text-primary flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-btn-primary" />
          <span>5-Whys Root Cause Methodology</span>
        </h3>
        <span className="text-[11px] text-text-muted">Iterative interrogative technique</span>
      </div>

      <div className="space-y-2 relative">
        {steps.map((step, idx) => {
          const isLast = idx === 4;
          return (
            <div key={step.num} className="relative">
              <div
                className={`p-3 rounded-xl border transition-all text-xs ${
                  isLast
                    ? 'bg-primary/5 border-primary/30 shadow-xs'
                    : 'bg-canvas-main/60 border-border-subtle'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`font-semibold flex items-center gap-1.5 ${
                      isLast ? 'text-primary' : 'text-text-primary'
                    }`}
                  >
                    {isLast ? (
                      <Target className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-text-secondary flex items-center justify-center text-[10px] font-bold">
                        {step.num}
                      </span>
                    )}
                    <span>{step.label}</span>
                  </span>
                </div>

                {isReadOnly ? (
                  <p className="text-text-secondary text-xs leading-relaxed">
                    {currentWhys[idx] || (
                      <span className="text-text-muted italic">Not documented</span>
                    )}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={currentWhys[idx] || ''}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    placeholder={step.placeholder}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border-subtle bg-surface-card text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-btn-primary/20 focus:border-btn-primary"
                  />
                )}
              </div>

              {!isLast && (
                <div className="flex justify-center my-0.5">
                  <ArrowDown className="w-3 h-3 text-text-muted" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RCAFiveWhysEditor;
