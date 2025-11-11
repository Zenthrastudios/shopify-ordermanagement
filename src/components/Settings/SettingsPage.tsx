import { useState, useEffect } from 'react';
import { Store, Key, RefreshCw, Check, AlertCircle, Upload, FileText, Building2, Webhook, Copy, Truck, Plus, Edit2, Trash2, Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { createShopifyService } from '../../services/shopifyService';
import { csvImportService } from '../../services/csvImportService';
import { storeSettingsService, type StoreSettings } from '../../services/storeSettingsService';
import type { ShopifyStore } from '../../types';

interface TrackingPartner {
  id: string;
  name: string;
  tracking_url_template: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

export default function SettingsPage() {
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savingStoreSettings, setSavingStoreSettings] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[]; updated?: number; skipped?: number } | null>(null);
  const [trackingPartners, setTrackingPartners] = useState<TrackingPartner[]>([]);
  const [editingPartner, setEditingPartner] = useState<TrackingPartner | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  const [formData, setFormData] = useState({
    store_name: '',
    shop_domain: '',
    access_token: '',
  });

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: 'Zenthra',
    storeAddress: {
      line1: 'Ground floor, 26H8+3C5, 1st Cross St',
      line2: 'Ragavan Colony, Karpaga Vinayaka Nagar',
      city: 'Ashok Nagar, Chennai',
      state: 'Tamil Nadu',
      zip: '600083',
      country: 'India',
    },
    logoUrl: 'https://admin.shopify.com/store/nvhu9m-0r/content/files/31850306011293',
    contactEmail: 'contact@zenthra.com',
    contactPhone: '+91 1234567890',
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const webhooks = [
    {
      topic: 'orders/create',
      url: `${webhookUrl}/shopify-webhook-orders-create`,
      description: 'Triggered when a new order is created',
    },
    {
      topic: 'orders/updated',
      url: `${webhookUrl}/shopify-webhook-orders-update`,
      description: 'Triggered when an order is updated',
    },
    {
      topic: 'orders/cancelled',
      url: `${webhookUrl}/shopify-webhook-orders-cancelled`,
      description: 'Triggered when an order is cancelled',
    },
    {
      topic: 'orders/paid',
      url: `${webhookUrl}/shopify-webhook-orders-paid`,
      description: 'Triggered when an order is paid',
    },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const loadTrackingPartners = async (forceRefresh = false) => {
    try {
      console.log('Loading tracking partners at:', new Date().toISOString(), 'forceRefresh:', forceRefresh);

      if (forceRefresh) {
        setTrackingPartners([]);
      }

      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tracking-partners`;
      const resp = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'list' }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Failed to load tracking partners: ${err}`);
      }

      const json = await resp.json();
      const data = json?.data || [];
      console.log('Loaded tracking partners from Edge:', data);
      setTrackingPartners(data);
      return data;
    } catch (error) {
      console.error('Error loading tracking partners:', error);
      return [];
    }
  };

  const handleSavePartner = async (partner: Partial<TrackingPartner>) => {
    try {
      console.log('Saving partner:', partner);
      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tracking-partners`;
      const resp = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'save', payload: partner }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Failed to save partner: ${err}`);
      }

      setShowPartnerForm(false);
      setEditingPartner(null);

      // Force a complete refresh
      const freshData = await loadTrackingPartners(true);
      console.log('Fresh data after save:', freshData);

      alert('Tracking partner saved successfully!');
    } catch (error) {
      console.error('Error saving tracking partner:', error);
      alert(`Failed to save tracking partner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm('Delete this tracking partner?')) return;

    try {
      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tracking-partners`;
      const resp = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'delete', payload: { id } }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Failed to delete partner: ${err}`);
      }
      await loadTrackingPartners(true);
      alert('Tracking partner deleted successfully!');
    } catch (error) {
      console.error('Error deleting tracking partner:', error);
      alert('Failed to delete tracking partner');
    }
  };

  const handleToggleDefault = async (id: string) => {
    try {
      console.log('Setting default for partner ID:', id);
      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tracking-partners`;
      const resp = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'setDefault', payload: { id } }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Failed to set default: ${err}`);
      }

      // Reload the list to reflect changes
      const freshData = await loadTrackingPartners(true);
      console.log('Updated tracking partners list:', freshData);
      alert('Default tracking partner updated successfully!');
    } catch (error) {
      console.error('Error updating default partner:', error);
      alert(`Failed to update default partner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    loadStores();
    loadStoreSettings();
    loadTrackingPartners();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);

      if (data && data.length > 0) {
        const activeStore = data.find(s => s.is_active) || data[0];
        setFormData({
          store_name: activeStore.store_name,
          shop_domain: activeStore.shop_domain,
          access_token: activeStore.access_token || '',
        });
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreSettings = async () => {
    try {
      const settings = await storeSettingsService.getSettings();
      setStoreSettings(settings);
    } catch (error) {
      console.error('Error loading store settings:', error);
    }
  };

  const handleSaveStoreSettings = async () => {
    setSavingStoreSettings(true);
    try {
      await storeSettingsService.updateSettings(storeSettings);
      alert('Store settings saved successfully!');
    } catch (error) {
      console.error('Error saving store settings:', error);
      alert('Failed to save store settings');
    } finally {
      setSavingStoreSettings(false);
    }
  };

  const handleSave = async () => {
    if (!formData.store_name || !formData.shop_domain || !formData.access_token) {
      alert('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const { data: existingStore } = await supabase
        .from('shopify_stores')
        .select('id')
        .eq('shop_domain', formData.shop_domain)
        .maybeSingle();

      if (existingStore) {
        await supabase
          .from('shopify_stores')
          .update({
            store_name: formData.store_name,
            access_token: formData.access_token,
            is_active: true,
          })
          .eq('id', existingStore.id);
      } else {
        await supabase
          .from('shopify_stores')
          .update({ is_active: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        await supabase.from('shopify_stores').insert({
          store_name: formData.store_name,
          shop_domain: formData.shop_domain,
          access_token: formData.access_token,
          is_active: true,
        });
      }

      alert('Store configuration saved successfully!');
      loadStores();
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Failed to save store configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncOrders = async () => {
    setSyncing(true);
    try {
      const shopifyService = await createShopifyService();
      const { data: activeStore } = await supabase
        .from('shopify_stores')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!activeStore) {
        alert('No active store found');
        return;
      }

      await shopifyService.syncOrdersToDatabase(activeStore.id);
      alert('Orders synced successfully!');
    } catch (error) {
      console.error('Error syncing orders:', error);
      alert('Failed to sync orders. Please check your API credentials.');
    } finally {
      setSyncing(false);
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Get or create default store
      let storeId: string;
      const { data: activeStore } = await supabase
        .from('shopify_stores')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (activeStore) {
        storeId = activeStore.id;
      } else {
        // Create a default store for CSV imports
        const { data: newStore } = await supabase
          .from('shopify_stores')
          .insert({
            store_name: 'CSV Import Store',
            shop_domain: 'csv-import',
            is_active: true,
          })
          .select()
          .single();
        storeId = newStore!.id;
      }

      const csvContent = await file.text();
      const result = await csvImportService.importOrders(csvContent, storeId);
      setImportResult(result);

      const messages = [];
      if (result.success > 0) messages.push(`${result.success} new orders imported`);
      if (result.updated && result.updated > 0) messages.push(`${result.updated} orders updated`);
      if (result.failed > 0) messages.push(`${result.failed} failed`);

      if (result.success > 0 || (result.updated && result.updated > 0)) {
        alert(`Import completed: ${messages.join(', ')}`);
      } else {
        alert('Failed to import any orders. Please check the CSV format.');
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Failed to import CSV file. Please check the file format.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your Shopify store connection
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Shopify Connection</h2>
            <p className="text-sm text-gray-500">
              Connect your Shopify store to sync orders
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Name
            </label>
            <input
              type="text"
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              placeholder="My Shopify Store"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shop Domain
            </label>
            <input
              type="text"
              value={formData.shop_domain}
              onChange={(e) => setFormData({ ...formData, shop_domain: e.target.value })}
              placeholder="your-store.myshopify.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your Shopify admin domain (e.g., your-store.myshopify.com)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                placeholder="shpat_..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your Shopify Admin API access token
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={handleSyncOrders}
              disabled={syncing || !stores.some(s => s.is_active)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Orders Now'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How to get your Shopify API credentials:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Go to your Shopify Admin dashboard</li>
              <li>Navigate to Settings → Apps and sales channels</li>
              <li>Click "Develop apps" and create a new app</li>
              <li>Configure Admin API access scopes (read_orders, write_fulfillments, etc.)</li>
              <li>Install the app and copy the Admin API access token</li>
              <li>Paste your credentials above and click Save</li>
            </ol>
          </div>
        </div>
      </div>

      {/* CSV Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Orders from CSV</h2>
            <p className="text-sm text-gray-500">
              Upload a CSV file exported from Shopify or other e-commerce platform
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={importing}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className={`w-8 h-8 text-gray-400 ${importing ? 'animate-bounce' : ''}`} />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {importing ? 'Importing...' : 'Click to upload CSV file'}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Supports Shopify export format
                </p>
              </div>
            </label>
          </div>

          {importResult && (
            <div className={`p-4 rounded-lg ${importResult.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-start gap-3">
                {importResult.failed > 0 ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className={`font-semibold ${importResult.failed > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                    Import completed
                  </p>
                  <div className={importResult.failed > 0 ? 'text-yellow-700' : 'text-green-700'}>
                    <p>
                      {importResult.success > 0 && `${importResult.success} new orders imported`}
                      {importResult.success > 0 && importResult.updated && importResult.updated > 0 && ', '}
                      {importResult.updated && importResult.updated > 0 && `${importResult.updated} orders updated`}
                      {importResult.failed > 0 && `, ${importResult.failed} orders failed`}
                    </p>
                  </div>
                  {importResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-yellow-700 hover:text-yellow-800">
                        View errors ({importResult.errors.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-yellow-600">
                        {importResult.errors.slice(0, 10).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>... and {importResult.errors.length - 10} more</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Store Settings Section */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Store Information</h2>
            <p className="text-sm text-gray-500">
              Configure your store details for shipping slips and invoices
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Name
              </label>
              <input
                type="text"
                value={storeSettings.storeName}
                onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="text"
                value={storeSettings.logoUrl}
                onChange={(e) => setStoreSettings({ ...storeSettings, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 1
            </label>
            <input
              type="text"
              value={storeSettings.storeAddress.line1}
              onChange={(e) => setStoreSettings({
                ...storeSettings,
                storeAddress: { ...storeSettings.storeAddress, line1: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={storeSettings.storeAddress.line2 || ''}
              onChange={(e) => setStoreSettings({
                ...storeSettings,
                storeAddress: { ...storeSettings.storeAddress, line2: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={storeSettings.storeAddress.city}
                onChange={(e) => setStoreSettings({
                  ...storeSettings,
                  storeAddress: { ...storeSettings.storeAddress, city: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={storeSettings.storeAddress.state}
                onChange={(e) => setStoreSettings({
                  ...storeSettings,
                  storeAddress: { ...storeSettings.storeAddress, state: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={storeSettings.storeAddress.zip}
                onChange={(e) => setStoreSettings({
                  ...storeSettings,
                  storeAddress: { ...storeSettings.storeAddress, zip: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              value={storeSettings.storeAddress.country}
              onChange={(e) => setStoreSettings({
                ...storeSettings,
                storeAddress: { ...storeSettings.storeAddress, country: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={storeSettings.contactEmail}
                onChange={(e) => setStoreSettings({ ...storeSettings, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={storeSettings.contactPhone}
                onChange={(e) => setStoreSettings({ ...storeSettings, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSaveStoreSettings}
              disabled={savingStoreSettings}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {savingStoreSettings ? 'Saving...' : 'Save Store Settings'}
            </button>
          </div>
        </div>
      </div>

      {stores.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Connected Stores</h3>
          <div className="space-y-3">
            {stores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">{store.store_name}</div>
                  <div className="text-sm text-gray-500">{store.shop_domain}</div>
                </div>
                {store.is_active && (
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tracking Partners</h2>
              <p className="text-sm text-gray-500">
                Manage courier tracking links and set default carrier
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingPartner({ id: '', name: '', tracking_url_template: '', is_active: true, is_default: false, display_order: 0 });
              setShowPartnerForm(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Partner
          </button>
        </div>

        {showPartnerForm && editingPartner && !editingPartner.id && (
          <div className="mb-6 p-6 bg-white rounded-lg border-2 border-green-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">
                New Tracking Partner
              </h3>
              <button
                onClick={() => {
                  setShowPartnerForm(false);
                  setEditingPartner(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carrier Name
                </label>
                <input
                  type="text"
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                  placeholder="e.g., Delhivery, Blue Dart"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking URL Template
                </label>
                <input
                  type="text"
                  value={editingPartner.tracking_url_template}
                  onChange={(e) => setEditingPartner({ ...editingPartner, tracking_url_template: e.target.value })}
                  placeholder="https://example.com/track/{tracking_number}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{tracking_number}'} as placeholder for the tracking number
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingPartner.is_active}
                    onChange={(e) => setEditingPartner({ ...editingPartner, is_active: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingPartner.is_default}
                    onChange={(e) => setEditingPartner({ ...editingPartner, is_default: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Set as Default</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPartnerForm(false);
                    setEditingPartner(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSavePartner(editingPartner)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Add Partner
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {trackingPartners.map((partner) => (
            <div key={partner.id}>
              {editingPartner?.id === partner.id && showPartnerForm ? (
                <div className="p-6 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      Edit {partner.name}
                    </h3>
                    <button
                      onClick={() => {
                        setShowPartnerForm(false);
                        setEditingPartner(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Carrier Name
                      </label>
                      <input
                        type="text"
                        value={editingPartner.name}
                        onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                        placeholder="e.g., Delhivery, Blue Dart"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tracking URL Template
                      </label>
                      <input
                        type="text"
                        value={editingPartner.tracking_url_template}
                        onChange={(e) => setEditingPartner({ ...editingPartner, tracking_url_template: e.target.value })}
                        placeholder="https://example.com/track/{tracking_number}"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use {'{tracking_number}'} as placeholder for the tracking number
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingPartner.is_active}
                          onChange={(e) => setEditingPartner({ ...editingPartner, is_active: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingPartner.is_default}
                          onChange={(e) => setEditingPartner({ ...editingPartner, is_default: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Set as Default</span>
                      </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowPartnerForm(false);
                          setEditingPartner(null);
                        }}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSavePartner(editingPartner)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{partner.name}</span>
                      {partner.is_default && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Default
                        </span>
                      )}
                      {!partner.is_active && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 font-mono">{partner.tracking_url_template}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!partner.is_default && partner.is_active && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDefault(partner.id);
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPartner(partner);
                        setShowPartnerForm(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePartner(partner.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {trackingPartners.length === 0 && !showPartnerForm && (
          <div className="text-center py-8 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No tracking partners configured yet.</p>
            <p className="text-xs mt-1">Click "Add Partner" to add your first tracking partner.</p>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-2 text-sm text-blue-800">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-medium">About Tracking Partners:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 mt-1">
                <li>Use {'{tracking_number}'} in the URL template as a placeholder</li>
                <li>The default partner will be pre-selected when adding tracking</li>
                <li>Inactive partners won't appear in tracking dropdowns</li>
                <li>Common carriers are pre-configured for your convenience</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Webhook className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Shopify Webhooks</h2>
            <p className="text-sm text-gray-500">
              Configure webhooks in Shopify to automatically sync orders
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">How to configure webhooks in Shopify:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Go to your Shopify Admin dashboard</li>
                <li>Navigate to Settings → Notifications → Webhooks</li>
                <li>Click "Create webhook" for each event below</li>
                <li>Select the Event (e.g., Order creation)</li>
                <li>Set Format to "JSON"</li>
                <li>Copy the webhook URL from below and paste it</li>
                <li>Set API version to "2024-10 (Latest)"</li>
                <li>Click "Save webhook"</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {webhooks.map((webhook, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">
                    {webhook.topic}
                  </div>
                  <p className="text-sm text-gray-500">{webhook.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhook.url}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-700"
                />
                <button
                  onClick={() => copyToClipboard(webhook.url)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li>Webhooks are public endpoints and don't require authentication</li>
                <li>Orders will be automatically synced when these events occur in Shopify</li>
                <li>You can test webhooks using the "Send test notification" button in Shopify</li>
                <li>Make sure your Shopify app has the necessary permissions for webhooks</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
