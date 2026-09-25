import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentView, setCurrentView] = useState('plan'); // default to detailed Gantt plan
  const [projectsData, setProjectsData] = useState({ projects: [], flatPhases: [], flatWorkItems: [], dependencies: [] });
  const [hierarchyData, setHierarchyData] = useState({ tree: [], domains: [], tribes: [], teams: [], people: [] });
  const [capacityData, setCapacityData] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [auditHistory, setAuditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projRes, hierRes, capRes, histRes, decRes] = await Promise.all([
        api.getProjects(),
        api.getHierarchy(),
        api.getCapacityMatrix(),
        api.getHistory(),
        api.getDecisions()
      ]);

      setProjectsData(projRes);
      setHierarchyData(hierRes);
      setCapacityData(capRes);
      setAuditHistory(histRes);
      setDecisions(decRes);
    } catch (err) {
      console.error('Failed to load application data:', err);
      setError(err.message);
      addToast(`Error loading data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const resetDemo = useCallback(async () => {
    try {
      setLoading(true);
      await api.resetDemoData();
      addToast('Demo database restored to initial clean enterprise state!', 'success');
      await refreshAll();
    } catch (err) {
      addToast(`Failed to reset demo data: ${err.message}`, 'error');
      setLoading(false);
    }
  }, [addToast, refreshAll]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        projectsData,
        hierarchyData,
        capacityData,
        decisions,
        auditHistory,
        loading,
        error,
        toasts,
        addToast,
        refreshAll,
        resetDemo
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
