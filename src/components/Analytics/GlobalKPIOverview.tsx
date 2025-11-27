import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { analyticsService, GlobalKPIs } from '../../services/analyticsService';
import { subDays } from 'date-fns';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  subtitle?: string;
}

function KPICard({ title, value, icon, trend, subtitle }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-500 text-sm font-medium">{title}</div>
        <div className="text-blue-600">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      {trend !== undefined && (
        <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
          {Math.abs(trend).toFixed(1)}% vs last period
        </div>
      )}
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

export function GlobalKPIOverview() {
  const [kpis, setKpis] = useState<GlobalKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      const data = await analyticsService.getGlobalKPIs({ startDate, endDate });
      setKpis(data);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Global KPI Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`$${kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-6 h-6" />}
        />
        <KPICard
          title="Net Revenue"
          value={`$${kpis.netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-6 h-6" />}
          subtitle={`Refunds: $${kpis.refundAmount.toFixed(2)}`}
        />
        <KPICard
          title="Total Orders"
          value={kpis.totalOrders.toLocaleString()}
          icon={<ShoppingCart className="w-6 h-6" />}
        />
        <KPICard
          title="Total Customers"
          value={kpis.totalCustomers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
        />
        <KPICard
          title="Average Order Value"
          value={`$${kpis.averageOrderValue.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
        />
        <KPICard
          title="Products Sold"
          value={kpis.totalProductsSold.toLocaleString()}
          icon={<Package className="w-6 h-6" />}
        />
        <KPICard
          title="Avg Items per Order"
          value={kpis.averageItemsPerOrder.toFixed(1)}
          icon={<ShoppingCart className="w-6 h-6" />}
        />
        <KPICard
          title="Repeat Customer Rate"
          value={`${kpis.repeatCustomerRate.toFixed(1)}%`}
          icon={<Users className="w-6 h-6" />}
          subtitle={`${kpis.returningCustomers} returning / ${kpis.firstTimeCustomers} new`}
        />
      </div>
    </div>
  );
}
