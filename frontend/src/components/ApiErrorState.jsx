import React from 'react';
import { ServerCrash, RefreshCw } from 'lucide-react';

/**
 * ApiErrorState
 * Shared error state component conforming to design specs.
 * Renders on HTTP 503 or network failure with an explicit retry option.
 */
export const ApiErrorState = ({
  title = 'Service Temporarily Unavailable',
  message = 'The workspace service is currently unreachable or the database is not configured (Error 503: database_unavailable).',
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="w-full p-8 my-6 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-error mb-4">
        <ServerCrash className="w-7 h-7 text-error" />
      </div>
      <h3 className="font-headline text-lg font-bold text-text-primary mb-1.5">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-[#471ac8] text-white font-label-md text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying Connection...' : 'Retry Connection'}</span>
        </button>
      )}
    </div>
  );
};

export default ApiErrorState;
