import React, { useState, useEffect } from 'react';
import { resolveApiUrl, getInitials } from '../../utils/apiUrl';

export { getInitials };

/**
 * Avatar component with automatic initials fallback when avatar_url is missing
 * or fails to load (onError). Never shows broken images or demo photos.
 */
export const Avatar = ({
  src,
  alt = 'User',
  name = '',
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  shape = 'rounded-full', // 'rounded-full' | 'rounded-lg' | 'rounded-xl'
  ring = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const resolvedSrc = resolveApiUrl(src);

  // Reset error state if src changes
  useEffect(() => {
    setImageError(false);
  }, [src]);

  const displayName = name || alt || 'User';

  const initials = getInitials(displayName);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;

  const isDicebear = typeof src === 'string' && src.toLowerCase().includes('dicebear.com');

  if (resolvedSrc && !imageError && !isDicebear) {
    return (
      <img
        src={resolvedSrc}
        alt=""
        onError={() => setImageError(true)}
        className={`${selectedSizeClass} ${shape} object-cover ${ring} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${selectedSizeClass} ${shape} bg-canvas-lavender text-primary font-bold flex items-center justify-center select-none ${ring} ${className}`}
      title={displayName}
      aria-label={displayName}
    >
      <span>{initials}</span>
    </div>
  );
};

export default Avatar;
