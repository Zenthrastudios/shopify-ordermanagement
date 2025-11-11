import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, MoreVertical, Mail, Phone, Package, Truck } from 'lucide-react';
import { fetchOrderById } from '../../services/ordersService';
import type { OrderWithItems } from '../../types';
import AddTrackingModal from './AddTrackingModal';
import PrintPreview from '../Print/PrintPreview';

interface OrderDetailProps {
  orderId: string;
  onBack: () => void;
}

export default function OrderDetail({ orderId, onBack }: OrderDetailProps) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await fetchOrderById(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Order not found</div>
        </div>
      </div>
    );
  }

  const shippingAddress = order.shipping_address || order.order_data?.shipping_address || {};
  const billingAddress = order.billing_address || order.order_data?.billing_address || {};

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      refunded: 'bg-red-100 text-red-700',
      fulfilled: 'bg-blue-100 text-blue-700',
      unfulfilled: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.financial_status)}`}>
              {order.financial_status}
            </span>
            {order.fulfillment_status && (
              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.fulfillment_status)}`}>
                {order.fulfillment_status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button className="p-1.5 sm:p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
            <button className="p-1.5 sm:p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowPrintPreview(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Print Slip</span>
              <span className="sm:hidden">Print</span>
            </button>
            <button className="p-1.5 sm:p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 mt-2">
          {new Date(order.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">
                Unfulfilled ({order.items?.length || 0})
              </h2>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex gap-2 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-xs sm:text-sm truncate">{item.title}</h3>
                    {item.variant_title && (
                      <p className="text-xs text-gray-500 truncate">
                        {item.variant_title}
                      </p>
                    )}
                    {item.sku && (
                      <p className="text-xs text-gray-500 truncate">SKU: {item.sku}</p>
                    )}
                    <div className="flex items-center justify-between mt-1 sm:hidden">
                      <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                      <div className="text-xs font-semibold text-gray-900">
                        {order.currency} {(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="font-medium text-gray-900 text-sm">
                      {order.currency} {item.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                  </div>
                  <div className="text-right font-semibold text-gray-900 text-sm hidden sm:block">
                    {order.currency} {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.tracking && order.tracking.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                Delivery
              </h2>
              {order.tracking.map((tracking) => (
                <div key={tracking.id} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-xs sm:text-sm">{tracking.tracking_company}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {tracking.tracking_number}
                    </div>
                  </div>
                  {tracking.tracking_url && (
                    <a
                      href={tracking.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    >
                      Track
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Payment Summary</h2>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">
                  {order.currency} {order.subtotal_price.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className="text-gray-900">{order.currency} 0.00</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">
                  {order.currency} {order.total_tax.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-1.5 sm:pt-2 mt-1.5 sm:mt-2">
                <div className="flex justify-between font-semibold text-xs sm:text-sm">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">
                    {order.currency} {order.total_price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Customer</h2>
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {order.customer_name?.charAt(0) || 'G'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">
                  {order.customer_name || 'Guest'}
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <button className="w-full flex items-center gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-800 truncate">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{order.email}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Contact Info</h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 break-all">{order.email}</span>
              </div>
              {(order.phone || shippingAddress.phone) && (
                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{order.phone || shippingAddress.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Shipping Address</h2>
            <div className="text-xs sm:text-sm text-gray-600 space-y-0.5 sm:space-y-1">
              {(order.shipping_name || shippingAddress.first_name || shippingAddress.last_name) && (
                <p className="font-medium text-gray-900">
                  {order.shipping_name || `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim()}
                </p>
              )}
              {shippingAddress.company && <p>{shippingAddress.company}</p>}
              {shippingAddress.address1 && <p>{shippingAddress.address1}</p>}
              {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
              {(shippingAddress.city || shippingAddress.province || shippingAddress.zip) && (
                <p>
                  {[shippingAddress.city, shippingAddress.province, shippingAddress.zip]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {shippingAddress.country && <p>{shippingAddress.country}</p>}
              {shippingAddress.phone && (
                <p className="mt-2">
                  <span className="text-gray-500">Phone: </span>{shippingAddress.phone}
                </p>
              )}
              {!order.shipping_name && !shippingAddress.first_name && !shippingAddress.address1 && (
                <p className="text-gray-400 italic">No shipping address available</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Billing Address</h2>
            <div className="text-sm text-gray-600 space-y-1">
              {(order.billing_name || billingAddress.first_name || billingAddress.last_name) && (
                <p className="font-medium text-gray-900">
                  {order.billing_name || `${billingAddress.first_name || ''} ${billingAddress.last_name || ''}`.trim()}
                </p>
              )}
              {billingAddress.company && <p>{billingAddress.company}</p>}
              {billingAddress.address1 && <p>{billingAddress.address1}</p>}
              {billingAddress.address2 && <p>{billingAddress.address2}</p>}
              {(billingAddress.city || billingAddress.province || billingAddress.zip) && (
                <p>
                  {[billingAddress.city, billingAddress.province, billingAddress.zip]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {billingAddress.country && <p>{billingAddress.country}</p>}
              {billingAddress.phone && (
                <p className="mt-2">
                  <span className="text-gray-500">Phone: </span>{billingAddress.phone}
                </p>
              )}
              {!order.billing_name && !billingAddress.first_name && !billingAddress.address1 && (
                <p className="text-gray-400 italic">No billing address available</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowTrackingModal(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            Add Tracking
          </button>
        </div>
      </div>

      {showTrackingModal && (
        <AddTrackingModal
          orderId={orderId}
          onClose={() => setShowTrackingModal(false)}
          onComplete={() => {
            setShowTrackingModal(false);
            loadOrder();
          }}
        />
      )}

      {showPrintPreview && order && (
        <PrintPreview
          orders={[order]}
          type="shipping_slip"
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
