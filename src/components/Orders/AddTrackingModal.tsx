import { useState } from 'react';
import { X, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddTrackingModalProps {
  orderId: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function AddTrackingModal({ orderId, onClose, onComplete }: AddTrackingModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCompany, setTrackingCompany] = useState('Delhivery');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [loading, setLoading] = useState(false);

  const carriers = [
    'Delhivery',
    'Blue Dart',
    'DTDC',
    'FedEx',
    'Ekart',
    'India Post',
    'Ecom Express',
    'Shadowfax',
    'UPS',
    'DHL',
    'Aramex',
    'Other',
  ];

  const getTrackingUrl = (company: string, number: string) => {
    const urls: Record<string, string> = {
      'Delhivery': `https://www.delhivery.com/track/package/${number}`,
      'Blue Dart': `https://www.bluedart.com/tracking/${number}`,
      'DTDC': `https://www.dtdc.in/tracking/${number}`,
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${number}`,
      'India Post': `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentno=${number}`,
      'Ecom Express': `https://ecomexpress.in/tracking/?awb=${number}`,
      'UPS': `https://www.ups.com/track?tracknum=${number}`,
      'DHL': `https://www.dhl.com/in-en/home/tracking.html?tracking-id=${number}`,
    };
    return urls[company] || trackingUrl || `https://track.example.com/${number}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    setLoading(true);
    try {
      const finalTrackingUrl = trackingUrl || getTrackingUrl(trackingCompany, trackingNumber.trim());

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-fulfillment`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          trackingNumber: trackingNumber.trim(),
          trackingCompany,
          trackingUrl: finalTrackingUrl,
          notifyCustomer,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.shopifyUpdated) {
          alert('Tracking added and Shopify updated successfully!');
        } else {
          alert('Tracking added successfully!');
        }
        onComplete();
      } else {
        throw new Error(result.error || 'Failed to add tracking');
      }
    } catch (error) {
      console.error('Error adding tracking number:', error);
      alert(`Failed to add tracking number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Add Tracking Number</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Company
            </label>
            <select
              value={trackingCompany}
              onChange={(e) => setTrackingCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {carriers.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Number
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking URL (Optional)
            </label>
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="Auto-generated if left empty"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate based on carrier</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notifyCustomer"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="notifyCustomer" className="text-sm font-medium text-gray-700">
              Notify customer via email/SMS
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Tracking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
