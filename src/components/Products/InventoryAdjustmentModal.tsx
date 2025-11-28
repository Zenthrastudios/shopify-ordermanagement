import { useState } from 'react';
import { X, Plus, Minus, Package, TrendingDown, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { productsService, ProductInventorySummary } from '../../services/productsService';

interface InventoryAdjustmentModalProps {
  product: ProductInventorySummary;
  locationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryAdjustmentModal({
  product,
  locationId,
  onClose,
  onSuccess,
}: InventoryAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const adjustmentTypes = [
    { value: 'received', label: 'Received Stock', icon: Package, color: 'green' },
    { value: 'sold', label: 'Sold', icon: TrendingDown, color: 'blue' },
    { value: 'damaged', label: 'Damaged', icon: X, color: 'red' },
    { value: 'returned', label: 'Customer Return', icon: RotateCcw, color: 'orange' },
    { value: 'adjustment', label: 'Manual Adjustment', icon: ArrowLeftRight, color: 'gray' },
  ];

  const [selectedReason, setSelectedReason] = useState(adjustmentTypes[0].value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let quantityChange = 0;

      if (adjustmentType === 'add') {
        quantityChange = quantity;
      } else if (adjustmentType === 'remove') {
        quantityChange = -quantity;
      } else {
        quantityChange = quantity - product.total_available;
      }

      await productsService.adjustInventory(product.variant_id, locationId, {
        adjustment_type: selectedReason as any,
        quantity_change: quantityChange,
        reason: reason || adjustmentTypes.find(t => t.value === selectedReason)?.label,
        notes: notes,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to adjust inventory');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewQuantity = () => {
    if (adjustmentType === 'add') {
      return product.total_available + quantity;
    } else if (adjustmentType === 'remove') {
      return Math.max(0, product.total_available - quantity);
    } else {
      return quantity;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Adjust Inventory</h2>
            <p className="text-sm text-gray-500 mt-1">{product.product_title}</p>
            {product.variant_title !== 'Default' && (
              <p className="text-xs text-gray-400">{product.variant_title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Current Stock</p>
                <p className="text-2xl font-bold text-blue-600">{product.total_available} units</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-blue-900">After Adjustment</p>
                <p className="text-2xl font-bold text-green-600">{calculateNewQuantity()} units</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'add'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Plus className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Add Stock</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('remove')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'remove'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Minus className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Remove Stock</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('set')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'set'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowLeftRight className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Set Stock</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {adjustmentType === 'set' ? 'New Quantity' : 'Quantity'}
            </label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {adjustmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional details..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || quantity <= 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
