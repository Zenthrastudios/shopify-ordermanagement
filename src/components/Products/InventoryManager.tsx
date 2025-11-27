import { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Minus, RefreshCw, Package, AlertTriangle,
  Search, Edit2, Save, X, History, TrendingUp, TrendingDown, BarChart3
} from 'lucide-react';
import { productsService, ProductInventorySummary, InventoryLocation, InventoryAdjustment } from '../../services/productsService';
import { format } from 'date-fns';

interface InventoryManagerProps {
  onBack: () => void;
}

export function InventoryManager({ onBack }: InventoryManagerProps) {
  const [products, setProducts] = useState<ProductInventorySummary[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductInventorySummary[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const [selectedVariant, setSelectedVariant] = useState<ProductInventorySummary | null>(null);
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [adjustmentData, setAdjustmentData] = useState({
    type: 'adjustment' as any,
    quantity: '',
    reason: '',
    notes: '',
  });

  const [adjustmentHistory, setAdjustmentHistory] = useState<InventoryAdjustment[]>([]);
  const [editingStock, setEditingStock] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, stockFilter]);

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

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.product_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variant_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stockFilter === 'low') {
      filtered = filtered.filter(p => p.available_to_sell > 0 && p.available_to_sell <= p.reorder_point);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(p => p.available_to_sell === 0);
    }

    setFilteredProducts(filtered);
  };

  const loadHistory = async (variantId: string) => {
    try {
      const history = await productsService.getInventoryAdjustments(variantId);
      setAdjustmentHistory(history);
      setHistoryModal(true);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleAdjustment = async () => {
    if (!selectedVariant || !adjustmentData.quantity) return;

    const defaultLocation = locations.find(l => l.is_default) || locations[0];
    if (!defaultLocation) {
      alert('No location found');
      return;
    }

    const quantityChange = adjustmentData.type === 'received' || adjustmentData.type === 'returned'
      ? parseInt(adjustmentData.quantity)
      : -parseInt(adjustmentData.quantity);

    try {
      await productsService.adjustInventory(
        selectedVariant.variant_id,
        defaultLocation.id,
        {
          adjustment_type: adjustmentData.type,
          quantity_change: quantityChange,
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

  const handleQuickAdjust = async (product: ProductInventorySummary, change: number) => {
    const defaultLocation = locations.find(l => l.is_default) || locations[0];
    if (!defaultLocation) return;

    try {
      await productsService.adjustInventory(
        product.variant_id,
        defaultLocation.id,
        {
          adjustment_type: change > 0 ? 'received' : 'adjustment',
          quantity_change: change,
          reason: 'Quick adjustment',
        }
      );
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to adjust inventory');
    }
  };

  const handleBulkSelect = (variantId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedItems(newSelected);
  };

  const handleEditStock = (variantId: string, currentStock: number) => {
    setEditingStock({ ...editingStock, [variantId]: currentStock.toString() });
  };

  const handleSaveStock = async (product: ProductInventorySummary) => {
    const newStock = parseInt(editingStock[product.variant_id] || '0');
    const currentStock = product.total_available;
    const change = newStock - currentStock;

    if (change === 0) {
      const newEditing = { ...editingStock };
      delete newEditing[product.variant_id];
      setEditingStock(newEditing);
      return;
    }

    await handleQuickAdjust(product, change);
    const newEditing = { ...editingStock };
    delete newEditing[product.variant_id];
    setEditingStock(newEditing);
  };

  const lowStockItems = products.filter(p => p.available_to_sell > 0 && p.available_to_sell <= p.reorder_point);
  const outOfStockItems = products.filter(p => p.available_to_sell === 0);
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.available_to_sell), 0);
  const totalUnits = products.reduce((sum, p) => sum + p.available_to_sell, 0);

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500">Track and manage stock levels across all products</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkEditMode(!bulkEditMode)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              bulkEditMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            {bulkEditMode ? 'Exit Bulk' : 'Bulk Edit'}
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Total Products</div>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{products.length}</div>
          <div className="text-xs text-gray-500 mt-1">{totalUnits.toLocaleString()} units</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Inventory Value</div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">₹{totalValue.toFixed(0)}</div>
          <div className="text-xs text-gray-500 mt-1">Total retail value</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Low Stock</div>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-600">{lowStockItems.length}</div>
          <div className="text-xs text-gray-500 mt-1">Below reorder point</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Out of Stock</div>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">{outOfStockItems.length}</div>
          <div className="text-xs text-gray-500 mt-1">Needs restocking</div>
        </div>
      </div>

      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">Stock Alert</h3>
              <p className="text-sm text-orange-700 mt-1">
                {outOfStockItems.length > 0 && (
                  <span className="font-semibold">{outOfStockItems.length} items out of stock</span>
                )}
                {outOfStockItems.length > 0 && lowStockItems.length > 0 && ', '}
                {lowStockItems.length > 0 && (
                  <span>{lowStockItems.length} items running low</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products, SKU, or variant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  stockFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  stockFilter === 'low' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Low ({lowStockItems.length})
              </button>
              <button
                onClick={() => setStockFilter('out')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  stockFilter === 'out' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Out ({outOfStockItems.length})
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'No products match the selected filter'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {bulkEditMode && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(new Set(filteredProducts.map(p => p.variant_id)));
                          } else {
                            setSelectedItems(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">On Hand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Committed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const isLowStock = product.available_to_sell > 0 && product.available_to_sell <= product.reorder_point;
                  const isOutOfStock = product.available_to_sell === 0;
                  const isEditing = editingStock[product.variant_id] !== undefined;

                  return (
                    <tr
                      key={product.variant_id}
                      className={`${
                        isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : 'hover:bg-gray-50'
                      } transition-colors`}
                    >
                      {bulkEditMode && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(product.variant_id)}
                            onChange={() => handleBulkSelect(product.variant_id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.product_title}</div>
                        <div className="text-sm text-gray-500">{product.variant_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-mono">{product.sku || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₹{product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingStock[product.variant_id]}
                            onChange={(e) => setEditingStock({ ...editingStock, [product.variant_id]: e.target.value })}
                            className="w-20 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{product.total_available}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.total_committed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {product.available_to_sell}
                          </span>
                          {(isLowStock || isOutOfStock) && (
                            <AlertTriangle className="w-4 h-4 text-current" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.reorder_point}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveStock(product)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const newEditing = { ...editingStock };
                                  delete newEditing[product.variant_id];
                                  setEditingStock(newEditing);
                                }}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditStock(product.variant_id, product.total_available)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit Stock"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(product, 1)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Add 1"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(product, -1)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove 1"
                                disabled={product.total_available === 0}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedVariant(product);
                                  setAdjustmentModal(true);
                                }}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                title="Advanced Adjustment"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedVariant(product);
                                  loadHistory(product.variant_id);
                                }}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="View History"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </>
                          )}
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Adjust Inventory</h3>
              <button
                onClick={() => setAdjustmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Product</p>
              <p className="font-medium">{selectedVariant.product_title}</p>
              <p className="text-sm text-gray-500">{selectedVariant.variant_title}</p>
              <p className="text-sm text-gray-600 mt-2">Current Stock: <span className="font-semibold text-gray-900">{selectedVariant.available_to_sell} units</span></p>
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
                <option value="received">Received Stock (+)</option>
                <option value="sold">Sold (-)</option>
                <option value="damaged">Damaged (-)</option>
                <option value="returned">Customer Return (+)</option>
                <option value="correction">Stock Correction</option>
                <option value="adjustment">Manual Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
                min="1"
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
                Notes (Optional)
              </label>
              <textarea
                value={adjustmentData.notes}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Additional details..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setAdjustmentModal(false);
                  setSelectedVariant(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustment}
                disabled={!adjustmentData.quantity}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Inventory History</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedVariant.product_title} - {selectedVariant.variant_title}
                </p>
              </div>
              <button
                onClick={() => {
                  setHistoryModal(false);
                  setSelectedVariant(null);
                  setAdjustmentHistory([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {adjustmentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No adjustment history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adjustmentHistory.map((adjustment) => {
                    const isIncrease = adjustment.quantity_change > 0;
                    return (
                      <div key={adjustment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isIncrease ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {isIncrease ? (
                                <TrendingUp className="w-5 h-5 text-green-600" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 capitalize">
                                {adjustment.adjustment_type.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(adjustment.created_at), 'MMM dd, yyyy hh:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                              {isIncrease ? '+' : ''}{adjustment.quantity_change}
                            </p>
                            <p className="text-sm text-gray-500">
                              {adjustment.quantity_before} → {adjustment.quantity_after}
                            </p>
                          </div>
                        </div>
                        {adjustment.reason && (
                          <p className="text-sm text-gray-700 mt-2">
                            <span className="font-medium">Reason:</span> {adjustment.reason}
                          </p>
                        )}
                        {adjustment.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Notes:</span> {adjustment.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
