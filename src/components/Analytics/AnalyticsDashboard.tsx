import { useState } from 'react';
import { BarChart3, Users, Package, TrendingUp, Target, MapPin, Tag, FileDown } from 'lucide-react';
import { GlobalKPIOverview } from './GlobalKPIOverview';
import { CustomerAnalytics } from './CustomerAnalytics';
import { RFMAnalysis } from './RFMAnalysis';
import { ProductAnalytics } from './ProductAnalytics';
import { OrderTrends } from './OrderTrends';

type TabType = 'overview' | 'customers' | 'rfm' | 'products' | 'trends';

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: BarChart3 },
    { id: 'customers' as TabType, name: 'Customers', icon: Users },
    { id: 'rfm' as TabType, name: 'RFM Analysis', icon: Target },
    { id: 'products' as TabType, name: 'Products', icon: Package },
    { id: 'trends' as TabType, name: 'Order Trends', icon: TrendingUp },
  ];

  const exportData = () => {
    const exportOptions = [
      { label: 'Export KPIs', action: () => alert('KPI export - Download summary as CSV') },
      { label: 'Export Customers', action: () => alert('Customer data export - Download customer list as CSV') },
      { label: 'Export Products', action: () => alert('Product analytics export - Download product performance as CSV') },
      { label: 'Export RFM Scores', action: () => alert('RFM analysis export - Download customer segments as CSV') },
    ];

    const option = prompt(
      'Select export option:\n1. Export KPIs\n2. Export Customers\n3. Export Products\n4. Export RFM Scores\n\nEnter number (1-4):'
    );

    if (option && ['1', '2', '3', '4'].includes(option)) {
      exportOptions[parseInt(option) - 1].action();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            </div>
            <button
              onClick={exportData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>

          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <GlobalKPIOverview />}
        {activeTab === 'customers' && <CustomerAnalytics />}
        {activeTab === 'rfm' && <RFMAnalysis />}
        {activeTab === 'products' && <ProductAnalytics />}
        {activeTab === 'trends' && <OrderTrends />}
      </div>

      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            Analytics data updates in real-time based on your order history
          </div>
        </div>
      </div>
    </div>
  );
}
