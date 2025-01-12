// frontend/src/components/admin/SystemStatus.js

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export function SystemStatus() {
  const [metrics, setMetrics] = useState({
    system: {
      cpuUsage: 0,
      memoryUsage: 0,
      uptime: 0,
      lastDeployment: null
    },
    services: {
      database: 'unknown',
      storage: 'unknown',
      email: 'unknown',
      ai: 'unknown'
    },
    requests: {
      total24h: 0,
      failed24h: 0,
      averageResponseTime: 0
    },
    quotas: {
      dailyInterviews: { used: 0, limit: 1000 },
      storage: { used: 0, limit: 5000 },
      apiCalls: { used: 0, limit: 10000 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await api.get('/api/admin/system/status');
      setMetrics(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      setError('Failed to load system status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuotaUsageColor = (used, limit) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && !lastUpdated) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={fetchSystemStatus}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* System Metrics */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">System Resources</dt>
            <div className="mt-1 space-y-2">
              <div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-500">CPU Usage</div>
                  <div className="text-sm font-medium text-gray-900">{metrics.system.cpuUsage}%</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${metrics.system.cpuUsage}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-500">Memory Usage</div>
                  <div className="text-sm font-medium text-gray-900">{metrics.system.memoryUsage}%</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${metrics.system.memoryUsage}%` }}></div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Uptime: {formatUptime(metrics.system.uptime)}
              </div>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Service Status</dt>
            <div className="mt-1 space-y-2">
              {Object.entries(metrics.services).map(([service, status]) => (
                <div key={service} className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 capitalize">{service}</div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Request Metrics */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Request Metrics (24h)</dt>
            <div className="mt-1 space-y-2">
              <div className="flex justify-between">
                <div className="text-sm text-gray-500">Total Requests</div>
                <div className="text-sm font-medium text-gray-900">{metrics.requests.total24h}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-500">Failed Requests</div>
                <div className="text-sm font-medium text-red-600">{metrics.requests.failed24h}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-500">Avg Response Time</div>
                <div className="text-sm font-medium text-gray-900">{metrics.requests.averageResponseTime}ms</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quotas */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Resource Usage</dt>
            <div className="mt-1 space-y-2">
              {Object.entries(metrics.quotas).map(([quota, { used, limit }]) => (
                <div key={quota}>
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-500 capitalize">{quota.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className={`text-sm font-medium ${getQuotaUsageColor(used, limit)}`}>
                      {quota === 'storage' ? formatBytes(used) : used}/{quota === 'storage' ? formatBytes(limit) : limit}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getQuotaUsageColor(used, limit).replace('text-', 'bg-')}`}
                      style={{ width: `${(used / limit) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-right text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
}