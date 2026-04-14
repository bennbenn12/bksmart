'use client'

export default function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        /* Hide non-essential elements */
        header, nav, .btn-ghost, .btn-primary, .btn-secondary,
        button, .no-print, footer {
          display: none !important;
        }

        /* Reset page margins */
        @page {
          margin: 0.5cm;
          size: auto;
        }

        body {
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Order slip specific styles */
        .order-slip {
          max-width: 100%;
          box-shadow: none;
          border: 2px solid #000;
        }

        .order-slip-header {
          background: #f0f0f0 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Table styles for print */
        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }

        th {
          background: #f5f5f5 !important;
          -webkit-print-color-adjust: exact;
        }

        /* QR code area */
        .qr-placeholder {
          border: 2px dashed #999;
          padding: 20px;
          text-align: center;
        }

        /* Barcode area */
        .barcode-area {
          border: 1px solid #000;
          padding: 10px;
          text-align: center;
          font-family: monospace;
          font-size: 24px;
          letter-spacing: 4px;
        }
      }

      /* Screen-only elements */
      @media screen {
        .print-only {
          display: none;
        }
      }
    `}</style>
  )
}
