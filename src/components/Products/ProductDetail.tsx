import { useState, useEffect } from 'react';
import { ArrowLeft, Package, TrendingUp, DollarSign, Users } from 'lucide-react';
import { productsService, ProductWithDetails } from '../../services/productsService';
import { analyticsService } from '../../services/analyticsService';

interface ProductDetailProps {
  productId: string;
  onBack: () => void;
  onUpdated: () => void;
}

export function ProductDetail({ productId, onBack, onUpdated }: ProductDetailProps) {
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
    loadSalesData();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const data = await productsService.getProductById(productId);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const data = await analyticsService.getProductPerformance({ startDate, endDate });
      setSalesData(data);
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="animate-pulse h-8 bg-gray-200 rounded w-64" />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse h-96 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Product Not Found</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">This product could not be found.</p>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const productSales = salesData?.find((p: any) => p.productName === product.title);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
          <p className="text-sm text-gray-500">{product.vendor} • {product.product_type}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Total Inventory</div>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{product.total_inventory}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Available to Sell</div>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">{product.available_to_sell}</div>
        </div>

        {productSales && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-500 text-sm font-medium">Units Sold (30d)</div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{productSales.unitsSold}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-500 text-sm font-medium">Revenue (30d)</div>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">₹{productSales.revenue.toFixed(0)}</div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Product Information</h2>

        {product.description && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
            <p className="text-sm text-gray-600">{product.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Status</p>
            <p className="text-sm text-gray-900">{product.status}</p>
          </div>
          {product.tags.length > 0 && (
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {product.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Variants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inventory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {product.variants.map((variant) => {
                const totalInv = variant.inventory.reduce((sum, i) => sum + i.available, 0);
                const committed = variant.inventory.reduce((sum, i) => sum + i.committed, 0);
                return (
                  <tr key={variant.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{variant.title}</div>
                      {variant.barcode && (
                        <div className="text-sm text-gray-500">Barcode: {variant.barcode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {variant.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{variant.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {totalInv}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {totalInv - committed}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
