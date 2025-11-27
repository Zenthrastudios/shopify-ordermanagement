import { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, AlertTriangle } from 'lucide-react';
import { productsService, ProductInventorySummary } from '../../services/productsService';
import { ProductCreator } from './ProductCreator';
import { ProductDetail } from './ProductDetail';
import { InventoryManager } from './InventoryManager';

type ViewMode = 'list' | 'create' | 'detail' | 'inventory';

export function ProductsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [products, setProducts] = useState<ProductInventorySummary[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductInventorySummary[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, statusFilter, lowStockOnly]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productsService.getInventorySummary();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.product_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.product_status === statusFilter);
    }

    if (lowStockOnly) {
      filtered = filtered.filter(p => p.available_to_sell <= p.reorder_point);
    }

    setFilteredProducts(filtered);
  };

  const handleProductCreated = () => {
    setViewMode('list');
    loadProducts();
  };

  const handleProductUpdated = () => {
    loadProducts();
  };

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.available_to_sell <= p.reorder_point).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.available_to_sell), 0);
  const totalInventory = products.reduce((sum, p) => sum + p.available_to_sell, 0);

  if (viewMode === 'create') {
    return <ProductCreator onBack={() => setViewMode('list')} onCreated={handleProductCreated} />;
  }

  if (viewMode === 'detail' && selectedProductId) {
    return (
      <ProductDetail
        productId={selectedProductId}
        onBack={() => {
          setViewMode('list');
          setSelectedProductId(null);
        }}
        onUpdated={handleProductUpdated}
      />
    );
  }

  if (viewMode === 'inventory') {
    return <InventoryManager onBack={() => setViewMode('list')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products & Inventory</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setViewMode('inventory')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Manage Inventory
          </button>
          <button
            onClick={() => setViewMode('create')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Total Products</div>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalProducts}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Total Units</div>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalInventory.toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Inventory Value</div>
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">₹{totalValue.toFixed(0)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Low Stock Items</div>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">{lowStockCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  lowStockOnly
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Low Stock Only
              </button>
            </div>
          </div>
        </div>

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
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || lowStockOnly
                ? 'Try adjusting your filters'
                : 'Create your first product to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && !lowStockOnly && (
              <button
                onClick={() => setViewMode('create')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Product
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Committed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Sell</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const isLowStock = product.available_to_sell <= product.reorder_point;
                  return (
                    <tr
                      key={product.variant_id}
                      onClick={() => {
                        setSelectedProductId(product.product_id);
                        setViewMode('detail');
                      }}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-blue-600">{product.product_title}</div>
                        <div className="text-sm text-gray-500">{product.variant_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₹{product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.total_available}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.total_committed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                          {product.available_to_sell}
                          {isLowStock && (
                            <AlertTriangle className="w-4 h-4 inline ml-1" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          product.product_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : product.product_status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.product_status}
                        </span>
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
