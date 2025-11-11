import { useEffect, useState } from 'react';
import type { OrderWithItems } from '../../types';
import { storeSettingsService, type StoreSettings } from '../../services/storeSettingsService';

interface ShippingSlipTemplateProps {
  order: OrderWithItems;
}

export default function ShippingSlipTemplate({ order }: ShippingSlipTemplateProps) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await storeSettingsService.getSettings();
    setSettings(data);
  };

  if (!settings) {
    return <div className="p-8">Loading...</div>;
  }

  const shippingAddress = order.shipping_address || order.order_data?.shipping_address || {};
  const shippingName = order.shipping_name ||
    `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim() ||
    order.customer_name;

  const formatAddress = (addr: any, name?: string) => {
    const parts = [];
    if (name) parts.push(name);
    if (addr.address1) parts.push(addr.address1);
    if (addr.address2) parts.push(addr.address2);
    if (addr.city) {
      const cityLine = [addr.city, addr.province || addr.state, addr.zip].filter(Boolean).join(', ');
      parts.push(cityLine);
    }
    if (addr.country) parts.push(addr.country);
    return parts;
  };

  const shipToAddress = formatAddress(shippingAddress, shippingName);
  const fromAddress = [
    settings.storeName,
    settings.storeAddress.line1,
    settings.storeAddress.line2,
    `${settings.storeAddress.city}, ${settings.storeAddress.state} ${settings.storeAddress.zip}`,
    settings.storeAddress.country,
  ].filter(Boolean);

  return (
    <>
      <style>{`
        @media screen {
          .shipping-slip-wrapper {
            min-height: 100vh;
          }
        }
        @media print {
          .shipping-slip-wrapper {
            padding: 0 !important;
            min-height: auto !important;
            page-break-inside: avoid;
            display: block !important;
            height: auto !important;
          }
          .shipping-slip-container {
            max-width: 100% !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
      <div className="shipping-slip-wrapper w-full flex items-center justify-center bg-white p-8">
        <div className="shipping-slip-container w-full max-w-4xl border-8 border-black p-0">
          {/* Header with Logo */}
          <div className="border-b-4 border-black p-6 flex justify-between items-center">
            <div className="flex-1">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.storeName}
                  className="h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-600">ORDER ID:</div>
              <div className="text-2xl font-bold">#{order.order_number}</div>
            </div>
          </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2">
          {/* Left Column - Ship To */}
          <div className="border-r-4 border-black p-8">
            <div className="bg-black text-white px-6 py-3 inline-block text-2xl font-bold mb-6">
              SHIP TO:
            </div>
            <div className="space-y-2 text-lg leading-relaxed">
              {shipToAddress.map((line, index) => (
                <div key={index} className={index === 0 ? 'font-bold text-xl' : ''}>
                  {line}
                </div>
              ))}
              {(order.phone || shippingAddress.phone) && (
                <div className="mt-4 text-base">
                  <span className="font-semibold">Phone: </span>
                  {order.phone || shippingAddress.phone}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - From */}
          <div className="p-8">
            <div className="text-2xl font-bold mb-6">FROM:</div>
            <div className="space-y-2 text-lg leading-relaxed">
              {fromAddress.map((line, index) => (
                <div key={index} className={index === 0 ? 'font-bold text-xl' : ''}>
                  {line}
                </div>
              ))}
              {settings.contactPhone && (
                <div className="mt-4 text-base">
                  <span className="font-semibold">Phone: </span>
                  {settings.contactPhone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Details Section */}
        <div className="grid grid-cols-2 border-t-4 border-black">
          <div className="border-r-4 border-black">
            {/* Weight */}
            <div className="border-b-4 border-black p-4 flex items-center justify-between">
              <span className="text-lg font-bold">WEIGHT:</span>
              <span className="text-lg">
                {order.order_data?.weight || '0.5'} KG
              </span>
            </div>

            {/* Dimensions */}
            <div className="border-b-4 border-black p-4 flex items-center justify-between">
              <span className="text-lg font-bold">DIMENSIONS:</span>
              <span className="text-lg">
                {order.order_data?.dimensions || '12cm×12cm×12cm'}
              </span>
            </div>

            {/* Shipping Date */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-lg font-bold">SHIPPING DATE:</span>
              <span className="text-lg">
                {new Date().toISOString().split('T')[0]}
              </span>
            </div>
          </div>

          {/* Remarks */}
          <div className="p-4">
            <div className="text-lg font-bold mb-3">REMARKS:</div>
            <div className="text-base text-gray-700 min-h-[100px]">
              {order.note || 'NO REMARKS'}
            </div>
          </div>
        </div>

        {/* Tracking Number Section */}
        <div className="border-t-4 border-black p-6 flex flex-col items-center justify-center bg-white">
          <div className="text-lg font-bold mb-2">TRACKING NUMBER:</div>
          <div className="text-3xl font-mono font-bold tracking-wider">
            {order.tracking && order.tracking.length > 0
              ? order.tracking[0].tracking_number
              : '___________________'}
          </div>
          {order.tracking && order.tracking.length > 0 && (
            <div className="text-sm text-gray-600 mt-2">
              {order.tracking[0].tracking_company}
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
