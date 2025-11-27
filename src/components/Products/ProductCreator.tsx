import { useState } from 'react';
import { ArrowLeft, Plus, X, Save } from 'lucide-react';
import { productsService } from '../../services/productsService';

interface ProductCreatorProps {
  onBack: () => void;
  onCreated: () => void;
}

interface VariantForm {
  title: string;
  sku: string;
  barcode: string;
  price: string;
  compare_at_price: string;
  cost_price: string;
  weight: string;
  option1: string;
  option2: string;
  option3: string;
}

export function ProductCreator({ onBack, onCreated }: ProductCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productData, setProductData] = useState({
    title: '',
    description: '',
    vendor: '',
    product_type: '',
    tags: [] as string[],
    status: 'active' as 'active' | 'draft' | 'archived',
  });

  const [tagInput, setTagInput] = useState('');
  const [variants, setVariants] = useState<VariantForm[]>([
    {
      title: 'Default',
      sku: '',
      barcode: '',
      price: '0',
      compare_at_price: '',
      cost_price: '',
      weight: '0',
      option1: '',
      option2: '',
      option3: '',
    },
  ]);

  const handleAddTag = () => {
    if (tagInput.trim() && !productData.tags.includes(tagInput.trim())) {
      setProductData({
        ...productData,
        tags: [...productData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setProductData({
      ...productData,
      tags: productData.tags.filter(t => t !== tag),
    });
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        title: `Variant ${variants.length + 1}`,
        sku: '',
        barcode: '',
        price: productData ? variants[0]?.price || '0' : '0',
        compare_at_price: '',
        cost_price: '',
        weight: '0',
        option1: '',
        option2: '',
        option3: '',
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const handleVariantChange = (index: number, field: keyof VariantForm, value: string) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productData.title.trim()) {
      setError('Product title is required');
      return;
    }

    setLoading(true);
    try {
      const variantsData = variants.map((v, index) => ({
        title: v.title,
        sku: v.sku || undefined,
        barcode: v.barcode || undefined,
        price: parseFloat(v.price) || 0,
        compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : undefined,
        cost_price: v.cost_price ? parseFloat(v.cost_price) : undefined,
        weight: parseFloat(v.weight) || 0,
        weight_unit: 'kg',
        position: index,
        option1: v.option1 || undefined,
        option2: v.option2 || undefined,
        option3: v.option3 || undefined,
        inventory_policy: 'deny' as const,
        requires_shipping: true,
        taxable: true,
      }));

      await productsService.createProduct(productData, variantsData);
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Product</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Title *
            </label>
            <input
              type="text"
              value={productData.title}
              onChange={(e) => setProductData({ ...productData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Premium Cotton T-Shirt"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={productData.description}
              onChange={(e) => setProductData({ ...productData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your product..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <input
                type="text"
                value={productData.vendor}
                onChange={(e) => setProductData({ ...productData, vendor: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brand name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Type
              </label>
              <input
                type="text"
                value={productData.product_type}
                onChange={(e) => setProductData({ ...productData, product_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Apparel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={productData.status}
                onChange={(e) => setProductData({ ...productData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
            {productData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {productData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Variants</h2>
            <button
              type="button"
              onClick={handleAddVariant}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Variant
            </button>
          </div>

          {variants.map((variant, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Variant {index + 1}</h3>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant Title
                  </label>
                  <input
                    type="text"
                    value={variant.title}
                    onChange={(e) => handleVariantChange(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Stock keeping unit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={variant.barcode}
                    onChange={(e) => handleVariantChange(index, 'barcode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.price}
                    onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compare at Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.compare_at_price}
                    onChange={(e) => handleVariantChange(index, 'compare_at_price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.cost_price}
                    onChange={(e) => handleVariantChange(index, 'cost_price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.weight}
                    onChange={(e) => handleVariantChange(index, 'weight', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Option 1 (e.g., Size)
                  </label>
                  <input
                    type="text"
                    value={variant.option1}
                    onChange={(e) => handleVariantChange(index, 'option1', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="M, L, XL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Option 2 (e.g., Color)
                  </label>
                  <input
                    type="text"
                    value={variant.option2}
                    onChange={(e) => handleVariantChange(index, 'option2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Red, Blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Option 3
                  </label>
                  <input
                    type="text"
                    value={variant.option3}
                    onChange={(e) => handleVariantChange(index, 'option3', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
