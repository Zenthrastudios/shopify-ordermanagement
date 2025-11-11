import type { OrderWithItems } from '../../types';

interface InvoiceTemplateProps {
  order: OrderWithItems;
  storeName?: string;
}

export default function InvoiceTemplate({ order, storeName = 'Your Store' }: InvoiceTemplateProps) {
  const shippingAddress = order.order_data?.shipping_address || {};
  const billingAddress = order.order_data?.billing_address || {};

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white print:p-0">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
          <p className="text-gray-600">Order #{order.order_number}</p>
          <p className="text-sm text-gray-500">
            Date: {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{storeName}</h2>
          <p className="text-sm text-gray-600">123 Business St</p>
          <p className="text-sm text-gray-600">City, State 12345</p>
          <p className="text-sm text-gray-600">contact@yourstore.com</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Bill To:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-900">
              {billingAddress.first_name} {billingAddress.last_name}
            </p>
            {billingAddress.address1 && <p>{billingAddress.address1}</p>}
            {billingAddress.address2 && <p>{billingAddress.address2}</p>}
            <p>
              {billingAddress.city}, {billingAddress.province} {billingAddress.zip}
            </p>
            <p>{billingAddress.country}</p>
            <p className="pt-2">{order.email}</p>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Ship To:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-900">
              {shippingAddress.first_name} {shippingAddress.last_name}
            </p>
            {shippingAddress.address1 && <p>{shippingAddress.address1}</p>}
            {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
            <p>
              {shippingAddress.city}, {shippingAddress.province} {shippingAddress.zip}
            </p>
            <p>{shippingAddress.country}</p>
            {shippingAddress.phone && <p className="pt-2">{shippingAddress.phone}</p>}
          </div>
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-3 font-semibold text-gray-900">Item</th>
            <th className="text-center py-3 font-semibold text-gray-900">Quantity</th>
            <th className="text-right py-3 font-semibold text-gray-900">Price</th>
            <th className="text-right py-3 font-semibold text-gray-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-4">
                <div className="font-medium text-gray-900">{item.title}</div>
                {item.variant_title && (
                  <div className="text-sm text-gray-500">{item.variant_title}</div>
                )}
                {item.sku && <div className="text-xs text-gray-400">SKU: {item.sku}</div>}
              </td>
              <td className="py-4 text-center text-gray-700">{item.quantity}</td>
              <td className="py-4 text-right text-gray-700">
                {order.currency} {item.price.toFixed(2)}
              </td>
              <td className="py-4 text-right font-medium text-gray-900">
                {order.currency} {(item.price * item.quantity).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between py-2 text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-900">
              {order.currency} {order.subtotal_price.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-gray-600">Tax:</span>
            <span className="text-gray-900">
              {order.currency} {order.total_tax.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-gray-600">Shipping:</span>
            <span className="text-gray-900">{order.currency} 0.00</span>
          </div>
          <div className="flex justify-between py-3 border-t-2 border-gray-300 text-lg font-bold">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">
              {order.currency} {order.total_price.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between py-2 text-sm bg-green-50 px-3 rounded mt-2">
            <span className="text-green-700 font-medium">Paid:</span>
            <span className="text-green-700 font-medium">
              {order.currency} {order.total_price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <p className="text-sm text-gray-500 text-center">
          Thank you for your business!
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          If you have any questions, please contact us at contact@yourstore.com
        </p>
      </div>
    </div>
  );
}
