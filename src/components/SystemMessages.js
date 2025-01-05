// src/components/SystemMessages.js
import React from 'react';

export const SystemAlert = ({ type, message }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700'
  };

  return (
    <div className={`p-4 rounded-lg border ${styles[type] || styles.info} mb-2`}>
      {message}
    </div>
  );
};

const SystemMessages = ({ messages = [] }) => {
  return (
    <div className="space-y-2">
      {messages.map((msg, index) => (
        <SystemAlert
          key={msg.id || index}
          type={msg.type}
          message={msg.message}
        />
      ))}
    </div>
  );
};

export default SystemMessages;