// frontend/src/pages/Dashboard.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { NewInterviewModal } from '../components/NewInterviewModal';
import './Dashboard.css';

export function Dashboard() {
  const [interviews, setInterviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewInterviewModal, setShowNewInterviewModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/interviews');
      setInterviews(response.data.interviews);
      setError(null);
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError('Failed to load interviews. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: interviews.length,
    scheduled: interviews.filter(i => i.status === 'scheduled').length,
    completed: interviews.filter(i => i.status === 'completed').length,
    cancelled: interviews.filter(i => i.status === 'cancelled').length
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return '—';
    }
  };

  // Handle interview cancellation
  const handleCancelInterview = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) {
      return;
    }

    try {
      await api.post(`/api/interviews/${id}/cancel`);
      fetchInterviews();
    } catch (err) {
      console.error('Error cancelling interview:', err);
      alert('Failed to cancel interview. Please try again.');
    }
  };

  // Sorting logic
  const sortBy = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedInterviews = () => {
    const sortedInterviews = [...interviews];
    sortedInterviews.sort((a, b) => {
      // Handle null or undefined values
      if (!a[sortConfig.key] && !b[sortConfig.key]) return 0;
      if (!a[sortConfig.key]) return 1;
      if (!b[sortConfig.key]) return -1;

      let comparison = 0;
      switch (sortConfig.key) {
        case 'candidateName':
          comparison = a.candidateName.localeCompare(b.candidateName);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'level':
          comparison = a.level.localeCompare(b.level);
          break;
        case 'date':
          comparison = new Date(a.date) - new Date(b.date);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sortedInterviews;
  };

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div>Loading interviews...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Interview Dashboard</h1>
        <button
          onClick={() => setShowNewInterviewModal(true)}
          className="new-interview-button"
        >
          + New Interview
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Scheduled</div>
          <div className="stat-value text-blue">{stats.scheduled}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Completed</div>
          <div className="stat-value text-green">{stats.completed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Cancelled</div>
          <div className="stat-value text-red">{stats.cancelled}</div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Interviews Table */}
      <div className="table-container">
        <table className="interviews-table">
          <thead>
            <tr>
              <th onClick={() => sortBy('candidateName')} className="sortable-header">
                Candidate {getSortIndicator('candidateName')}
              </th>
              <th onClick={() => sortBy('type')} className="sortable-header">
                Type {getSortIndicator('type')}
              </th>
              <th onClick={() => sortBy('level')} className="sortable-header">
                Level {getSortIndicator('level')}
              </th>
              <th onClick={() => sortBy('date')} className="sortable-header">
                Date & Time {getSortIndicator('date')}
              </th>
              <th onClick={() => sortBy('status')} className="sortable-header">
                Status {getSortIndicator('status')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getSortedInterviews().length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  No interviews found. Click "New Interview" to create one.
                </td>
              </tr>
            ) : (
              getSortedInterviews().map((interview) => (
                <tr key={interview.id}>
                  <td>
                    <div className="candidate-info">
                      <div className="candidate-name">{interview.candidateName}</div>
                      <div className="candidate-email">{interview.candidateEmail}</div>
                    </div>
                  </td>
                  <td>{interview.type || '—'}</td>
                  <td>{interview.level || '—'}</td>
                  <td>{formatDate(interview.date)}</td>
                  <td>
                    <span className={`status-badge status-${interview.status || 'default'}`}>
                      {interview.status || 'unknown'}
                    </span>
                  </td>
                  <td>
                    {interview.status === 'scheduled' && (
                      <div className="action-buttons">
                        <button 
                          onClick={() => window.open(`${window.location.origin}/${interview.sessionId}`, '_blank')}
                          className="action-button"
                        >
                          View Link
                        </button>
                        <button 
                          onClick={() => handleCancelInterview(interview.id)}
                          className="action-button cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNewInterviewModal && (
        <NewInterviewModal 
          onClose={() => setShowNewInterviewModal(false)}
          onSuccess={() => {
            setShowNewInterviewModal(false);
            fetchInterviews();
          }}
        />
      )}
    </div>
  );
}