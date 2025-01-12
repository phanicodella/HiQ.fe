// frontend/src/components/auth/VerifyEmail.js

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export function VerifyEmail() {
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState(null);
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      await api.post('/api/auth/verify-email', { token });
      setStatus('verified');
      
      // Auto-redirect after successful verification
      setTimeout(() => {
        if (user) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }, 3000);
    } catch (err) {
      console.error('Email verification error:', err);
      setStatus('error');
      setError(err.response?.data?.message || 'Failed to verify email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {status === 'verifying' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Verifying your email...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your email address.
            </p>
          </div>
        )}

        {status === 'verified' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
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
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Email Verified!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your email has been successfully verified. You will be redirected shortly.
            </p>
            <div className="mt-4">
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Click here if you're not redirected automatically
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Verification Failed
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error || 'Could not verify your email. Please try again.'}
            </p>
            <div className="mt-4 space-y-2">
              <Link
                to="/register"
                className="text-indigo-600 hover:text-indigo-500 block"
              >
                Register again
              </Link>
              <Link
                to="/support"
                className="text-indigo-600 hover:text-indigo-500 block"
              >
                Contact support
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}