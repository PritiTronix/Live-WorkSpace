import React from 'react';

/**
 * AppLogo
 * Standard Live Workspace application logo component.
 * Uses brand tokens (btn-primary background, on-primary text/icon, text-primary heading).
 *
 * @param {Object} props
 * @param {boolean} [props.iconOnly=false] - Whether to render only the logo mark
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Visual size tier
 * @param {string} [props.className=''] - Additional container classes
 */
export const AppLogo = ({ iconOnly = false, size = 'md', className = '' }) => {
  const sizeMap = {
    sm: {
      box: 'w-9 h-9 rounded-lg',
      icon: 'text-xl',
      text: 'text-lg',
    },
    md: {
      box: 'w-11 h-11 rounded-xl',
      icon: 'text-2xl',
      text: 'text-2xl',
    },
    lg: {
      box: 'w-14 h-14 rounded-2xl',
      icon: 'text-3xl',
      text: 'text-3xl',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div
        className={`${currentSize.box} bg-btn-primary flex items-center justify-center text-on-primary shadow-md shadow-btn-primary/30 flex-shrink-0 transition-transform`}
        aria-hidden="true"
      >
        <span className={`material-symbols-outlined ${currentSize.icon} leading-none`}>
          grid_view
        </span>
      </div>
      {!iconOnly && (
        <span className={`font-headline font-bold tracking-tight text-text-primary ${currentSize.text}`}>
          Live Workspace
        </span>
      )}
    </div>
  );
};

export default AppLogo;
