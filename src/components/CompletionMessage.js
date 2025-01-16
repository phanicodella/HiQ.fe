import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CompletionMessage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle browser close button and navigation
    const handleBeforeUnload = (e) => {
      // Cancel the event to prevent accidental closure
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User is attempting to leave - redirect to a safe page
        navigate('/dashboard', { replace: true });
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);

  const handleClose = () => {
    // First try to close directly
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }

    // If direct close fails, navigate to dashboard
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="text-center p-8 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg 
            className="w-8 h-8 text-green-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Interview Complete!
        </h3>
        <p className="text-gray-600 mb-6">
          Thank you for completing your interview. Your responses have been recorded 
          and will be reviewed by our team.
        </p>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          You will receive feedback within 2-3 business days.
        </p>
        <button
          onClick={handleClose}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Close Interview
        </button>
      </div>
    </div>
  );
};

export default CompletionMessage;