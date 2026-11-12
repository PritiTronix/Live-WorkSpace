import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, FileQuestion, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Reusable Error State Components (Prompt 87 / Screen 25)
 * Variants: '500', '404', 'network', 'empty-search', 'inline'
 */
export const ErrorState = ({
  variant = '500',
  title,
  description,
  onRetry,
  actionText,
  onAction,
  isRetrying = false,
  className = '',
}) => {
  const navigate = useNavigate();

  const configs = {
    '500': {
      icon: AlertTriangle,
      iconBg: 'bg-error-container/40 text-error',
      defaultTitle: 'Something Went Wrong',
      defaultDesc: 'We encountered an unexpected server error while fetching your workspace data. Our engineers have been alerted.',
      defaultAction: 'Retry Connection',
    },
    '404': {
      icon: FileQuestion,
      iconBg: 'bg-canvas-lavender text-btn-primary',
      defaultTitle: 'Resource Not Found',
      defaultDesc: 'The ticket, project, or resource you requested does not exist or has been archived.',
      defaultAction: 'Return to Dashboard',
    },
    'network': {
      icon: WifiOff,
      iconBg: 'bg-amber-100 text-amber-600',
      defaultTitle: 'Network Connection Lost',
      defaultDesc: 'Unable to connect to the Live Workspace backend service. Check your internet connection and try again.',
      defaultAction: 'Reconnect Now',
    },
    'empty-search': {
      icon: FileQuestion,
      iconBg: 'bg-canvas-lavender text-text-muted',
      defaultTitle: 'No Matching Results',
      defaultDesc: 'Try adjusting your filters, search keywords, or check for typos in your query.',
      defaultAction: 'Clear Filters',
    },
  };

  const activeConfig = configs[variant] || configs['500'];
  const Icon = activeConfig.icon;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (onRetry) {
      onRetry();
    } else if (variant === '404') {
      navigate('/workspace/dashboard');
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-border-subtle shadow-sm ${className}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${activeConfig.iconBg}`}>
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="font-headline text-headline-md text-text-primary tracking-tight mb-2">
        {title || activeConfig.defaultTitle}
      </h3>

      <p className="font-body text-body-md text-text-secondary max-w-md mb-6 leading-relaxed">
        {description || activeConfig.defaultDesc}
      </p>

      <div className="flex items-center gap-3">
        {variant === '404' && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-lg border border-border-subtle bg-white hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        )}

        {(onRetry || onAction || variant !== 'inline') && (
          <button
            type="button"
            disabled={isRetrying}
            onClick={handleAction}
            className="px-5 py-2.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-md text-label-md transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center gap-2 disabled:opacity-60"
          >
            {onRetry && (
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            )}
            <span>{actionText || activeConfig.defaultAction}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;

