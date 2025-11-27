import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, DollarSign, ShoppingCart, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, parseISO, differenceInDays } from 'date-fns';

interface CustomerDetailProps {
  email: string;
  customerName: string;
  onBack: () => void;
}

interface CustomerOrder {
  id: string;
  order_number: number;
  total_price: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string;
}

interface CustomerStats {
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstPurchase: string;
  lastPurchase: string;
  daysSinceLastPurchase: number;
  averageDaysBetweenOrders: number;
}

export function CustomerDetail({ email, customerName, onBack }: CustomerDetailProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [email, customerName]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, order_number, total_price, created_at, financial_status, fulfillment_status, customer_name')
        .eq('email', email)
        .eq('customer_name', customerName)
        .order('created_at', { ascending: false });

      if (orderData && orderData.length > 0) {
        setOrders(orderData);

        const sortedOrders = [...orderData].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const totalSpent = orderData.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
        const firstPurchase = sortedOrders[0].created_at;
        const lastPurchase = sortedOrders[sortedOrders.length - 1].created_at;

        let totalGaps = 0;
        for (let i = 1; i < sortedOrders.length; i++) {
          const gap = differenceInDays(
            parseISO(sortedOrders[i].created_at),
            parseISO(sortedOrders[i - 1].created_at)
          );
          totalGaps += gap;
        }
        const avgGap = sortedOrders.length > 1 ? totalGaps / (sortedOrders.length - 1) : 0;

        setStats({
          name: orderData[0].customer_name || email,
          email,
          totalOrders: orderData.length,
          totalSpent,
          averageOrderValue: totalSpent / orderData.length,
          firstPurchase,
          lastPurchase,
          daysSinceLastPurchase: differenceInDays(new Date(), parseISO(lastPurchase)),
          averageDaysBetweenOrders: avgGap,
        });
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse h-96 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Customers
        </button>
        <p className="text-gray-500">No data found for this customer.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      refunded: 'bg-red-100 text-red-800',
      fulfilled: 'bg-blue-100 text-blue-800',
      unfulfilled: 'bg-gray-100 text-gray-800',
      partial: 'bg-orange-100 text-orange-800',
    };
    return statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const sortedOrders = [...orders].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-700">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Customers
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{stats.name}</h2>
          <p className="text-gray-500">{stats.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Orders</span>
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Lifetime Value</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">₹{stats.totalSpent.toFixed(2)}</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Order Value</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">₹{stats.averageOrderValue.toFixed(2)}</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Order Gap</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(stats.averageDaysBetweenOrders)}d</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-sm text-gray-600 mb-1">First Purchase</div>
            <div className="font-semibold text-gray-900">{format(parseISO(stats.firstPurchase), 'MMM dd, yyyy')}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-sm text-gray-600 mb-1">Last Purchase</div>
            <div className="font-semibold text-gray-900">{format(parseISO(stats.lastPurchase), 'MMM dd, yyyy')}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-sm text-gray-600 mb-1">Days Since Last Order</div>
            <div className="font-semibold text-gray-900">{stats.daysSinceLastPurchase} days</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Order Timeline
        </h3>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-6">
            {sortedOrders.map((order, index) => {
              const orderDate = parseISO(order.created_at);
              const gap = index > 0
                ? differenceInDays(orderDate, parseISO(sortedOrders[index - 1].created_at))
                : 0;

              return (
                <div key={order.id} className="relative pl-16">
                  <div className="absolute left-6 top-2 w-4 h-4 rounded-full bg-blue-600 border-4 border-white"></div>

                  {gap > 0 && (
                    <div className="absolute left-2 -top-4 text-xs text-gray-500 italic">
                      {gap} days gap
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">Order #{order.order_number}</div>
                        <div className="text-sm text-gray-500">{format(orderDate, 'MMM dd, yyyy HH:mm')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">₹{parseFloat(order.total_price).toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.financial_status)}`}>
                        {order.financial_status}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.fulfillment_status)}`}>
                        {order.fulfillment_status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order History</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">#{order.order_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(parseISO(order.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">
                    ₹{parseFloat(order.total_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.financial_status)}`}>
                      {order.financial_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.fulfillment_status)}`}>
                      {order.fulfillment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
