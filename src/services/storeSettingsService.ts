import { supabase } from '../lib/supabase';

export interface StoreSettings {
  storeName: string;
  storeAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
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
};

export const storeSettingsService = {
  async getSettings(): Promise<StoreSettings> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'store_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        return { ...DEFAULT_SETTINGS, ...data.setting_value };
      }

      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading store settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(settings: StoreSettings): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'store_settings')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('system_settings')
          .update({
            setting_value: settings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('system_settings')
          .insert({
            setting_key: 'store_settings',
            setting_value: settings,
          });
      }
    } catch (error) {
      console.error('Error updating store settings:', error);
      throw error;
    }
  },
};
