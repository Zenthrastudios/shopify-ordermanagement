import { supabase } from '../lib/supabase';
import { startOfDay, endOfDay, subDays, differenceInDays, format, parseISO } from 'date-fns';

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

export interface GlobalKPIs {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProductsSold: number;
  grossProfit: number;
  averageOrderValue: number;
  averageItemsPerOrder: number;
  refundAmount: number;
  netRevenue: number;
  conversionRate: number;
  repeatCustomerRate: number;
  firstTimeCustomers: number;
  returningCustomers: number;
}

export interface CustomerSummary {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  activeCustomers: number;
  churnedCustomers: number;
}

export interface TopCustomer {
  email: string;
  name: string;
  totalSpent: number;
  totalOrders: number;
  lifetimeValue: number;
  lastPurchaseDate: string;
  firstPurchaseDate: string;
}

export interface RFMScore {
  customerEmail: string;
  customerName: string;
  recencyDays: number;
  recencyScore: number;
  frequencyCount: number;
  frequencyScore: number;
  monetaryValue: number;
  monetaryScore: number;
  rfmScore: string;
  rfmSegment: string;
  lastPurchaseDate: string;
  totalOrders: number;
  totalSpent: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  uniqueCustomers: number;
  repeatPurchaseCount: number;
  refundCount: number;
  refundAmount: number;
  avgPrice: number;
}

export interface OrderTrend {
  date: string;
  orders: number;
  revenue: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface CohortData {
  cohortMonth: string;
  customersCount: number;
  month0Revenue: number;
  month1Revenue: number;
  month2Revenue: number;
  month3Revenue: number;
  [key: string]: string | number;
}

export const analyticsService = {
  async getGlobalKPIs(dateRange: DateRangeFilter): Promise<GlobalKPIs> {
    const { startDate, endDate } = dateRange;

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_price, created_at, email, financial_status, fulfillment_status')
      .gte('created_at', startOfDay(startDate).toISOString())
      .lte('created_at', endOfDay(endDate).toISOString());

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('quantity, order_id')
      .in('order_id', orders?.map(o => o.id) || []);

    const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0) || 0;
    const totalOrders = orders?.length || 0;
    const uniqueCustomers = new Set(orders?.map(o => o.email)).size;
    const totalProductsSold = orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    const refundAmount = orders?.filter(o => o.financial_status === 'refunded')
      .reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0) || 0;

    const netRevenue = totalRevenue - refundAmount;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageItemsPerOrder = totalOrders > 0 ? totalProductsSold / totalOrders : 0;

    const customerOrderCounts = new Map<string, number>();
    orders?.forEach(order => {
      const count = customerOrderCounts.get(order.email) || 0;
      customerOrderCounts.set(order.email, count + 1);
    });

