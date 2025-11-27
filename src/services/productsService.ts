import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  shopify_product_id?: number;
  title: string;
  description?: string;
  vendor?: string;
  product_type?: string;
  tags: string[];
  status: 'active' | 'archived' | 'draft';
  handle?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  shopify_variant_id?: number;
  product_id: string;
  title: string;
  sku?: string;
  barcode?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  weight?: number;
  weight_unit: string;
  inventory_policy: 'deny' | 'continue';
  requires_shipping: boolean;
  taxable: boolean;
  position: number;
  option1?: string;
  option2?: string;
  option3?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  variant_id: string;
  location_id: string;
  available: number;
  committed: number;
  damaged: number;
  in_transit: number;
  reserved: number;
  reorder_point: number;
  reorder_quantity: number;
  last_counted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryLocation {
  id: string;
  shopify_location_id?: number;
  name: string;
  address: any;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryAdjustment {
  id: string;
  variant_id: string;
  location_id: string;
  adjustment_type: 'received' | 'sold' | 'damaged' | 'returned' | 'transfer' | 'correction' | 'adjustment';
  quantity_change: number;
  quantity_before?: number;
  quantity_after?: number;
  reason?: string;
  reference_order_id?: string;
  notes?: string;
  adjusted_by?: string;
  created_at: string;
}

export interface ProductWithDetails extends Product {
  variants: (ProductVariant & { inventory: InventoryItem[] })[];
  images: ProductImage[];
  total_inventory: number;
  available_to_sell: number;
}

export interface ProductImage {
  id: string;
  shopify_image_id?: number;
  product_id: string;
  variant_id?: string;
  image_url: string;
  alt_text?: string;
  position: number;
  width?: number;
  height?: number;
  created_at: string;
}

export interface ProductInventorySummary {
  product_id: string;
  product_title: string;
  product_status: string;
  variant_id: string;
  variant_title: string;
  sku: string;
  price: number;
  barcode: string;
  total_available: number;
  total_committed: number;
  total_damaged: number;
  total_in_transit: number;
  total_reserved: number;
  available_to_sell: number;
  reorder_point: number;
  location_count: number;
}

class ProductsService {
  async getProducts(filters?: {
    status?: string;
    product_type?: string;
    search?: string;
  }): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.product_type) {
      query = query.eq('product_type', filters.product_type);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,vendor.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getProductById(id: string): Promise<ProductWithDetails | null> {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!product) return null;

    const { data: variants } = await supabase
      .from('product_variants')
      .select('*, inventory_items(*)')
      .eq('product_id', id)
      .order('position');

    const { data: images } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('position');

    const variantsWithInventory = (variants || []).map(v => ({
      ...v,
      inventory: v.inventory_items || []
    }));

    const totalInventory = variantsWithInventory.reduce((sum, v) =>
      sum + v.inventory.reduce((s, i) => s + i.available, 0), 0
    );

    const availableToSell = variantsWithInventory.reduce((sum, v) =>
      sum + v.inventory.reduce((s, i) => s + (i.available - i.committed), 0), 0
    );

    return {
      ...product,
      variants: variantsWithInventory,
      images: images || [],
      total_inventory: totalInventory,
      available_to_sell: availableToSell
    };
  }

  async createProduct(productData: Partial<Product>, variants?: Partial<ProductVariant>[]): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        title: productData.title,
        description: productData.description,
        vendor: productData.vendor,
        product_type: productData.product_type,
        tags: productData.tags || [],
        status: productData.status || 'active',
        handle: productData.handle,
      })
      .select()
      .single();

    if (error) throw error;

    if (variants && variants.length > 0) {
      const variantInserts = variants.map((v, index) => ({
        ...v,
        product_id: product.id,
        position: v.position ?? index,
      }));

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantInserts);

      if (variantError) throw variantError;
    }

    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getInventorySummary(): Promise<ProductInventorySummary[]> {
    const { data, error } = await supabase
      .from('product_inventory_summary')
      .select('*')
      .order('product_title');

    if (error) throw error;
    return data || [];
  }

  async getLowStockItems(): Promise<ProductInventorySummary[]> {
    const { data, error } = await supabase
      .from('low_stock_items')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  async adjustInventory(
    variantId: string,
    locationId: string,
    adjustment: {
      adjustment_type: InventoryAdjustment['adjustment_type'];
      quantity_change: number;
      reason?: string;
      notes?: string;
    }
  ): Promise<void> {
    const { data: current } = await supabase
      .from('inventory_items')
      .select('available')
      .eq('variant_id', variantId)
      .eq('location_id', locationId)
      .maybeSingle();

    const quantityBefore = current?.available || 0;
    const quantityAfter = quantityBefore + adjustment.quantity_change;

    if (quantityAfter < 0) {
      throw new Error('Insufficient inventory');
    }

    await supabase
      .from('inventory_items')
      .upsert({
        variant_id: variantId,
        location_id: locationId,
        available: quantityAfter,
        updated_at: new Date().toISOString(),
      });

    await supabase
      .from('inventory_adjustments')
      .insert({
        variant_id: variantId,
        location_id: locationId,
        adjustment_type: adjustment.adjustment_type,
        quantity_change: adjustment.quantity_change,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        reason: adjustment.reason,
        notes: adjustment.notes,
      });
  }

  async getLocations(): Promise<InventoryLocation[]> {
    const { data, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async getInventoryAdjustments(variantId: string, limit = 50): Promise<InventoryAdjustment[]> {
    const { data, error } = await supabase
      .from('inventory_adjustments')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}

export const productsService = new ProductsService();
