// src/components/AccessRequestForm.js
import React, { useState } from 'react';
import api from '../services/api';

export function AccessRequestForm() {
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    jobTitle: '',
    teamSize: '',
    interviewsPerMonth: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/api/access-requests', formData);
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <h3 className="text-2xl font-bold text-green-600 mb-4">Request Received!</h3>
        <p className="text-gray-600">
          Thank you for your interest in HiQ AI. We'll review your application and get back to you within 2-3 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow">
      {/* Form fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Company Name</label>
        <input
          type="text"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          value={formData.companyName}
          onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
        />
      </div>

      {/* Add other form fields similarly */}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {isSubmitting ? 'Submitting...' : 'Request Access'}
      </button>

      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}
    </form>
  );
}