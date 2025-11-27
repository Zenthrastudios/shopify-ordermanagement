import { useEffect, useState } from 'react';
import { Package, TrendingUp, AlertCircle } from 'lucide-react';
import { analyticsService, ProductPerformance } from '../../services/analyticsService';
import { subDays } from 'date-fns';

export function ProductAnalytics() {
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'revenue' | 'units' | 'customers'>('revenue');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      const data = await analyticsService.getProductPerformance({ startDate, endDate });
      setProducts(data);
    } catch (error) {
      console.error('Error loading product analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.revenue - a.revenue;
      case 'units':
        return b.unitsSold - a.unitsSold;
      case 'customers':
        return b.uniqueCustomers - a.uniqueCustomers;
      default:
        return 0;
    }
  });

  const topProducts = sortedProducts.slice(0, 10);
  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  const totalUnits = products.reduce((sum, p) => sum + p.unitsSold, 0);

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6"><div className="animate-pulse h-64 bg-gray-100 rounded" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Product Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Total Products</div>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{products.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Total Revenue</div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">₹{totalRevenue.toFixed(2)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Units Sold</div>
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalUnits.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Top 10 Products</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-3 py-1 text-sm rounded ${
                sortBy === 'revenue' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              By Revenue
            </button>
            <button
              onClick={() => setSortBy('units')}
              className={`px-3 py-1 text-sm rounded ${
                sortBy === 'units' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              By Units
            </button>
            <button
              onClick={() => setSortBy('customers')}
              className={`px-3 py-1 text-sm rounded ${
                sortBy === 'customers' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              By Customers
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refunds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product, index) => {
                const refundRate = product.unitsSold > 0 ? (product.refundCount / product.unitsSold) * 100 : 0;
                return (
                  <tr key={product.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.unitsSold}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ₹{product.revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{product.avgPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.uniqueCustomers}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {refundRate > 10 && <AlertCircle className="w-4 h-4 text-red-500 mr-1" />}
                        <span className={`text-sm ${refundRate > 10 ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                          {product.refundCount} ({refundRate.toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
