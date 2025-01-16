// frontend/src/components/AccessRequestForm.js
import React, { useState } from 'react';
import api from '../services/api';

const SimpleCaptcha = ({ onVerify }) => {
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const generateCaptcha = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setCaptchaText(result);
    setUserInput('');
    setIsValid(false);
    onVerify(false); // Reset verification state when generating new captcha
  };

  React.useEffect(() => {
    generateCaptcha();
  }, []);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleVerify = () => {
    const isCorrect = userInput === captchaText;
    setIsValid(isCorrect);
    setAttempts(prev => prev + 1);
    
    if (isCorrect) {
      onVerify(true);
    } else {
      if (attempts >= 2) {
        generateCaptcha();
        setAttempts(0);
      }
      onVerify(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="relative">
          <div 
            className="text-2xl font-mono tracking-wider select-none"
            style={{
              backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              padding: '1rem',
              textShadow: '2px 2px 3px rgba(0,0,0,0.3)',
              letterSpacing: '0.5em'
            }}
          >
            {captchaText}
          </div>
          
          <button
            onClick={generateCaptcha}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            type="button"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          value={userInput}
          onChange={handleInputChange}
          placeholder="Enter captcha text"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
        />
        <button
          onClick={handleVerify}
          type="button"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Verify
        </button>
      </div>

      {attempts > 0 && !isValid && (
        <p className="text-red-600 text-sm">
          {attempts >= 2 ? 'Too many attempts. New captcha generated.' : 'Incorrect captcha. Please try again.'}
        </p>
      )}
    </div>
  );
};

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
  const [captchaVerified, setCaptchaVerified] = useState(false);

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }

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
    
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      setError('Please complete the captcha verification');
      return;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (!formData.workDomain.trim()) {
      setError('Work domain is required');
      return;
    }

  setIsSubmitting(true);
  setError('');

    try {
      const payload = {
        workDomain: formData.workDomain.trim(),
        email: formData.email.toLowerCase().trim(),
        teamSize: formData.teamSize ? parseInt(formData.teamSize) : undefined,
        message: formData.message || undefined
      };

      console.log('Sending payload:', payload);

      const response = await api.post('/api/access/request', payload);
      setSubmitted(true);

    } catch (err) {
      console.error('Access request error:', err);
      if (err.response?.data?.error === 'A request from this email is already pending') {
        setError('You already have a pending access request. Please wait for admin approval.');
      } else {
        setError(
          err.response?.data?.error || 
          err.response?.data?.details || 
          err.message || 
          'Failed to submit request. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptchaVerify = (success) => {
    setCaptchaVerified(success);
    if (!success) {
      setError('Captcha verification failed. Please try again.');
    } else {
      setError('');
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
                Company's website
              </label>
              <input 
                type="text" 
                name="workDomain"
                value={formData.workDomain}
                onChange={handleChange}
                required 
                placeholder="Enter your company domain (e.g., talentsync.tech)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:shadow-sm text-gray-900 bg-white"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:shadow-sm text-gray-900 bg-white"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:shadow-sm text-gray-900 bg-white"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:shadow-sm text-gray-900 bg-white"
                rows="4"
              />
            </div>
            <p className="text-sm text-red-800 italic mt-4 mb-2">
            Note: Our captcha verification is case-sensitive
          </p>
            <div className="mt-2">
              <SimpleCaptcha onVerify={handleCaptchaVerify} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting || !captchaVerified}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
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