    const firstTimeCustomers = Array.from(customerOrderCounts.values()).filter(count => count === 1).length;
    const returningCustomers = uniqueCustomers - firstTimeCustomers;
    const repeatCustomerRate = uniqueCustomers > 0 ? (returningCustomers / uniqueCustomers) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      totalCustomers: uniqueCustomers,
      totalProductsSold,
      grossProfit: totalRevenue,
      averageOrderValue,
      averageItemsPerOrder,
      refundAmount,
      netRevenue,
      conversionRate: 0,
      repeatCustomerRate,
      firstTimeCustomers,
      returningCustomers,
    };
  },

  async getCustomerSummary(dateRange: DateRangeFilter, activeDays = 30, churnDays = 90): Promise<CustomerSummary> {
    const { startDate, endDate } = dateRange;
    const activeThreshold = subDays(new Date(), activeDays);
    const churnThreshold = subDays(new Date(), churnDays);

    const { data: allOrders } = await supabase
      .from('orders')
      .select('email, created_at')
      .order('created_at', { ascending: false });

    const customerFirstOrder = new Map<string, Date>();
    const customerLastOrder = new Map<string, Date>();

    allOrders?.forEach(order => {
      const email = order.email;
      const orderDate = parseISO(order.created_at);

      if (!customerFirstOrder.has(email) || orderDate < customerFirstOrder.get(email)!) {
        customerFirstOrder.set(email, orderDate);
      }
      if (!customerLastOrder.has(email) || orderDate > customerLastOrder.get(email)!) {
        customerLastOrder.set(email, orderDate);
      }
    });

    const totalCustomers = customerFirstOrder.size;
    const newCustomers = Array.from(customerFirstOrder.entries())
      .filter(([_, firstOrder]) => firstOrder >= startDate && firstOrder <= endDate).length;

    const activeCustomers = Array.from(customerLastOrder.entries())
      .filter(([_, lastOrder]) => lastOrder >= activeThreshold).length;

    const churnedCustomers = Array.from(customerLastOrder.entries())
      .filter(([_, lastOrder]) => lastOrder < churnThreshold).length;

    const returningCustomers = totalCustomers - newCustomers;

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      activeCustomers,
      churnedCustomers,
    };
  },

  async getTopCustomers(limit = 50): Promise<TopCustomer[]> {
    const { data: orders } = await supabase
      .from('orders')
      .select('email, customer_name, total_price, created_at')
      .order('created_at', { ascending: false });

    const customerData = new Map<string, {
      name: string;
      totalSpent: number;
      totalOrders: number;
      firstPurchase: Date;
      lastPurchase: Date;
    }>();

    orders?.forEach(order => {
      const email = order.email;
      const existing = customerData.get(email);
      const orderDate = parseISO(order.created_at);
      const amount = parseFloat(order.total_price || '0');

      if (!existing) {
        customerData.set(email, {
          name: order.customer_name || email,
          totalSpent: amount,
          totalOrders: 1,
          firstPurchase: orderDate,
          lastPurchase: orderDate,
        });
      } else {
        existing.totalSpent += amount;
        existing.totalOrders += 1;
        if (orderDate < existing.firstPurchase) existing.firstPurchase = orderDate;
        if (orderDate > existing.lastPurchase) existing.lastPurchase = orderDate;
      }
    });

    return Array.from(customerData.entries())
      .map(([email, data]) => ({
        email,
        name: data.name,
        totalSpent: data.totalSpent,
        totalOrders: data.totalOrders,
        lifetimeValue: data.totalSpent,
        lastPurchaseDate: format(data.lastPurchase, 'yyyy-MM-dd'),
        firstPurchaseDate: format(data.firstPurchase, 'yyyy-MM-dd'),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  },

  async calculateRFMScores(): Promise<RFMScore[]> {
    const { data: orders } = await supabase
      .from('orders')
      .select('email, customer_name, total_price, created_at')
      .order('created_at', { ascending: false });

    if (!orders || orders.length === 0) return [];

    const customerData = new Map<string, {
      name: string;
      lastPurchase: Date;
      orderCount: number;
      totalSpent: number;
    }>();

    orders.forEach(order => {
      const email = order.email;
      const existing = customerData.get(email);
      const orderDate = parseISO(order.created_at);
      const amount = parseFloat(order.total_price || '0');

      if (!existing) {
        customerData.set(email, {
          name: order.customer_name || email,
          lastPurchase: orderDate,
          orderCount: 1,
          totalSpent: amount,
        });
      } else {
        existing.orderCount += 1;
        existing.totalSpent += amount;
        if (orderDate > existing.lastPurchase) {
          existing.lastPurchase = orderDate;
        }
      }
    });

    const now = new Date();
    const rfmData = Array.from(customerData.entries()).map(([email, data]) => {
      const recencyDays = differenceInDays(now, data.lastPurchase);
      return {
        email,
        name: data.name,
        recencyDays,
        frequency: data.orderCount,
        monetary: data.totalSpent,
        lastPurchase: data.lastPurchase,
      };
    });

    const recencies = rfmData.map(d => d.recencyDays).sort((a, b) => a - b);
    const frequencies = rfmData.map(d => d.frequency).sort((a, b) => a - b);
    const monetaries = rfmData.map(d => d.monetary).sort((a, b) => a - b);

    const getQuintileScore = (value: number, sortedValues: number[], reverse = false) => {
      const quintileSize = Math.ceil(sortedValues.length / 5);
      const index = sortedValues.indexOf(value);
      const quintile = Math.floor(index / quintileSize) + 1;
      return reverse ? 6 - Math.min(quintile, 5) : Math.min(quintile, 5);
    };

    const getRFMSegment = (r: number, f: number, m: number): string => {
      const score = r + f + m;
      if (score >= 13) return 'Champions';
      if (score >= 10) return 'Loyal Customers';
      if (r >= 4 && f <= 2) return 'Promising';
      if (r <= 2 && f >= 3) return 'At Risk';
      if (r <= 2) return 'Hibernating';
      if (f === 1) return 'New Customers';
      return 'Need Attention';
    };

    const rfmScores: RFMScore[] = rfmData.map(data => {
      const recencyScore = getQuintileScore(data.recencyDays, recencies, true);
      const frequencyScore = getQuintileScore(data.frequency, frequencies);
      const monetaryScore = getQuintileScore(data.monetary, monetaries);
      const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;
      const rfmSegment = getRFMSegment(recencyScore, frequencyScore, monetaryScore);

      return {
        customerEmail: data.email,
        customerName: data.name,
        recencyDays: data.recencyDays,
        recencyScore,
        frequencyCount: data.frequency,
        frequencyScore,
        monetaryValue: data.monetary,
        monetaryScore,
        rfmScore,
        rfmSegment,
        lastPurchaseDate: format(data.lastPurchase, 'yyyy-MM-dd'),
        totalOrders: data.frequency,
        totalSpent: data.monetary,
      };
    });

    await supabase.from('customer_rfm_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const rfmRecords = rfmScores.map(score => ({
      customer_email: score.customerEmail,
      customer_name: score.customerName,
      recency_days: score.recencyDays,
      recency_score: score.recencyScore,
      frequency_count: score.frequencyCount,
      frequency_score: score.frequencyScore,
      monetary_value: score.monetaryValue,
      monetary_score: score.monetaryScore,
      rfm_score: score.rfmScore,
      rfm_segment: score.rfmSegment,
      last_purchase_date: score.lastPurchaseDate,
      total_orders: score.totalOrders,
      total_spent: score.totalSpent,
      first_purchase_date: score.lastPurchaseDate,
      avg_order_value: score.totalSpent / score.totalOrders,
    }));

    if (rfmRecords.length > 0) {
      await supabase.from('customer_rfm_scores').insert(rfmRecords);
    }

    return rfmScores;
  },

  async getRFMScores(): Promise<RFMScore[]> {
    const { data } = await supabase
      .from('customer_rfm_scores')
      .select('*')
      .order('monetary_value', { ascending: false });

    if (!data || data.length === 0) {
      return await this.calculateRFMScores();
    }

    return data.map(record => ({
      customerEmail: record.customer_email,
      customerName: record.customer_name || record.customer_email,
      recencyDays: record.recency_days,
      recencyScore: record.recency_score,
      frequencyCount: record.frequency_count,
      frequencyScore: record.frequency_score,
      monetaryValue: parseFloat(record.monetary_value),
      monetaryScore: record.monetary_score,
      rfmScore: record.rfm_score,
      rfmSegment: record.rfm_segment,
      lastPurchaseDate: record.last_purchase_date,
      totalOrders: record.total_orders,
      totalSpent: parseFloat(record.total_spent),
    }));
  },

  async getProductPerformance(dateRange: DateRangeFilter): Promise<ProductPerformance[]> {
    const { startDate, endDate } = dateRange;

    const { data: orders } = await supabase
      .from('orders')
      .select('id, financial_status')
      .gte('created_at', startOfDay(startDate).toISOString())
      .lte('created_at', endOfDay(endDate).toISOString());

    const orderIds = orders?.map(o => o.id) || [];

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    const productMap = new Map<string, {
      name: string;
      sku: string;
      unitsSold: number;
      revenue: number;
      customers: Set<string>;
      refundCount: number;
      refundAmount: number;
      prices: number[];
    }>();

    items?.forEach(item => {
      const productId = item.product_id || item.sku;
      const existing = productMap.get(productId);
      const price = parseFloat(item.price || '0');
      const revenue = price * item.quantity;

      const order = orders?.find(o => o.id === item.order_id);
      const isRefund = order?.financial_status === 'refunded';

      if (!existing) {
        productMap.set(productId, {
          name: item.title || 'Unknown Product',
          sku: item.sku,
          unitsSold: item.quantity,
          revenue,
          customers: new Set(),
          refundCount: isRefund ? 1 : 0,
          refundAmount: isRefund ? revenue : 0,
          prices: [price],
        });
      } else {
        existing.unitsSold += item.quantity;
        existing.revenue += revenue;
        existing.prices.push(price);
        if (isRefund) {
          existing.refundCount += 1;
          existing.refundAmount += revenue;
        }
      }
    });

    return Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      productName: data.name,
      sku: data.sku,
      unitsSold: data.unitsSold,
      revenue: data.revenue,
      uniqueCustomers: data.customers.size,
      repeatPurchaseCount: 0,
      refundCount: data.refundCount,
      refundAmount: data.refundAmount,
      avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
    })).sort((a, b) => b.revenue - a.revenue);
  },

  async getOrderTrends(dateRange: DateRangeFilter): Promise<OrderTrend[]> {
    const { startDate, endDate } = dateRange;

    const { data: orders } = await supabase
      .from('orders')
      .select('created_at, total_price, email')
      .gte('created_at', startOfDay(startDate).toISOString())
      .lte('created_at', endOfDay(endDate).toISOString())
      .order('created_at', { ascending: true });

    const customerFirstOrders = new Map<string, Date>();
    orders?.forEach(order => {
      const email = order.email;
      const date = parseISO(order.created_at);
      if (!customerFirstOrders.has(email) || date < customerFirstOrders.get(email)!) {
        customerFirstOrders.set(email, date);
      }
    });

    const dailyData = new Map<string, {
      orders: number;
      revenue: number;
      newCustomers: number;
      returningCustomers: number;
    }>();

    orders?.forEach(order => {
      const dateKey = format(parseISO(order.created_at), 'yyyy-MM-dd');
      const existing = dailyData.get(dateKey) || { orders: 0, revenue: 0, newCustomers: 0, returningCustomers: 0 };

      existing.orders += 1;
      existing.revenue += parseFloat(order.total_price || '0');

      const firstOrderDate = customerFirstOrders.get(order.email);
      const orderDate = parseISO(order.created_at);
      if (firstOrderDate && format(firstOrderDate, 'yyyy-MM-dd') === dateKey) {
        existing.newCustomers += 1;
      } else {
        existing.returningCustomers += 1;
      }

      dailyData.set(dateKey, existing);
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue,
        newCustomers: data.newCustomers,
        returningCustomers: data.returningCustomers,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};
