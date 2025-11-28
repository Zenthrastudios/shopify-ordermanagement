import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Download, Printer, Check } from 'lucide-react';
import { fetchOrders } from '../../services/ordersService';
import type { OrderWithItems, OrderFilters } from '../../types';
import OrderFiltersPanel from './OrderFiltersPanel';
import BulkActionsBar from './BulkActionsBar';
import PrintPreview from '../Print/PrintPreview';
import AnalyticsCards from './AnalyticsCards';
import { supabase } from '../../lib/supabase';

interface OrdersListProps {
  onOrderSelect: (orderId: string) => void;
}

export default function OrdersList({ onOrderSelect }: OrdersListProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [printOrders, setPrintOrders] = useState<OrderWithItems[] | null>(null);

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders({ ...filters, search: searchTerm });
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncFromShopify = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-orders-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to sync orders');
      }

      const result = await response.json();
      alert(`Successfully synced! Updated ${result.updated} orders from Shopify.`);
      await loadOrders();
    } catch (error: any) {
      alert(error.message || 'Failed to sync from Shopify');
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = () => {
    loadOrders();
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      refunded: 'bg-red-100 text-red-700',
      fulfilled: 'bg-blue-100 text-blue-700',
      unfulfilled: 'bg-gray-100 text-gray-700',
      partial: 'bg-orange-100 text-orange-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-3 lg:p-6">
      <AnalyticsCards />

      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">{orders.length} total orders</p>
          </div>
          <div className="flex gap-2 lg:gap-3">
            <button
              onClick={syncFromShopify}
              disabled={syncing}
              className="px-3 lg:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Shopify'}</span>
            </button>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="px-3 lg:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button className="px-3 lg:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 lg:px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 text-sm ${
              showFilters ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {showFilters && (
          <OrderFiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
      </div>

      {selectedOrders.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedOrders.size}
          selectedOrderIds={Array.from(selectedOrders)}
          selectedOrders={orders.filter(o => selectedOrders.has(o.id))}
          onComplete={() => {
            setSelectedOrders(new Set());
            loadOrders();
          }}
          onPrintSlips={(ordersData) => setPrintOrders(ordersData)}
        />
      )}

      {printOrders && (
        <PrintPreview
          orders={printOrders}
          type="shipping_slip"
          onClose={() => setPrintOrders(null)}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === orders.length && orders.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                  Order
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                  Date
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-semibold text-gray-600 uppercase tracking-wider w-20 lg:w-24">
                  Payment
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-semibold text-gray-600 uppercase tracking-wider w-24 lg:w-28">
                  Fulfillment
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-semibold text-gray-600 uppercase tracking-wider w-20 lg:w-24">
                  Total
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-semibold text-gray-600 uppercase tracking-wider w-16 lg:w-20">
                  Items
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 lg:px-6 py-12 text-center text-gray-500 text-sm">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 lg:px-6 py-12 text-center text-gray-500 text-sm">
                    No orders found. Connect your Shopify store to sync orders.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-2 lg:px-4 py-2 lg:py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td
                      className="px-2 lg:px-4 py-2 lg:py-3"
                      onClick={() => onOrderSelect(order.id)}
                    >
                      <div className="font-semibold text-blue-600 hover:text-blue-800 text-xs lg:text-sm whitespace-nowrap">
                        #{order.order_number}
                      </div>
                    </td>
                    <td
                      className="px-2 lg:px-4 py-2 lg:py-3 text-[10px] lg:text-sm text-gray-600"
                      onClick={() => onOrderSelect(order.id)}
                    >
                      <div className="whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td
                      className="px-2 lg:px-4 py-2 lg:py-3"
                      onClick={() => onOrderSelect(order.id)}
                    >
                      <div className="text-[10px] lg:text-sm font-medium text-gray-900 max-w-[120px] lg:max-w-[200px] truncate">
                        {order.customer_name || 'Guest'}
                      </div>
                      <div className="text-[9px] lg:text-xs text-gray-500 truncate max-w-[120px] lg:max-w-[200px]">{order.email}</div>
                    </td>
                    <td
                      className="px-2 lg:px-4 py-2 lg:py-3"
                      onClick={() => onOrderSelect(order.id)}
                    >
                      <span className={`inline-flex px-1.5 lg:px-2 py-0.5 rounded-full text-[9px] lg:text-xs font-medium whitespace-nowrap ${getStatusColor(order.financial_status)}`}>
                        {order.financial_status}
                      </span>
                    </td>
                    <td
                      className="px-2 lg:px-4 py-2 lg:py-3"
                      onClick={() => onOrderSelect(order.id)}
                    >
                      {order.fulfillment_status ? (
                        <span className={`inline-flex px-1.5 lg:px-2 py-0.5 rounded-full text-[9px] lg:text-xs font-medium whitespace-nowrap ${getStatusColor(order.fulfillment_status)}`}>
                          {order.fulfillment_status}
                        </span>
                      ) : (
                        <span className="inline-flex px-1.5 lg:px-2 py-0.5 rounded-full text-[9px] lg:text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
                          unfulfilled
                        </span>
                      )}
                    </td>
                    <td
                      className="px-2 lg:px-4 py-2 lg:py-3 text-[10px] lg:text-sm font-semibold text-gray-900"
                      onClick={() => onOrderSelect(order.id)}
                    >
                      <div className="whitespace-nowrap">{order.currency} {order.total_price.toFixed(2)}</div>
                    </td>
                    <td
                      className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-gray-600"
                      onClick={() => onOrderSelect(order.id)}
                    >
                      {order.items?.length || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
