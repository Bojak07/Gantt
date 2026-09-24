import React from 'react';
import { useApp } from './context/AppContext.jsx';
import Header from './components/common/Header.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';
import PortfolioView from './components/portfolio/PortfolioView.jsx';
import PlanView from './components/plan/PlanView.jsx';
import ResourcesView from './components/resources/ResourcesView.jsx';
import ManagementView from './components/management/ManagementView.jsx';
import PresentationView from './components/presentation/PresentationView.jsx';

export default function App() {
  const { currentView } = useApp();

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        {currentView === 'portfolio' && <PortfolioView />}
        {currentView === 'plan' && <PlanView />}
        {currentView === 'resources' && <ResourcesView />}
        {currentView === 'management' && <ManagementView />}
        {currentView === 'presentation' && <PresentationView />}
      </main>
      <ToastContainer />
    </div>
  );
}
