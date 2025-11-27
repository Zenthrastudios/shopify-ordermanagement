import { useState } from 'react';
import MainLayout from './components/Layout/MainLayout';
import OrdersList from './components/Orders/OrdersList';
import OrderDetail from './components/Orders/OrderDetail';
import SettingsPage from './components/Settings/SettingsPage';
import { AnalyticsDashboard } from './components/Analytics/AnalyticsDashboard';
import { ProductsPage } from './components/Products/ProductsPage';

function App() {
  const [currentView, setCurrentView] = useState('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const handleBackToList = () => {
    setSelectedOrderId(null);
  };

  const renderContent = () => {
    if (currentView === 'settings') {
      return <SettingsPage />;
    }

    if (currentView === 'analytics') {
      return <AnalyticsDashboard />;
    }

    if (currentView === 'products') {
      return <ProductsPage />;
    }

    if (currentView === 'orders') {
      if (selectedOrderId) {
        return <OrderDetail orderId={selectedOrderId} onBack={handleBackToList} />;
      }
      return <OrdersList onOrderSelect={handleOrderSelect} />;
    }

    return (
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
          </h2>
          <p className="text-gray-500">This section is under development</p>
        </div>
      </div>
    );
  };

  return (
    <MainLayout
      currentView={currentView}
      onViewChange={(view) => {
        setCurrentView(view);
        setSelectedOrderId(null);
      }}
    >
      {renderContent()}
    </MainLayout>
  );
}

export default App;
