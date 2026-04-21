'use client'

/**
 * Printable Report Template - Optimized for Long Bond Paper (8.5" x 13")
 * Clean, professional layout for physical printing
 */

export default function PrintableReportTemplate({ 
  title = "Report Title",
  subtitle = "",
  dateRange = "",
  generatedDate = "",
  headers = [],
  data = [],
  summary = [],
  showSignatures = true,
  itemizedData = [],
  itemizedHeaders = []
}) {
  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: 8.5in 13in; /* Long Bond Paper */
            margin: 0.5in;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print-report {
            font-family: Arial, "Helvetica Neue", sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
            background: #fff !important;
            width: 100%;
            max-width: 100%;
          }
          
          /* Hide all UI elements when printing */
          .no-print,
          button,
          nav,
          .sidebar,
          .floating-action,
          .toast-container,
          .modal-backdrop,
          [class*="modal"],
          [class*="Modal"] {
            display: none !important;
          }
          
          /* Paper container - no padding when printing */
          .paper-container {
            width: 7.5in !important;
            max-width: 7.5in !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          
          /* Table wrapper to control page breaks */
          .table-wrapper {
            page-break-inside: auto;
          }
          
          /* CRITICAL: Prevent table rows from breaking */
          table {
            border-collapse: collapse;
            width: 100%;
            page-break-inside: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tbody {
            display: table-row-group;
          }
          
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto;
          }
          
          th, td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            vertical-align: top;
          }
          
          /* Keep header on each page */
          thead tr {
            page-break-after: avoid !important;
          }
          
          /* Keep sections together */
          header, .summary-section, .signature-section, .audit-notes {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Ensure signatures stay together and appear at bottom */
          .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 40px;
          }
          
          /* Page break before itemized section */
          .page-break-before {
            page-break-before: always;
          }
          
          /* Itemized section styling */
          .itemized-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Summary section on each page */
          .summary-section {
            page-break-inside: avoid !important;
            page-break-before: auto;
          }
          
          /* Prevent audit notes from breaking */
          .audit-notes {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 20px;
          }
          
          /* Remove max-height constraints */
          .print-report, .paper-container {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Ensure proper table borders print */
          table, th, td {
            border: 1px solid #000 !important;
          }
          
          /* CRITICAL: Prevent any element from being fixed/sticky when printing */
          .print-report * {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
          }
          
          /* Prevent duplicate rendering */
          .print-report::before,
          .print-report::after {
            display: none !important;
          }
          
          /* Fix for Chrome/WebKit */
          @supports (-webkit-appearance: none) {
            tr {
              -webkit-break-inside: avoid;
            }
          }
          
          /* Ensure single instance of content */
          .print-content {
            page-break-before: auto;
            page-break-after: auto;
          }
        }
        
        /* Screen styles */
        @media screen {
          .paper-container {
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            border-radius: 8px;
          }
        }
      `}</style>

      {/* Report Content */}
      <div className="print-report bg-white">
        <div className="paper-container mx-auto p-6">
          
          {/* Header Section - HNU Official Letterhead */}
          <header className="mb-4 pb-3 border-b-2 border-black">
            {/* Top Row: Logo and University Header */}
            <div className="flex items-start gap-4 mb-3">
              {/* HNU Logo */}
              <div className="shrink-0">
                <img 
                  src="/images/hnu-logo.png" 
                  alt="HNU Logo" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="w-16 h-16 border-2 border-gray-400 flex items-center justify-center bg-gray-100 hidden">
                  <span className="text-xs text-gray-500">HNU</span>
                </div>
              </div>
              
              {/* University Name and Core Values */}
              <div className="flex-1 pt-1">
                <h1 className="text-xl font-bold uppercase tracking-wide text-green-700 mb-1">
                  Holy Name University
                </h1>
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">
                  INTEGRITY • SOCIAL RESPONSIBILITY • EXCELLENCE • EVANGELIZATION • SERVANT LEADERSHIP
                </p>
                <p className="text-[9px] text-gray-500">
                  Corner Dagohoy and Gallares Streets, Tagbilaran City 6300, Bohol, Philippines
                </p>
                <p className="text-[9px] text-gray-500">
                  +63 (38) 501-0742 | (38) 501-0742 | +63 917 631 3333 | info@hnu.edu.ph | www.hnu.edu.ph
                </p>
              </div>
            </div>
            
            {/* Report Title */}
            <h2 className="text-lg font-bold uppercase text-center border-t border-b border-black py-2 my-3">
              {title}
            </h2>
            
            {subtitle && (
              <p className="text-sm text-gray-700 mb-2 text-center">{subtitle}</p>
            )}
            
            {/* Date Information */}
            <div className="text-xs text-gray-600 text-center">
              {dateRange && <p><strong>Period:</strong> {dateRange}</p>}
              {generatedDate && <p><strong>Generated:</strong> {generatedDate}</p>}
            </div>
          </header>

          {/* Summary Cards (if provided) */}
          {summary.length > 0 && (
            <div className="summary-section grid grid-cols-4 gap-2 mb-4">
              {summary.map((item, idx) => (
                <div key={idx} className="border border-gray-400 p-2 text-center">
                  <p className="text-xs text-gray-600 uppercase">{item.label}</p>
                  <p className="text-base font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Main Data Table */}
          <main className="table-wrapper mb-6">
            <table className="w-full border-collapse border border-gray-800">
              <thead>
                <tr className="bg-gray-200">
                  {headers.map((header, idx) => (
                    <th 
                      key={idx}
                      className="border border-gray-800 p-2 text-left text-xs font-bold uppercase"
                      style={{ width: header.width || 'auto' }}
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={headers.length} 
                      className="border border-gray-800 p-4 text-center text-gray-500"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  data.map((row, rowIdx) => (
                    <tr 
                      key={rowIdx}
                      className={rowIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                    >
                      {headers.map((header, colIdx) => (
                        <td 
                          key={colIdx}
                          className="border border-gray-800 p-2 text-sm"
                          style={{ 
                            textAlign: header.align || 'left',
                            fontWeight: header.bold ? 'bold' : 'normal'
                          }}
                        >
                          {row[header.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-200 font-bold">
                    <td colSpan={headers.length} className="border border-gray-800 p-2 text-xs">
                      Total Records: {data.length}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </main>

          {/* Footer / Signatures */}
          {showSignatures && (
            <footer className="signature-section mt-6 pt-4">
              <div className="grid grid-cols-2 gap-16">
                <div className="text-center">
                  <div className="border-t border-black pt-2 mt-12">
                    <p className="font-bold text-sm">Prepared By:</p>
                    <p className="text-xs text-gray-600 mt-1">(Name & Signature)</p>
                    <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-black pt-2 mt-12">
                    <p className="font-bold text-sm">Approved By:</p>
                    <p className="text-xs text-gray-600 mt-1">(Supervisor / Manager)</p>
                    <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
                  </div>
                </div>
              </div>
            </footer>
          )}

          {/* Itemized Sales Section (if provided) */}
          {itemizedData.length > 0 && itemizedHeaders.length > 0 && (
            <div className="itemized-section mt-8 mb-6 page-break-before">
              <h3 className="font-bold text-sm uppercase border-b-2 border-black pb-1 mb-3">Itemized Sales Detail</h3>
              <table className="w-full border-collapse border border-gray-800 text-xs">
                <thead>
                  <tr className="bg-gray-200">
                    {itemizedHeaders.map((header, idx) => (
                      <th 
                        key={idx}
                        className="border border-gray-800 p-1.5 text-left font-bold uppercase"
                        style={{ width: header.width || 'auto' }}
                      >
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itemizedData.map((row, rowIdx) => (
                    <tr 
                      key={rowIdx}
                      className={rowIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                    >
                      {itemizedHeaders.map((header, colIdx) => (
                        <td 
                          key={colIdx}
                          className="border border-gray-800 p-1.5"
                          style={{ 
                            textAlign: header.align || 'left',
                            fontWeight: header.bold ? 'bold' : 'normal'
                          }}
                        >
                          {row[header.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Notes Section */}
          <div className="audit-notes mt-6 p-3 border border-gray-400 bg-gray-50">
            <p className="text-xs font-bold uppercase mb-1">Audit Notes:</p>
            <div className="h-12 border border-gray-300 bg-white"></div>
          </div>

        </div>
      </div>

      {/* Print Button (visible only on screen) */}
      <div className="no-print fixed bottom-6 right-6 flex gap-2">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Report
        </button>
      </div>
    </>
  )
}

/**
 * Example usage:
 * 
 * <PrintableReportTemplate
 *   title="Daily Sales Report"
 *   subtitle="For audit verification of completeness assertion"
 *   dateRange="January 1, 2024 - January 31, 2024"
 *   generatedDate="February 1, 2024, 9:00 AM"
 *   headers={[
 *     { label: 'Date', key: 'date', width: '15%' },
 *     { label: 'OR Number', key: 'orNumber', width: '15%' },
 *     { label: 'Description', key: 'description', width: '40%' },
 *     { label: 'Amount', key: 'amount', width: '15%', align: 'right', bold: true },
 *     { label: 'Status', key: 'status', width: '15%' }
 *   ]}
 *   data={[
 *     { date: '2024-01-01', orNumber: 'OR-001', description: 'Textbook Purchase', amount: '₱1,250.00', status: 'Completed' },
 *     { date: '2024-01-01', orNumber: 'OR-002', description: 'Uniform Set', amount: '₱850.00', status: 'Completed' }
 *   ]}
 *   summary={[
 *     { label: 'Total Sales', value: '₱25,000.00' },
 *     { label: 'Transactions', value: '150' },
 *     { label: 'ORs Issued', value: '150' },
 *     { label: 'Pending', value: '0' }
 *   ]}
 * />
 */
