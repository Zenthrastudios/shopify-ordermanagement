import { supabase } from '../lib/supabase';
import type { Order, OrderWithItems, OrderFilters, TrackingNumber } from '../types';

export async function fetchOrders(filters: OrderFilters = {}): Promise<OrderWithItems[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*),
      tracking:tracking_numbers(*)
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.search) {
    query = query.or(`order_number.eq.${filters.search},email.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
  }

  if (filters.financial_status) {
    query = query.eq('financial_status', filters.financial_status);
  }

  if (filters.fulfillment_status) {
    if (filters.fulfillment_status === 'null') {
      query = query.is('fulfillment_status', null);
    } else {
      query = query.eq('fulfillment_status', filters.fulfillment_status);
    }
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }

  return data as OrderWithItems[];
}

export async function fetchOrderById(orderId: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*),
      tracking:tracking_numbers(*)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching order:', error);
    throw error;
  }

  return data as OrderWithItems | null;
}

export async function addTrackingNumber(
  orderId: string,
  trackingNumber: string,
  trackingCompany: string
): Promise<TrackingNumber> {
  const trackingUrl = generateTrackingUrl(trackingCompany, trackingNumber);

  const { data, error } = await supabase
    .from('tracking_numbers')
    .insert({
      order_id: orderId,
      tracking_number: trackingNumber,
      tracking_company: trackingCompany,
      tracking_url: trackingUrl,
      shipment_status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding tracking number:', error);
    throw error;
  }

  return data;
}

export async function bulkAddTracking(
  orderIds: string[],
  trackingData: { tracking_number: string; tracking_company: string }[]
): Promise<void> {
  const { error: bulkOpError, data: bulkOp } = await supabase
    .from('bulk_operations')
    .insert({
      operation_type: 'track',
      order_ids: orderIds,
      status: 'processing',
      total_count: orderIds.length,
      processed_count: 0,
    })
    .select()
    .single();

  if (bulkOpError) throw bulkOpError;

  let processed = 0;
  const errors: string[] = [];

  for (let i = 0; i < orderIds.length; i++) {
    try {
      const tracking = trackingData[i] || trackingData[0];
      await addTrackingNumber(orderIds[i], tracking.tracking_number, tracking.tracking_company);
      processed++;

      await supabase
        .from('bulk_operations')
        .update({ processed_count: processed })
        .eq('id', bulkOp.id);
    } catch (error) {
      errors.push(`Order ${orderIds[i]}: ${error}`);
    }
  }

  await supabase
    .from('bulk_operations')
    .update({
      status: errors.length === 0 ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      error_message: errors.length > 0 ? errors.join('; ') : null,
    })
    .eq('id', bulkOp.id);
}

export async function updateOrderFulfillmentStatus(
  orderId: string,
  status: 'fulfilled' | 'partial' | 'unfulfilled'
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ fulfillment_status: status })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order fulfillment status:', error);
    throw error;
  }
}

export async function bulkUpdateFulfillmentStatus(
  orderIds: string[],
  status: 'fulfilled' | 'partial' | 'unfulfilled'
): Promise<void> {
  const { error: bulkOpError, data: bulkOp } = await supabase
    .from('bulk_operations')
    .insert({
      operation_type: 'fulfill',
      order_ids: orderIds,
      status: 'processing',
      total_count: orderIds.length,
      processed_count: 0,
    })
    .select()
    .single();

  if (bulkOpError) throw bulkOpError;

  const { error } = await supabase
    .from('orders')
    .update({ fulfillment_status: status })
    .in('id', orderIds);

  await supabase
    .from('bulk_operations')
    .update({
      status: error ? 'failed' : 'completed',
      processed_count: error ? 0 : orderIds.length,
      completed_at: new Date().toISOString(),
      error_message: error?.message || null,
    })
    .eq('id', bulkOp.id);

  if (error) {
    console.error('Error bulk updating fulfillment status:', error);
    throw error;
  }
}

function generateTrackingUrl(company: string, trackingNumber: string): string {
  const baseUrls: Record<string, string> = {
    fedex: 'https://www.fedex.com/fedextrack/?trknbr=',
    ups: 'https://www.ups.com/track?tracknum=',
    usps: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
    dhl: 'https://www.dhl.com/en/express/tracking.html?AWB=',
    'dhl express': 'https://www.dhl.com/en/express/tracking.html?AWB=',
  };

  const companyLower = company.toLowerCase();
  const baseUrl = baseUrls[companyLower] || baseUrls.fedex;
  return baseUrl + trackingNumber;
}

export async function getOrderStats() {
  const { data } = await supabase
    .from('order_stats')
    .select('*')
    .maybeSingle();

  if (!data) {
    return {
      totalOrders: 0,
      paidOrders: 0,
      fulfilledOrders: 0,
      unfulfilledOrders: 0,
      totalRevenue: 0,
    };
  }

  return {
    totalOrders: data.total_orders,
    paidOrders: data.paid_orders,
    fulfilledOrders: data.fulfilled_orders,
    unfulfilledOrders: data.unfulfilled_orders,
    totalRevenue: parseFloat(data.total_revenue),
  };
}
