import { supabase } from '../lib/supabase';

interface CSVRow {
  [key: string]: string;
}

interface ParsedOrder {
  orderNumber: string;
  email: string;
  customerName: string;
  financialStatus: string;
  fulfillmentStatus: string;
  currency: string;
  subtotal: number;
  shipping: number;
  taxes: number;
  total: number;
  shippingMethod: string;
  createdAt: string;
  billingName: string;
  billingAddress: {
    address1: string;
    address2: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    phone: string;
  };
  shippingName: string;
  shippingAddress: {
    address1: string;
    address2: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    phone: string;
  };
  phone: string;
  paymentMethod: string;
  paymentReference: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    price: number;
    sku: string;
    fulfillmentStatus: string;
  }>;
}

export class CSVImportService {
  parseCSV(csvContent: string): CSVRow[] {
    const lines = csvContent.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    const headerLine = lines[0].trim();
    const headers = this.parseCSVLine(headerLine).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows: CSVRow[] = [];

    console.log('CSV Headers:', headers);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);

      if (values.length !== headers.length) {
        console.warn(`Row ${i} has ${values.length} values but expected ${headers.length}, skipping`);
        continue;
      }

      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index].replace(/^["']|["']$/g, '');
      });

      rows.push(row);
    }

    console.log(`Parsed ${rows.length} rows from CSV`);
    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  groupOrderRows(rows: CSVRow[]): Map<string, CSVRow[]> {
    const orderGroups = new Map<string, CSVRow[]>();

    if (rows.length === 0) {
      console.error('No rows to group');
      return orderGroups;
    }

    const firstRow = rows[0];
    const possibleOrderFields = ['Name', 'Order Number', 'Order ID', 'Order', 'Order Name'];
    let orderFieldName = '';

    for (const field of possibleOrderFields) {
      if (firstRow[field] !== undefined) {
        orderFieldName = field;
        break;
      }
    }

    if (!orderFieldName) {
      console.error('Available fields in CSV:', Object.keys(firstRow));
      throw new Error('Could not find order identifier field in CSV. Expected: Name, Order Number, Order ID, Order, or Order Name');
    }

    console.log(`Using "${orderFieldName}" as order identifier`);

    rows.forEach((row, index) => {
      const orderNumber = row[orderFieldName] || '';
      if (!orderNumber) {
        console.warn(`Row ${index + 2} has no order identifier`);
        return;
      }

      if (!orderGroups.has(orderNumber)) {
        orderGroups.set(orderNumber, []);
      }
      orderGroups.get(orderNumber)!.push(row);
    });

    console.log(`Grouped ${rows.length} rows into ${orderGroups.size} orders`);
    return orderGroups;
  }

  parseOrder(orderRows: CSVRow[]): ParsedOrder {
    const firstRow = orderRows[0];

    const getField = (row: CSVRow, ...possibleNames: string[]): string => {
      for (const name of possibleNames) {
        if (row[name]) return row[name];
      }
      return '';
    };

    const orderNumber = getField(firstRow, 'Name', 'Order Number', 'Order ID', 'Order', 'Order Name').replace('#', '');

    if (!orderNumber) {
      console.error('Could not find order number. Available fields:', Object.keys(firstRow));
      throw new Error('Order number not found in CSV row');
    }

    const lineItems = orderRows.map(row => ({
      name: getField(row, 'Lineitem name', 'Product Name', 'Title', 'Item Name'),
      quantity: parseInt(getField(row, 'Lineitem quantity', 'Quantity', 'Qty') || '1'),
      price: parseFloat(getField(row, 'Lineitem price', 'Price', 'Unit Price') || '0'),
      sku: getField(row, 'Lineitem sku', 'SKU', 'Product SKU'),
      fulfillmentStatus: getField(row, 'Lineitem fulfillment status', 'Fulfillment Status') || 'unfulfilled'
    })).filter(item => item.name);

    const billingAddress = {
      address1: getField(firstRow, 'Billing Address1', 'Billing Street', 'Billing Address'),
      address2: getField(firstRow, 'Billing Address2'),
      city: getField(firstRow, 'Billing City'),
      zip: getField(firstRow, 'Billing Zip', 'Billing Postal Code', 'Billing Postcode').replace(/'/g, ''),
      province: getField(firstRow, 'Billing Province', 'Billing State', 'Billing Region'),
      country: getField(firstRow, 'Billing Country'),
      phone: getField(firstRow, 'Billing Phone')
    };

    const shippingAddress = {
      address1: getField(firstRow, 'Shipping Address1', 'Shipping Street', 'Shipping Address'),
      address2: getField(firstRow, 'Shipping Address2'),
      city: getField(firstRow, 'Shipping City'),
      zip: getField(firstRow, 'Shipping Zip', 'Shipping Postal Code', 'Shipping Postcode').replace(/'/g, ''),
      province: getField(firstRow, 'Shipping Province', 'Shipping State', 'Shipping Region'),
      country: getField(firstRow, 'Shipping Country'),
      phone: getField(firstRow, 'Shipping Phone')
    };

    return {
      orderNumber,
      email: getField(firstRow, 'Email', 'Customer Email'),
      customerName: getField(firstRow, 'Billing Name', 'Shipping Name', 'Customer Name') || 'Guest',
      financialStatus: (getField(firstRow, 'Financial Status', 'Payment Status') || 'pending').toLowerCase(),
      fulfillmentStatus: (getField(firstRow, 'Fulfillment Status', 'Shipping Status') || 'unfulfilled').toLowerCase(),
      currency: getField(firstRow, 'Currency') || 'INR',
      subtotal: parseFloat(getField(firstRow, 'Subtotal') || '0'),
      shipping: parseFloat(getField(firstRow, 'Shipping') || '0'),
      taxes: parseFloat(getField(firstRow, 'Taxes', 'Tax') || '0'),
      total: parseFloat(getField(firstRow, 'Total') || '0'),
      shippingMethod: getField(firstRow, 'Shipping Method'),
      createdAt: getField(firstRow, 'Created at', 'Order Date', 'Date') || new Date().toISOString(),
      billingName: getField(firstRow, 'Billing Name'),
      billingAddress,
      shippingName: getField(firstRow, 'Shipping Name'),
      shippingAddress,
      phone: getField(firstRow, 'Phone', 'Billing Phone', 'Shipping Phone'),
      paymentMethod: getField(firstRow, 'Payment Method'),
      paymentReference: getField(firstRow, 'Payment Reference'),
      lineItems
    };
  }

  async importOrders(csvContent: string, storeId: string): Promise<{ success: number; failed: number; errors: string[]; updated: number; skipped: number }> {
    console.log('Starting CSV import...');

    let rows: CSVRow[];
    try {
      rows = this.parseCSV(csvContent);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown parsing error';
      console.error('CSV parsing failed:', errorMsg);
      return { success: 0, failed: 0, errors: [errorMsg], updated: 0, skipped: 0 };
    }

    let orderGroups: Map<string, CSVRow[]>;
    try {
      orderGroups = this.groupOrderRows(rows);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown grouping error';
      console.error('Grouping orders failed:', errorMsg);
      return { success: 0, failed: 0, errors: [errorMsg], updated: 0, skipped: 0 };
    }

    const existingOrderNumbers = await this.getExistingOrderNumbers(storeId);
    console.log(`Found ${existingOrderNumbers.size} existing orders in database`);

    let successCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const [orderNumber, orderRows] of orderGroups.entries()) {
      try {
        console.log(`Processing order: ${orderNumber}`);
        const parsedOrder = this.parseOrder(orderRows);

        const isExisting = existingOrderNumbers.has(orderNumber) || existingOrderNumbers.has(String(parseInt(orderNumber) || 0));

        const result = await this.saveOrder(parsedOrder, storeId);

        if (result.isUpdate) {
          updatedCount++;
          console.log(`✓ Order ${orderNumber} updated successfully`);
        } else {
          successCount++;
          console.log(`✓ Order ${orderNumber} imported successfully`);
        }
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`✗ Order ${orderNumber} failed:`, errorMsg);
        errors.push(`Order ${orderNumber}: ${errorMsg}`);
      }
    }

    console.log(`Import completed: ${successCount} new, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed`);
    return { success: successCount, failed: failedCount, errors, updated: updatedCount, skipped: skippedCount };
  }

  private async getExistingOrderNumbers(storeId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('orders')
      .select('order_number, csv_order_id')
      .eq('store_id', storeId);

    if (error) {
      console.error('Error fetching existing orders:', error);
      return new Set();
    }

    const orderNumbers = new Set<string>();
    data?.forEach(order => {
      if (order.csv_order_id) orderNumbers.add(order.csv_order_id);
      if (order.order_number) orderNumbers.add(String(order.order_number));
    });

    return orderNumbers;
  }

  private async saveOrder(order: ParsedOrder, storeId: string): Promise<void> {
    const { data: existingOrders, error: checkError } = await supabase
      .from('orders')
      .select('id, csv_order_id, order_number')
      .eq('store_id', storeId)
      .or(`csv_order_id.eq.${order.orderNumber},order_number.eq.${parseInt(order.orderNumber) || 0}`);

    if (checkError) {
      throw new Error(`Database error checking existing order: ${checkError.message}`);
    }

    const existingOrder = existingOrders && existingOrders.length > 0 ? existingOrders[0] : null;

    if (existingOrder) {
      console.log(`Order ${order.orderNumber} already exists (ID: ${existingOrder.id}), updating...`);
    }

    const orderData = {
      store_id: storeId,
      csv_order_id: order.orderNumber,
      order_number: parseInt(order.orderNumber) || 0,
      email: order.email,
      customer_name: order.customerName,
      financial_status: order.financialStatus,
      fulfillment_status: order.fulfillmentStatus,
      total_price: order.total,
      subtotal_price: order.subtotal,
      total_tax: order.taxes,
      shipping_price: order.shipping,
      currency: order.currency,
      shipping_method: order.shippingMethod,
      phone: order.phone,
      payment_method: order.paymentMethod,
      payment_reference: order.paymentReference,
      billing_name: order.billingName,
      billing_address: order.billingAddress,
      shipping_name: order.shippingName,
      shipping_address: order.shippingAddress,
      order_data: {
        csv_import: true,
        imported_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        raw_order: order
      },
      created_at: order.createdAt,
      updated_at: new Date().toISOString()
    };

    let orderId: string;
    let isUpdate = false;

    if (existingOrder) {
      isUpdate = true;
      const { data, error } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', existingOrder.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update order: ${error.message}`);
      if (!data) throw new Error('No data returned after update');
      orderId = data.id;
    } else {
      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw new Error(`Failed to insert order: ${error.message}`);
      if (!data) throw new Error('No data returned after insert');
      orderId = data.id;
    }

    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      console.warn(`Failed to delete existing items: ${deleteError.message}`);
    }

    if (order.lineItems.length > 0) {
      const items = order.lineItems.map((item) => ({
        order_id: orderId,
        title: item.name,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku,
        fulfillment_status: item.fulfillmentStatus
      }));

      const { error: insertError } = await supabase.from('order_items').insert(items);

      if (insertError) {
        throw new Error(`Failed to insert line items: ${insertError.message}`);
      }
    }

    return { isUpdate };
  }
}

export const csvImportService = new CSVImportService();
