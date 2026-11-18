import React from 'react';
import { Zap, Ticket, Users, ShieldCheck, BarChart3 } from 'lucide-react';
import AppLogo from './AppLogo';
import { AUTH_TEXT, AUTH_FEATURES } from '../constants/authConstants';

/**
 * AuthBrandShowcase
 * Desktop left column hero showcase component.
 * Flexibly adapts to viewport height:
 * - Scales headlines, illustration, and feature badges proportionally.
 * - Hides plant and mug before shrinking text on short viewports (< 760px).
 * - Laptop illustration scales within available space without pushing feature row.
 * - Feature row remains 100% visible pinned to the bottom.
 */
export const AuthBrandShowcase = () => {
  const getFeatureIcon = (icon) => {
    switch (icon) {
      case 'zap':
        return <Zap className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" strokeWidth={2} />;
      case 'ticket':
        return <Ticket className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" strokeWidth={2} />;
      case 'users':
        return <Users className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" strokeWidth={2} />;
      case 'shield-check':
        return <ShieldCheck className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" strokeWidth={2} />;
      case 'bar-chart':
      default:
        return <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" strokeWidth={2} />;
    }
  };

  return (
    <section
      className="flex flex-col justify-between h-full min-h-0 py-1 w-full max-w-[620px]"
      data-purpose="hero-showcase"
      aria-label="Product Showcase"
    >
      <style>{`
        @media (max-height: 760px) and (min-width: 1024px) {
          .auth-plant, .auth-mug {
            display: none !important;
          }
          .auth-laptop-wrapper {
            transform: scale(0.85);
            transform-origin: center center;
          }
        }
        @media (max-height: 680px) and (min-width: 1024px) {
          .auth-laptop-wrapper {
            transform: scale(0.72);
            transform-origin: center center;
          }
        }
      `}</style>

      {/* ── Brand Header ── */}
      <header className="flex items-center flex-shrink-0 mb-1 lg:mb-2" data-purpose="brand-header">
        <AppLogo size="md" />
      </header>

      {/* ── Headline & Subtext ── */}
      <div className="flex-shrink-0 space-y-1 lg:space-y-1.5" data-purpose="hero-copy">
        <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl xl:text-[2.75rem] font-extrabold tracking-tight leading-[1.12]">
          <span className="text-text-primary block">{AUTH_TEXT.headlineMain}</span>
          <span className="text-btn-primary block">{AUTH_TEXT.headlineAccent}</span>
        </h1>
        <p className="font-body text-xs sm:text-sm lg:text-base text-text-secondary max-w-xl font-normal leading-relaxed line-clamp-2">
          {AUTH_TEXT.subtext}
        </p>
      </div>

      {/* ── Decorative Laptop Dashboard Illustration ── */}
      <div
        aria-hidden="true"
        className="flex-1 min-h-0 flex items-center justify-center my-auto relative w-full overflow-visible select-none pointer-events-none py-1"
        data-purpose="product-preview"
      >
        {/* Potted Plant Decoration (Left) */}
        <div className="auth-plant absolute -left-6 sm:-left-8 bottom-2 z-20 flex flex-col items-center drop-shadow-md transition-all">
          {/* Foliage SVG */}
          <svg className="w-16 h-24 lg:w-20 lg:h-28 -mb-2 filter drop-shadow-sm" fill="none" viewBox="0 0 100 120">
            <path d="M50 115 C50 70 52 40 50 15" stroke="#378b4e" strokeLinecap="round" strokeWidth="4" />
            <path d="M50 18 C38 12 36 28 50 38 C64 28 62 12 50 18 Z" fill="#4ade80" />
            <path d="M50 32 C30 24 22 46 48 54 C60 48 58 35 50 32 Z" fill="#22c55e" />
            <path d="M50 48 C72 38 78 62 52 70 C42 64 42 52 50 48 Z" fill="#16a34a" />
            <path d="M48 64 C24 55 18 80 46 88 C54 82 52 68 48 64 Z" fill="#15803d" />
            <path d="M50 78 C74 70 80 94 52 102 C44 95 44 82 50 78 Z" fill="#22c55e" />
          </svg>
          {/* White Ceramic Pot */}
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-b from-white via-slate-100 to-slate-200 rounded-b-2xl rounded-t-sm shadow-md border-t-2 border-slate-300 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-slate-300 to-transparent opacity-60" />
          </div>
        </div>

        {/* Laptop Wrapper */}
        <div className="auth-laptop-wrapper relative mx-auto w-full max-w-[480px] z-10 transition-transform duration-200">
          {/* Bezel & Screen */}
          <div className="bg-[#191d28] rounded-t-xl sm:rounded-t-2xl p-2 sm:p-2.5 pb-1.5 shadow-[0_20px_40px_-12px_rgba(22,27,65,0.25),0_8px_20px_-4px_rgba(96,64,240,0.1)] border border-slate-700/60 relative">
            {/* Webcam */}
            <div className="w-1.5 h-1.5 bg-slate-600 rounded-full mx-auto mb-1.5" />

            {/* Dashboard UI Screen (Clean neutral placeholder bars & donuts, no personal names, no real numbers) */}
            <div className="bg-white rounded-lg overflow-hidden flex min-h-[200px] lg:min-h-[230px] text-xs shadow-inner">
              {/* Mini App Sidebar */}
              <aside className="w-20 lg:w-24 bg-[#191D33] text-slate-300 p-2 lg:p-2.5 flex flex-col justify-between shrink-0">
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-white font-bold text-[10px] pb-1 border-b border-slate-700">
                    <div className="w-3.5 h-3.5 rounded bg-btn-primary flex items-center justify-center text-[8px] text-white font-headline">
                      W
                    </div>
                    <span className="w-8 h-1.5 bg-slate-400 rounded-sm" />
                  </div>
                  {/* Active Nav Pill */}
                  <div className="bg-btn-primary text-white text-[8px] lg:text-[9px] font-semibold py-0.5 lg:py-1 px-1.5 lg:px-2 rounded-md flex items-center justify-between">
                    <span>Home</span>
                  </div>
                  {/* Placeholder Nav items */}
                  <nav className="space-y-1 text-[8px] text-slate-400 px-1 pt-0.5">
                    <div className="flex items-center space-x-1">
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="w-7 h-1 bg-slate-600 rounded-sm" />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="w-9 h-1 bg-slate-600 rounded-sm" />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="w-6 h-1 bg-slate-600 rounded-sm" />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="w-8 h-1 bg-slate-600 rounded-sm" />
                    </div>
                  </nav>
                </div>
                <div className="pt-1.5 border-t border-slate-800">
                  <div className="w-10 h-1 bg-slate-700 rounded-sm" />
                </div>
              </aside>

              {/* Main Content inside laptop */}
              <div className="flex-1 bg-[#F9FAFC] p-2 lg:p-2.5 flex flex-col justify-between space-y-2 overflow-hidden">
                {/* Topbar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 text-[8px] w-28 lg:w-32 space-x-1">
                    <svg className="w-2 h-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                    </svg>
                    <span className="w-12 h-1 bg-slate-200 rounded-full" />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-300 border border-purple-200" />
                  </div>
                </div>

                {/* Neutral line */}
                <div className="flex items-center space-x-2 pt-0.5">
                  <span className="w-24 h-2 bg-slate-800 rounded-sm" />
                  <span className="w-12 h-1.5 bg-slate-300 rounded-sm" />
                </div>

                {/* 4 Neutral Metric Cards */}
                <div className="grid grid-cols-4 gap-1">
                  <div className="bg-blue-50/70 p-1 rounded border border-blue-100 flex flex-col space-y-1">
                    <div className="w-5 h-1.5 bg-blue-300 rounded-sm" />
                    <div className="w-7 h-1 bg-slate-400 rounded-sm" />
                  </div>
                  <div className="bg-indigo-50/70 p-1 rounded border border-indigo-100 flex flex-col space-y-1">
                    <div className="w-6 h-1.5 bg-indigo-300 rounded-sm" />
                    <div className="w-7 h-1 bg-slate-400 rounded-sm" />
                  </div>
                  <div className="bg-rose-50/70 p-1 rounded border border-rose-100 flex flex-col space-y-1">
                    <div className="w-5 h-1.5 bg-rose-300 rounded-sm" />
                    <div className="w-6 h-1 bg-slate-400 rounded-sm" />
                  </div>
                  <div className="bg-emerald-50/70 p-1 rounded border border-emerald-100 flex flex-col space-y-1">
                    <div className="w-6 h-1.5 bg-emerald-300 rounded-sm" />
                    <div className="w-6 h-1 bg-slate-400 rounded-sm" />
                  </div>
                </div>

                {/* 2 Neutral Donut Chart Cards */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {/* Tasks Donut */}
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div
                      className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: 'conic-gradient(#F4B840 0deg 95deg, #4976F5 95deg 235deg, #48C78E 235deg 360deg)',
                      }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full" />
                    </div>
                    <div className="flex flex-col space-y-0.5 pl-1">
                      <div className="w-8 h-1 bg-slate-700 rounded-sm mb-0.5" />
                      <div className="flex items-center space-x-1">
                        <span className="w-1 h-1 rounded-full bg-blue-500" />
                        <span className="w-5 h-0.5 bg-slate-300 rounded-sm" />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        <span className="w-7 h-0.5 bg-slate-300 rounded-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Tickets Donut */}
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div
                      className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: 'conic-gradient(#EE5D50 0deg 110deg, #F98B38 110deg 260deg, #F6C844 260deg 360deg)',
                      }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full" />
                    </div>
                    <div className="flex flex-col space-y-0.5 pl-1">
                      <div className="w-9 h-1 bg-slate-700 rounded-sm mb-0.5" />
                      <div className="flex items-center space-x-1">
                        <span className="w-1 h-1 rounded-full bg-rose-500" />
                        <span className="w-6 h-0.5 bg-slate-300 rounded-sm" />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-1 h-1 rounded-full bg-orange-400" />
                        <span className="w-6 h-0.5 bg-slate-300 rounded-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Laptop Base / Keyboard Hinge */}
          <div className="relative bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 h-2 rounded-b-md shadow-md flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-400 rounded-full" />
          </div>
          <div className="mx-auto w-[108%] -ml-[4%] h-1.5 bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 rounded-b-xl shadow-lg border-t border-slate-300" />
        </div>

        {/* Purple Ceramic Mug (Right) */}
        <div className="auth-mug absolute -right-3 sm:-right-4 bottom-2 z-20 drop-shadow-md transition-all">
          <div className="relative flex items-center">
            <div className="w-11 h-14 lg:w-14 lg:h-16 bg-gradient-to-b from-[#7555FA] to-[#5538D4] rounded-b-2xl rounded-t-sm flex flex-col items-center justify-center shadow-inner relative">
              <span className="text-white font-extrabold text-xs lg:text-sm tracking-tighter opacity-95 font-headline">
                W
              </span>
            </div>
            <div className="w-3 h-7 lg:w-3.5 lg:h-9 -ml-1 border-4 border-l-0 border-[#6545E4] rounded-r-xl" />
          </div>
        </div>
      </div>

      {/* ── Row of Five Feature Badges with Thin Dividers ── */}
      <footer className="pt-1.5 lg:pt-2 w-full flex-shrink-0" data-purpose="features-list">
        <div className="grid grid-cols-5 divide-x divide-border-subtle text-center">
          {AUTH_FEATURES.map((feature, idx) => (
            <div
              key={feature.id}
              className={`flex flex-col items-center justify-start space-y-1 px-1 sm:px-1.5 group cursor-default transition-all duration-150 ${
                idx === 0 ? 'pl-0' : ''
              } ${idx === AUTH_FEATURES.length - 1 ? 'pr-0' : ''}`}
            >
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-purple-100 text-btn-primary flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs">
                {getFeatureIcon(feature.icon)}
              </div>
              <span className="font-label-sm text-[10px] lg:text-[11px] font-semibold text-text-primary leading-tight whitespace-pre-line">
                {feature.name}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </section>
  );
};

export default AuthBrandShowcase;
