/* 
 * frontend/src/components/NewInterviewModal.js
 * Modal for creating new interviews
 */

import { useState } from 'react';
import api from '../services/api';
import './NewInterviewModal.css';

export function NewInterviewModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: '',
    scheduledTime: '',
    level: 'mid',
    type: 'technical'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* 
   * Form validation
   */
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.candidateName.trim()) {
      newErrors.candidateName = 'Candidate name is required';
    }
    
    if (!formData.candidateEmail.trim()) {
      newErrors.candidateEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.candidateEmail)) {
      newErrors.candidateEmail = 'Invalid email format';
    }
    
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Schedule time is required';
    } else {
      const selectedTime = new Date(formData.scheduledTime);
      if (selectedTime < new Date()) {
        newErrors.scheduledTime = 'Cannot schedule interviews in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* 
   * Form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await api.post('/api/interviews', {
        ...formData,
        date: new Date(formData.scheduledTime).toISOString()
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating interview:', err);
      setSubmitError(err.response?.data?.error || 'Failed to create interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* 
   * Input change handler
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Schedule New Interview</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        {submitError && (
          <div className="error-message">{submitError}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Candidate Name */}
          <div className="form-group">
            <label htmlFor="candidateName">Candidate Name</label>
            <input
              type="text"
              id="candidateName"
              name="candidateName"
              value={formData.candidateName}
              onChange={handleChange}
              className={errors.candidateName ? 'error' : ''}
            />
            {errors.candidateName && (
              <span className="error-text">{errors.candidateName}</span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="candidateEmail">Candidate Email</label>
            <input
              type="email"
              id="candidateEmail"
              name="candidateEmail"
              value={formData.candidateEmail}
              onChange={handleChange}
              className={errors.candidateEmail ? 'error' : ''}
            />
            {errors.candidateEmail && (
              <span className="error-text">{errors.candidateEmail}</span>
            )}
          </div>

          {/* Interview Type */}
          <div className="form-group">
            <label htmlFor="type">Interview Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="system-design">System Design</option>
            </select>
          </div>

          {/* Experience Level */}
          <div className="form-group">
            <label htmlFor="level">Experience Level</label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
            >
              <option value="junior">Junior</option>
              <option value="mid">Mid-Level</option>
              <option value="senior">Senior</option>
            </select>
          </div>

          {/* Interview Time */}
          <div className="form-group">
            <label htmlFor="scheduledTime">Interview Time</label>
            <input
              type="datetime-local"
              id="scheduledTime"
              name="scheduledTime"
              value={formData.scheduledTime}
              onChange={handleChange}
              className={errors.scheduledTime ? 'error' : ''}
            />
            {errors.scheduledTime && (
              <span className="error-text">{errors.scheduledTime}</span>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}