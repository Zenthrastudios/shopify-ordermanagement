import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, RefreshCw, Package, AlertTriangle, Search, Download, Edit } from 'lucide-react';
import { productsService, ProductInventorySummary, InventoryLocation } from '../../services/productsService';
import { supabase } from '../../lib/supabase';
import { InventoryAdjustmentModal } from './InventoryAdjustmentModal';

interface InventoryManagerProps {
  onBack: () => void;
}

export function InventoryManager({ onBack }: InventoryManagerProps) {
  const [products, setProducts] = useState<ProductInventorySummary[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductInventorySummary[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductInventorySummary | null>(null);

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

  const syncFromShopify = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-products-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to sync products');
      }

      const result = await response.json();
      alert(`Successfully synced ${result.synced} products from Shopify!`);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to sync from Shopify');
    } finally {
      setSyncing(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.product_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleStockChange = async (product: ProductInventorySummary, newStock: number) => {
    const defaultLocation = locations.find(l => l.is_default) || locations[0];
    if (!defaultLocation) return;

    const change = newStock - product.total_available;
    if (change === 0) return;

    try {
      await productsService.adjustInventory(
        product.variant_id,
        defaultLocation.id,
        {
          adjustment_type: change > 0 ? 'received' : 'adjustment',
          quantity_change: change,
          reason: 'Stock adjustment',
        }
      );
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to update stock');
    }
  };

  const lowStockCount = products.filter(p => p.available_to_sell > 0 && p.available_to_sell <= p.reorder_point).length;
  const outOfStockCount = products.filter(p => p.available_to_sell === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.available_to_sell), 0);

  const defaultLocation = locations.find(l => l.is_default) || locations[0];

  return (
    <div className="space-y-6">
      {selectedProduct && defaultLocation && (
        <InventoryAdjustmentModal
          product={selectedProduct}
          locationId={defaultLocation.id}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => {
            loadData();
            setSelectedProduct(null);
          }}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500">Manage stock levels for all products</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncFromShopify}
            disabled={syncing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {syncing ? 'Syncing...' : 'Sync from Shopify'}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600 text-sm font-medium">Total Products</div>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{products.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600 text-sm font-medium">Inventory Value</div>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">₹{totalValue.toFixed(0)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600 text-sm font-medium">Low Stock</div>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-600">{lowStockCount}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600 text-sm font-medium">Out of Stock</div>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">{outOfStockCount}</div>
        </div>
      </div>

      {/* Alert */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">Stock Alert</h3>
              <p className="text-sm text-orange-700">
                {outOfStockCount > 0 && `${outOfStockCount} out of stock`}
                {outOfStockCount > 0 && lowStockCount > 0 && ', '}
                {lowStockCount > 0 && `${lowStockCount} running low`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  stockFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  stockFilter === 'low' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Low ({lowStockCount})
              </button>
              <button
                onClick={() => setStockFilter('out')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  stockFilter === 'out' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Out ({outOfStockCount})
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try a different search' : 'No products match the filter'}
            </p>
            {products.length === 0 && (
              <button
                onClick={syncFromShopify}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Sync Products from Shopify
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const isLowStock = product.available_to_sell > 0 && product.available_to_sell <= product.reorder_point;
                  const isOutOfStock = product.available_to_sell === 0;

                  return (
                    <tr
                      key={product.variant_id}
                      className={`${
                        isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{product.product_title}</div>
                        {product.variant_title !== 'Default' && (
                          <div className="text-sm text-gray-500">{product.variant_title}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {product.sku || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ₹{product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-bold">
                          <span className={
                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'
                          }>
                            {product.total_available}
                          </span>
                        </div>
                        {product.total_committed > 0 && (
                          <div className="text-xs text-gray-500">
                            {product.total_committed} committed
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStockChange(product, product.total_available + 10);
                            }}
                            className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                            title="Quick add 10"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStockChange(product, product.total_available - 1);
                            }}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Quick remove 1"
                            disabled={product.total_available === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product);
                            }}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Advanced adjustment"
                          >
                            <Edit className="w-4 h-4" />
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
    </div>
  );
}
