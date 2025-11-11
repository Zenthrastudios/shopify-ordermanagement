import { useEffect, useState } from 'react';
import { DollarSign, Package, CheckCircle, Clock } from 'lucide-react';
import { getOrderStats } from '../../services/ordersService';

interface OrderStats {
  totalOrders: number;
  paidOrders: number;
  fulfilledOrders: number;
  unfulfilledOrders: number;
  totalRevenue: number;
}

export default function AnalyticsCards() {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getOrderStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-3 lg:mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 lg:p-6 animate-pulse">
            <div className="h-3 lg:h-4 bg-gray-200 rounded w-1/2 mb-2 lg:mb-4"></div>
            <div className="h-6 lg:h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      icon: Package,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Fulfilled Orders',
      value: stats.fulfilledOrders.toLocaleString(),
      icon: CheckCircle,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Pending Fulfillment',
      value: stats.unfulfilledOrders.toLocaleString(),
      icon: Clock,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-3 lg:mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`${card.bgColor} rounded-lg border ${card.borderColor} p-2.5 lg:p-6 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-1.5 lg:mb-3">
              <h3 className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-600 leading-tight">{card.title}</h3>
              <div className={`p-1 lg:p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-3.5 h-3.5 lg:w-5 lg:h-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
