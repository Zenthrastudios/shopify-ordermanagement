import { useEffect, useState } from 'react';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';
import { analyticsService, CustomerSummary, TopCustomer } from '../../services/analyticsService';
import { subDays } from 'date-fns';
import { CustomerDetail } from './CustomerDetail';

export function CustomerAnalytics() {
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [allCustomers, setAllCustomers] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'top' | 'all'>('top');
  const [selectedCustomer, setSelectedCustomer] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      const [summaryData, topCustomersData, allCustomersData] = await Promise.all([
        analyticsService.getCustomerSummary({ startDate, endDate }),
        analyticsService.getTopCustomers(20),
        analyticsService.getTopCustomers(1000),
      ]);
      setSummary(summaryData);
      setTopCustomers(topCustomersData);
      setAllCustomers(allCustomersData);
    } catch (error) {
      console.error('Error loading customer analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedCustomer) {
    return <CustomerDetail email={selectedCustomer.email} customerName={selectedCustomer.name} onBack={() => setSelectedCustomer(null)} />;
  }

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6"><div className="animate-pulse h-64 bg-gray-100 rounded" /></div>;
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Customer Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Total Customers</div>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalCustomers.toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">New Customers</div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.newCustomers.toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Returning</div>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.returningCustomers.toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Active (30d)</div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.activeCustomers.toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Churned (90d)</div>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.churnedCustomers.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {viewMode === 'top' ? 'Top 20 Customers by Spend' : `All Customers (${allCustomers.length})`}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('top')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'top'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Top 20
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Customers
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AOV</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(viewMode === 'top' ? topCustomers : allCustomers).map((customer, index) => (
                <tr
                  key={`${customer.email}-${customer.name}`}
                  onClick={() => setSelectedCustomer({ email: customer.email, name: customer.name })}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600 hover:text-blue-800">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ₹{customer.totalSpent.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.totalOrders}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(customer.totalSpent / customer.totalOrders).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.lastPurchaseDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
