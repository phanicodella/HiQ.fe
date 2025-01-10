// src/pages/AdminAccessRequests.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';

export function AdminAccessRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/api/admin/access-requests');
      setRequests(response.data.requests);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.post(`/api/admin/access-requests/${requestId}/approve`);
      // This would create the user account and send credentials
      fetchRequests();
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Access Requests</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {requests.map(request => (
            <li key={request.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{request.companyName}</h3>
                  <p className="text-sm text-gray-500">{request.name} - {request.jobTitle}</p>
                  <p className="text-sm text-gray-500">{request.email}</p>
                </div>
                <div>
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Approve Access
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}