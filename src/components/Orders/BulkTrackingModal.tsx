import { useState, useEffect, useRef } from 'react';
import { X, Truck, Save, Check, AlertCircle, Scan, Camera, Keyboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { OrderWithItems } from '../../types';
import MobileBarcodeScanner from './MobileBarcodeScanner';

interface BulkTrackingModalProps {
  orderIds: string[];
  orders: OrderWithItems[];
  onClose: () => void;
  onComplete: () => void;
}

interface TrackingEntry {
  orderId: string;
  orderNumber: string;
  trackingNumber: string;
  trackingCompany: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

interface TrackingPartner {
  id: string;
  name: string;
  tracking_url_template: string;
  is_active: boolean;
  is_default: boolean;
}

export default function BulkTrackingModal({ orderIds, orders, onClose, onComplete }: BulkTrackingModalProps) {
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackingPartners, setTrackingPartners] = useState<TrackingPartner[]>([]);
  const [defaultCarrier, setDefaultCarrier] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [mobileScanMode, setMobileScanMode] = useState(false);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [scanBuffer, setScanBuffer] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanBufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getTrackingUrl = (company: string, number: string) => {
    const partner = trackingPartners.find(p => p.name === company);
    if (partner && partner.tracking_url_template) {
      return partner.tracking_url_template.replace(/\{tracking_number\}/g, number);
    }
    return `https://track.example.com/${number}`;
  };

  useEffect(() => {
    loadTrackingPartners();
    return () => {
      if (scanBufferTimeoutRef.current) {
        clearTimeout(scanBufferTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scanMode && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [scanMode, currentScanIndex]);

  useEffect(() => {
    if (trackingPartners.length > 0 && !defaultCarrier) {
      const defaultPartner = trackingPartners.find(p => p.is_default) || trackingPartners.find(p => p.is_active);
      if (defaultPartner) {
        setDefaultCarrier(defaultPartner.name);
      }
    }
  }, [trackingPartners]);

  useEffect(() => {
    if (defaultCarrier) {
      const entries = orders
        .filter(order => orderIds.includes(order.id))
        .map(order => ({
          orderId: order.id,
          orderNumber: String(order.order_number),
          trackingNumber: '',
          trackingCompany: defaultCarrier,
          status: 'pending' as const,
        }));
      setTrackingEntries(entries);
    }
  }, [orderIds, orders, defaultCarrier]);

  const loadTrackingPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('tracking_partners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTrackingPartners(data || []);
    } catch (error) {
      console.error('Error loading tracking partners:', error);
    }
  };

  const updateTrackingEntry = (orderId: string, field: 'trackingNumber' | 'trackingCompany', value: string) => {
    setTrackingEntries(prev =>
      prev.map(entry =>
        entry.orderId === orderId ? { ...entry, [field]: value, status: 'pending' } : entry
      )
    );
  };

  const applyDefaultCarrier = () => {
    setTrackingEntries(prev =>
      prev.map(entry => ({ ...entry, trackingCompany: defaultCarrier }))
    );
  };

  const handleScanButtonClick = () => {
    if (scanInputRef.current) {
      const value = scanInputRef.current.value.trim();
      if (value) {
        processScannedBarcode(value);
        scanInputRef.current.value = '';
      } else {
        alert('Please enter or scan a tracking number');
      }
    }
  };

  const processScannedBarcode = (barcode: string) => {
    const entriesWithoutTracking = trackingEntries.filter(e => !e.trackingNumber.trim());

    if (entriesWithoutTracking.length === 0) {
      alert('All orders already have tracking numbers!');
      return;
    }

    const currentEntry = entriesWithoutTracking[currentScanIndex];

    if (currentEntry) {
      setTrackingEntries(prev =>
        prev.map(entry =>
          entry.orderId === currentEntry.orderId
            ? { ...entry, trackingNumber: barcode, status: 'pending' }
            : entry
        )
      );

      if (currentScanIndex < entriesWithoutTracking.length - 1) {
        setCurrentScanIndex(prev => prev + 1);
      } else {
        setScanMode(false);
        setMobileScanMode(false);
        alert('All orders have been scanned!');
      }
    }
  };

  const toggleScanMode = () => {
    const entriesWithoutTracking = trackingEntries.filter(e => !e.trackingNumber.trim());

    if (!scanMode && entriesWithoutTracking.length === 0) {
      alert('All orders already have tracking numbers!');
      return;
    }

    setScanMode(!scanMode);
    setCurrentScanIndex(0);
    setScanBuffer('');
  };

  const toggleMobileScanMode = () => {
    const entriesWithoutTracking = trackingEntries.filter(e => !e.trackingNumber.trim());

    if (!mobileScanMode && entriesWithoutTracking.length === 0) {
      alert('All orders already have tracking numbers!');
      return;
    }

    setMobileScanMode(!mobileScanMode);
    if (!mobileScanMode) {
      setCurrentScanIndex(0);
    }
  };

  const getCurrentScanEntry = () => {
    const entriesWithoutTracking = trackingEntries.filter(e => !e.trackingNumber.trim());
    return entriesWithoutTracking[currentScanIndex];
  };

  const handleMobileScan = (barcode: string) => {
    processScannedBarcode(barcode);
  };

  const handleSubmit = async () => {
    const entriesToUpdate = trackingEntries.filter(entry => entry.trackingNumber.trim());

    if (entriesToUpdate.length === 0) {
      alert('Please add at least one tracking number');
      return;
    }

    if (!confirm(`Add tracking numbers to ${entriesToUpdate.length} order(s)?`)) {
      return;
    }

    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-fulfillment`;
      let successCount = 0;

      for (const entry of entriesToUpdate) {
        try {
          const finalTrackingUrl = getTrackingUrl(entry.trackingCompany, entry.trackingNumber.trim());
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: entry.orderId,
              trackingNumber: entry.trackingNumber.trim(),
              trackingCompany: entry.trackingCompany,
              trackingUrl: finalTrackingUrl,
              notifyCustomer: true,
            }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result?.error || result?.shopifyError?.message || 'Failed to add tracking');
          }

          successCount += 1;
          setTrackingEntries(prev => prev.map(e => e.orderId === entry.orderId ? { ...e, status: 'success' } : e));
        } catch (err: unknown) {
          let msg = 'Failed to add tracking';
          if (err && typeof err === 'object' && 'message' in err) {
            const m = (err as Record<string, unknown>).message;
            msg = typeof m === 'string' ? m : JSON.stringify(m);
          }
          setTrackingEntries(prev => prev.map(e => e.orderId === entry.orderId ? { ...e, status: 'error', error: msg } : e));
        }
      }

      alert(`Successfully processed ${successCount} of ${entriesToUpdate.length} order(s)`);
      onComplete();
    } catch (error) {
      console.error('Error adding tracking numbers:', error);
      alert('Failed to add tracking numbers');
    } finally {
      setLoading(false);
    }
  };

  const currentEntry = getCurrentScanEntry();

  return (
    <>
      {mobileScanMode && currentEntry && (
        <MobileBarcodeScanner
          onScan={handleMobileScan}
          onClose={() => setMobileScanMode(false)}
          currentOrderNumber={currentEntry.orderNumber}
          progress={`${currentScanIndex + 1} of ${trackingEntries.filter(e => !e.trackingNumber.trim()).length} remaining`}
        />
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-gray-900">Bulk Add Tracking</h2>
              <p className="text-xs sm:text-sm text-gray-500">{trackingEntries.length} orders selected</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-6 border-b border-gray-200 bg-gray-50 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-4">
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Default Carrier
              </label>
              <select
                value={defaultCarrier}
                onChange={(e) => setDefaultCarrier(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {trackingPartners.map((partner) => (
                  <option key={partner.id} value={partner.name}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={applyDefaultCarrier}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"
              >
                Apply to All
              </button>
              <button
                onClick={toggleMobileScanMode}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Camera</span>
              </button>
              <button
                onClick={toggleScanMode}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                  scanMode
                    ? 'bg-gray-700 text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{scanMode ? 'Exit' : 'Manual'}</span>
              </button>
            </div>
          </div>

          {scanMode && (
            <div className="bg-white border-2 border-gray-400 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Keyboard className="w-5 h-5 text-gray-700" />
                    <h3 className="font-semibold text-gray-900">Manual Entry Mode</h3>
                  </div>

                  {currentEntry ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-600 mb-1">Currently Entering:</p>
                        <p className="text-2xl font-bold text-gray-900">
                          Order #{currentEntry.orderNumber}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scan with handheld scanner or type tracking number:
                        </label>
                        <div className="flex gap-2">
                          <input
                            ref={scanInputRef}
                            type="text"
                            defaultValue=""
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleScanButtonClick();
                              }
                            }}
                            placeholder="Scan or type tracking number..."
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                            autoFocus
                          />
                          <button
                            onClick={handleScanButtonClick}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                          >
                            <Scan className="w-5 h-5" />
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>
                            Progress: {currentScanIndex + 1} of {trackingEntries.filter(e => !e.trackingNumber.trim()).length} remaining orders
                          </span>
                        </div>

                        {currentEntry.trackingNumber && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-800">
                              <Check className="w-5 h-5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium mb-0.5">Tracking Added:</p>
                                <p className="text-sm font-mono break-all">{currentEntry.trackingNumber}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-600">No more orders to scan!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-6 min-w-0">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider w-16 sm:w-24">
                      Order
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 sm:w-36">
                      Company
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tracking Number
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider w-12 sm:w-16">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {trackingEntries.map((entry) => (
                    <tr key={entry.orderId} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className="font-medium text-gray-900 text-[10px] sm:text-sm whitespace-nowrap">#{entry.orderNumber}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <select
                          value={entry.trackingCompany}
                          onChange={(e) => updateTrackingEntry(entry.orderId, 'trackingCompany', e.target.value)}
                          disabled={loading || entry.status === 'success'}
                          className="w-full min-w-[90px] px-1.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[10px] sm:text-sm disabled:bg-gray-100"
                        >
                          {trackingPartners.map((partner) => (
                            <option key={partner.id} value={partner.name}>
                              {partner.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <input
                          type="text"
                          value={entry.trackingNumber}
                          onChange={(e) => updateTrackingEntry(entry.orderId, 'trackingNumber', e.target.value)}
                          disabled={loading || entry.status === 'success'}
                          placeholder="Enter tracking"
                          className="w-full min-w-[120px] px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[10px] sm:text-sm disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        {entry.status === 'success' && (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        )}
                        {entry.status === 'error' && (
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" title={entry.error} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex gap-2 text-xs sm:text-sm text-blue-800">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-medium">Tips:</p>
                <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-blue-700 mt-1">
                  <li>Use "Camera" to scan with your phone camera</li>
                  <li>Use "Manual" for handheld scanners</li>
                  <li>Set default carrier to save time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            {trackingEntries.filter(e => e.trackingNumber.trim()).length} of {trackingEntries.length} have tracking
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || trackingEntries.filter(e => e.trackingNumber.trim()).length === 0}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
