import React from 'react';
import { SOCIAL_PROVIDERS, AUTH_TEXT } from '../constants/authConstants';

/**
 * SocialAuthButtons
 * Displays Google, Microsoft, and GitHub authentication buttons matching the Stitch redesign.
 * Providers without active backend OAuth flows are securely disabled with "Not available yet" tooltips.
 */
export const SocialAuthButtons = () => {
  return (
    <div className="grid grid-cols-3 gap-3" data-purpose="social-login" role="group" aria-label="Social Authentication Options">
      {SOCIAL_PROVIDERS.map((provider) => {
        const isAvailable = Boolean(provider.available);
        const tooltip = AUTH_TEXT.oauthUnavailableTooltip;

        return (
          <div key={provider.id} className="relative group">
            <button
              type="button"
              disabled={!isAvailable}
              aria-disabled={!isAvailable}
              aria-label={`Continue with ${provider.name}${!isAvailable ? ` (${tooltip})` : ''}`}
              title={!isAvailable ? tooltip : `Continue with ${provider.name}`}
              className={`w-full h-11 flex items-center justify-center rounded-xl border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-btn-primary/40 focus-visible:border-btn-primary ${
                isAvailable
                  ? 'border-border-subtle bg-white hover:bg-canvas-lavender hover:border-slate-300 active:scale-[0.98] shadow-sm cursor-pointer'
                  : 'border-border-subtle bg-slate-50/80 text-text-muted opacity-60 cursor-not-allowed'
              }`}
            >
              {provider.id === 'google' && (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
              )}

              {provider.id === 'microsoft' && (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M1 1h10v10H1z" fill="#F25022" />
                  <path d="M1 13h10v10H1z" fill="#00A4EF" />
                  <path d="M13 1h10v10H13z" fill="#7FBA00" />
                  <path d="M13 13h10v10H13z" fill="#FFB900" />
                </svg>
              )}

              {provider.id === 'github' && (
                <svg className="w-5 h-5 flex-shrink-0 fill-current text-text-primary" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              )}
            </button>

            {/* Hover Tooltip when unavailable */}
            {!isAvailable && (
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-text-primary text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 shadow-md z-30"
              >
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text-primary" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SocialAuthButtons;
