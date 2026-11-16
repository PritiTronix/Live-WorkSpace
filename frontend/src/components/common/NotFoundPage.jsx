import React from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorState from '../../modules/design-system/components/ErrorState';

/**
 * NotFoundPage
 * Catch-all 404 page for unmatched routes inside the workspace shell.
 */
export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-space-md w-full">
      <div className="w-full max-w-lg">
        <ErrorState
          variant="404"
          title="Page Not Found"
          description="The page or view you requested does not exist, has been moved, or is temporarily unavailable."
          actionText="Back to Dashboard"
          onAction={() => navigate('/workspace/dashboard')}
        />
      </div>
    </div>
  );
};

export default NotFoundPage;
