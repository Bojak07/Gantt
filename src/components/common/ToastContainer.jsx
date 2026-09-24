import React from 'react';
import { useApp } from '../../context/AppContext.jsx';

export default function ToastContainer() {
  const { toasts } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <i
            className={`fa-solid ${
              toast.type === 'success'
                ? 'fa-circle-check text-green-400'
                : toast.type === 'error'
                ? 'fa-circle-exclamation text-red-400'
                : 'fa-circle-info text-blue-400'
            }`}
          ></i>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
