import { X, Printer } from 'lucide-react';
import type { OrderWithItems } from '../../types';
import InvoiceTemplate from './InvoiceTemplate';
import ShippingSlipTemplate from './ShippingSlipTemplate';

interface PrintPreviewProps {
  orders: OrderWithItems[];
  type: 'invoice' | 'shipping_slip';
  onClose: () => void;
}

export default function PrintPreview({ orders, type, onClose }: PrintPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 overflow-auto print-container max-w-full" id="print-preview-container">
      <div className="min-h-screen max-w-full overflow-x-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print z-10" id="print-controls">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Print Preview - {type === 'invoice' ? 'Invoices' : 'Shipping Slips'}
            </h2>
            <p className="text-sm text-gray-500">{orders.length} document(s)</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print All
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div id="printable-content">
          {orders.map((order, index) => (
            <div
              key={order.id}
              className={`print-item ${index < orders.length - 1 ? 'mb-8' : ''}`}
            >
              {type === 'invoice' ? (
                <InvoiceTemplate order={order} storeName="Your Store" />
              ) : (
                <ShippingSlipTemplate order={order} />
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media screen {
          #printable-content {
            padding: 2rem;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: white;
            width: 100%;
            height: 100%;
          }

          body * {
            visibility: hidden;
          }

          #print-preview-container,
          #print-preview-container * {
            visibility: visible;
          }

          #print-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            overflow: visible !important;
          }

          .no-print {
            display: none !important;
          }

          #printable-content {
            padding: 0 !important;
            margin: 0 !important;
            width: 100%;
          }

          .print-item {
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 0 !important;
            padding: 0 !important;
            width: 100%;
            height: auto;
            display: block;
          }

          .print-item:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
