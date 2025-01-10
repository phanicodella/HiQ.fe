import React, { useState } from 'react';
import { Resend } from 'resend';
import api from '../services/api';

export function AccessRequestForm() {
  const [formData, setFormData] = useState({
    workDomain: '',
    email: '',
    teamSize: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // List of generic email domains to block
  const genericDomains = [
    'gmail.com', 
    'googlemail.com', 
    'hotmail.com', 
    'hotmail.co.uk', 
    'outlook.com', 
    'yahoo.com', 
    'yahoo.co.uk', 
    'icloud.com', 
    'live.com', 
    'msn.com'
  ];

  const validateEmail = (email) => {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }

    // Check against generic domains
    const domain = email.split('@')[1].toLowerCase();
    if (genericDomains.includes(domain)) {
      return 'Please use a work email address';
    }

    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear any existing errors
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Send access request to backend
      await api.post('/api/access/request', formData);

      // Send notification email using Resend
      const resend = new Resend(process.env.REACT_APP_RESEND_API_KEY);
      await resend.emails.send({
        from: 'HiQ AI <hr@talentsync.tech>',
        to: 'getHiQaccess@talentsync.tech',
        subject: 'New Platform Access Request',
        html: `
          <div>
            <h2>New HiQ AI Platform Access Request</h2>
            <p><strong>Work Domain:</strong> ${formData.workDomain}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Team Size:</strong> ${formData.teamSize || 'Not specified'}</p>
            <p><strong>Additional Message:</strong></p>
            <p>${formData.message || 'No additional message'}</p>
          </div>
        `
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Access request error:', err);
      setError(err.response?.data?.error || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white shadow-2xl rounded-xl p-8 text-center">
            <svg 
              className="mx-auto h-16 w-16 text-green-500 mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Request Received!</h3>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in HiQ AI. We'll review your application 
              and get back to you within 2-3 business days.
            </p>
            <button 
              onClick={() => setSubmitted(false)}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow-2xl rounded-xl p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Request Platform Access</h2>
            <p className="mt-2 text-sm text-gray-600">Fill out the details to get started</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Domain
              </label>
              <input 
                type="text" 
                name="workDomain"
                value={formData.workDomain}
                onChange={handleChange}
                required 
                placeholder="Enter your company domain (e.g., talentsync.tech)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:shadow-sm"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Email
              </label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                required 
                placeholder="Enter your work email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:shadow-sm"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Size
              </label>
              <input 
                type="number" 
                name="teamSize"
                value={formData.teamSize}
                onChange={handleChange}
                placeholder="Number of employees (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:shadow-sm"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Message (Optional)
              </label>
              <textarea 
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us about your hiring needs"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:shadow-sm"
                rows="4"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Request Access'}
            </button>
          </form>
          
          <div className="text-center text-sm text-gray-500 mt-4">
            We'll review your request within 2-3 business days
          </div>
        </div>
      </div>
    </div>
  );
}