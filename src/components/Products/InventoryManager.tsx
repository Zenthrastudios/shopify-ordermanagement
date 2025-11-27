import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, RefreshCw, Package, AlertTriangle } from 'lucide-react';
import { productsService, ProductInventorySummary, InventoryLocation } from '../../services/productsService';

interface InventoryManagerProps {
  onBack: () => void;
}

export function InventoryManager({ onBack }: InventoryManagerProps) {
  const [products, setProducts] = useState<ProductInventorySummary[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductInventorySummary | null>(null);
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'adjustment' as any,
    quantity: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, locationsData] = await Promise.all([
        productsService.getInventorySummary(),
        productsService.getLocations(),
      ]);
      setProducts(productsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async () => {
    if (!selectedVariant || !adjustmentData.quantity) return;

    const defaultLocation = locations.find(l => l.is_default) || locations[0];
    if (!defaultLocation) {
      alert('No location found');
      return;
    }

    try {
      await productsService.adjustInventory(
        selectedVariant.variant_id,
        defaultLocation.id,
        {
          adjustment_type: adjustmentData.type,
          quantity_change: parseInt(adjustmentData.quantity),
          reason: adjustmentData.reason,
          notes: adjustmentData.notes,
        }
      );

      setAdjustmentModal(false);
      setSelectedVariant(null);
      setAdjustmentData({
        type: 'adjustment',
        quantity: '',
        reason: '',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to adjust inventory');
    }
  };

  const lowStockItems = products.filter(p => p.available_to_sell <= p.reorder_point);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Manager</h1>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Low Stock Alert</h3>
              <p className="text-sm text-red-700 mt-1">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder point
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Committed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Sell</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const isLowStock = product.available_to_sell <= product.reorder_point;
                  return (
                    <tr key={product.variant_id} className={isLowStock ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.product_title}</div>
                        <div className="text-sm text-gray-500">{product.variant_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.total_available}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.total_committed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                          {product.available_to_sell}
                          {isLowStock && <AlertTriangle className="w-4 h-4 inline ml-1" />}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.reorder_point}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedVariant(product);
                              setAdjustmentData({ ...adjustmentData, type: 'received', quantity: '' });
                              setAdjustmentModal(true);
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Add Stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVariant(product);
                              setAdjustmentData({ ...adjustmentData, type: 'adjustment', quantity: '' });
                              setAdjustmentModal(true);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove Stock"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjustmentModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Adjust Inventory</h3>

            <div>
              <p className="text-sm text-gray-600">Product</p>
              <p className="font-medium">{selectedVariant.product_title} - {selectedVariant.variant_title}</p>
              <p className="text-sm text-gray-500">Current: {selectedVariant.available_to_sell} units</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adjustment Type
              </label>
              <select
                value={adjustmentData.type}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="received">Received</option>
                <option value="sold">Sold</option>
                <option value="damaged">Damaged</option>
                <option value="returned">Returned</option>
                <option value="correction">Correction</option>
                <option value="adjustment">Manual Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity {adjustmentData.type === 'received' || adjustmentData.type === 'returned' ? '(+)' : '(-)'}
              </label>
              <input
                type="number"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <input
                type="text"
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Why are you adjusting?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={adjustmentData.notes}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setAdjustmentModal(false);
                  setSelectedVariant(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
