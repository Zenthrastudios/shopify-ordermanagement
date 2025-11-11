import { useState } from 'react';
import { CheckCircle, Truck, Printer, X } from 'lucide-react';
import { bulkUpdateFulfillmentStatus } from '../../services/ordersService';
import BulkTrackingModal from './BulkTrackingModal';
import type { OrderWithItems } from '../../types';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedOrderIds: string[];
  selectedOrders: OrderWithItems[];
  onComplete: () => void;
  onPrintSlips: (orders: OrderWithItems[]) => void;
}

export default function BulkActionsBar({ selectedCount, selectedOrderIds, selectedOrders, onComplete, onPrintSlips }: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  const handleBulkFulfill = async () => {
    if (!confirm(`Mark ${selectedCount} orders as fulfilled?`)) return;

    setLoading(true);
    try {
      await bulkUpdateFulfillmentStatus(selectedOrderIds, 'fulfilled');
      alert('Orders updated successfully');
      onComplete();
    } catch (error) {
      console.error('Error updating orders:', error);
      alert('Failed to update orders');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPrint = () => {
    onPrintSlips(selectedOrders);
  };

  return (
    <>
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 lg:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <span className="text-xs lg:text-sm font-medium text-blue-900">
              {selectedCount} order{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBulkFulfill}
                disabled={loading}
                className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-xs lg:text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Mark Fulfilled</span>
                <span className="sm:hidden">Fulfill</span>
              </button>
              <button
                onClick={() => setShowTrackingModal(true)}
                className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-xs lg:text-sm font-medium flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Add Tracking</span>
                <span className="sm:hidden">Track</span>
              </button>
              <button
                onClick={handleBulkPrint}
                className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-xs lg:text-sm font-medium flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Print Slips</span>
                <span className="sm:hidden">Print</span>
              </button>
            </div>
          </div>
          <button
            onClick={onComplete}
            className="absolute top-3 right-3 sm:static text-blue-600 hover:text-blue-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showTrackingModal && (
        <BulkTrackingModal
          orderIds={selectedOrderIds}
          orders={selectedOrders}
          onClose={() => setShowTrackingModal(false)}
          onComplete={() => {
            setShowTrackingModal(false);
            onComplete();
          }}
        />
      )}
    </>
  );
}
