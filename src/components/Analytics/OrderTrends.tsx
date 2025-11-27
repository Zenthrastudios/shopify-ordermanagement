import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsService, OrderTrend } from '../../services/analyticsService';
import { subDays } from 'date-fns';

export function OrderTrends() {
  const [trends, setTrends] = useState<OrderTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      const data = await analyticsService.getOrderTrends({ startDate, endDate });
      setTrends(data);
    } catch (error) {
      console.error('Error loading order trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = trends.reduce((sum, t) => sum + t.revenue, 0);
  const totalOrders = trends.reduce((sum, t) => sum + t.orders, 0);
  const avgDailyRevenue = trends.length > 0 ? totalRevenue / trends.length : 0;
  const avgDailyOrders = trends.length > 0 ? totalOrders / trends.length : 0;

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6"><div className="animate-pulse h-96 bg-gray-100 rounded" /></div>;
  }

  const ChartComponent = chartType === 'line' ? LineChart : BarChart;
  const DataComponent = chartType === 'line' ? Line : Bar;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Order Trends</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-2">Total Orders</div>
          <div className="text-3xl font-bold text-gray-900">{totalOrders}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-2">Avg Daily Orders</div>
          <div className="text-3xl font-bold text-gray-900">{avgDailyOrders.toFixed(1)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-2">Avg Daily Revenue</div>
          <div className="text-3xl font-bold text-gray-900">${avgDailyRevenue.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue & Orders Over Time</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-sm rounded ${
                chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-sm rounded ${
                chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Bar Chart
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ChartComponent data={trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <DataComponent
              yAxisId="left"
              type="monotone"
              dataKey="orders"
              stroke="#3b82f6"
              fill="#3b82f6"
              name="Orders"
            />
            <DataComponent
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              fill="#10b981"
              name="Revenue ($)"
            />
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">New vs Returning Customers</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="newCustomers" stackId="a" fill="#8b5cf6" name="New Customers" />
            <Bar dataKey="returningCustomers" stackId="a" fill="#06b6d4" name="Returning Customers" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
