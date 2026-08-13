import React, { useState, useEffect } from 'react';
import { Printer, Settings, Eye } from 'lucide-react';
import { productsAPI } from '../services/api';

interface Product {
  product_id: number;
  product_name: string;
  price: number;
}

const BarcodeGenerator: React.FC = () => {
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Form configurations
  const [mrp, setMrp] = useState('');
  const [mfgDate, setMfgDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [expDate, setExpDate] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [fssaiNo, setFssaiNo] = useState('12420026000550');
  const [printQty, setPrintQty] = useState(1);

  // Sticker Page & Layout configurations (TVS LP 46 Neo Defaults)
  const [pageWidthMm, setPageWidthMm] = useState(100);
  const [pageHeightMm, setPageHeightMm] = useState(25);
  const [columns, setColumns] = useState<number>(2);
  const [templateWidthMm, setTemplateWidthMm] = useState(48.7);
  const [templateHeightMm, setTemplateHeightMm] = useState(25.0);
  const [colGapMm, setColGapMm] = useState<number>(0);
  
  // Margins
  const [marginLeftMm, setMarginLeftMm] = useState(1.3);
  const [marginRightMm, setMarginRightMm] = useState(1.3);
  const [marginTopMm, setMarginTopMm] = useState(0.0);
  const [marginBottomMm, setMarginBottomMm] = useState(0.0);

  // Fonts
  const [fontSizePt, setFontSizePt] = useState(10);
  const [headerFontSizePt, setHeaderFontSizePt] = useState(11);

  // Print Orientation Settings (critical for TVS LP 46 Neo rotation issues)
  const [rotateLabelsDeg, setRotateLabelsDeg] = useState<number>(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getProducts({ page: 1, limit: 1000 });
      if (res && res.success && res.data && res.data.products) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProductId(e.target.value);
  };

  // Format date helper: YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();

      const labelInnerHtml = `
        <div class="header-box">Sri Devi Snacks</div>
        <div class="content-row">MRP: ${mrp}</div>
        <div class="content-row">Mfg. Date: ${formatDate(mfgDate)}</div>
        <div class="content-row">Exp. Date: ${formatDate(expDate)}</div>
        <div class="content-row">Batch No: ${batchNo}</div>
        <div class="content-row">FSSAI No: ${fssaiNo}</div>
      `;

      let allLabelsHtml = '';
      const totalRows = Math.ceil(printQty / columns);

      for (let r = 0; r < totalRows; r++) {
        allLabelsHtml += '<div class="label-row">';
        for (let c = 0; c < columns; c++) {
          const index = r * columns + c;
          if (index < printQty) {
            allLabelsHtml += `<div class="label"><div class="label-rotate-wrapper">${labelInnerHtml}</div></div>`;
          } else {
            allLabelsHtml += `<div class="label spacer" style="visibility: hidden; opacity: 0; border: none !important;"></div>`;
          }
        }
        allLabelsHtml += '</div>';
      }

      const styleHtml = `
        <html>
        <head>
          <style>
            @page {
              size: ${pageWidthMm}mm ${pageHeightMm}mm;
              margin: 0 !important;
            }
            @media print {
              html, body {
                width: ${pageWidthMm}mm;
                height: ${pageHeightMm}mm;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
              }
            }
            * {
              box-sizing: border-box !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              font-family: Arial, sans-serif;
              background-color: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              overflow: hidden !important;
            }
            .label-row {
              display: flex;
              width: 100%;
              height: calc(${pageHeightMm}mm - 0.5mm);
              padding-left: ${marginLeftMm}mm;
              padding-right: ${marginRightMm}mm;
              padding-top: ${marginTopMm}mm;
              padding-bottom: ${marginBottomMm}mm;
              page-break-after: always;
              box-sizing: border-box;
              overflow: hidden !important;
            }
            .label {
              width: ${templateWidthMm}mm;
              height: calc(${templateHeightMm}mm - 0.5mm);
              padding: 1.5mm 3mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              overflow: hidden !important;
            }
            .label-rotate-wrapper {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              ${rotateLabelsDeg !== 0 ? `transform: rotate(${rotateLabelsDeg}deg); transform-origin: center;` : ''}
            }
            .label-row .label:not(:last-child) {
              margin-right: ${colGapMm}mm;
            }
            .header-box {
              text-align: center;
              font-weight: bold;
              font-size: ${headerFontSizePt}pt;
              padding: 2px 4px;
              margin-bottom: 2px;
              color: #000;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .content-row {
              font-size: ${fontSizePt}pt;
              font-weight: bold;
              line-height: 1.25;
              color: #000;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          ${allLabelsHtml}
        </body>
        </html>
      `;

      doc.write(styleHtml);
      doc.close();

      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        } else {
          document.body.removeChild(iframe);
        }
      }, 500);
    } else {
      document.body.removeChild(iframe);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center">
            <Printer className="h-8 w-8 text-blue-600 mr-3" />
            Label Printer (லேபிள் பிரிண்டர்)
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Generate custom stickers for Sri Devi Snacks matching TVS LP 46 Neo / BarTender page setups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Panel: Settings Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Settings className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">Sticker Configurations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Select */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Reference Product (குறிப்பு பொருள்)
              </label>
              <select
                value={selectedProductId}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 font-medium"
              >
                <option value="">-- Choose Product (Optional) --</option>
                {products.map(p => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name}
                  </option>
                ))}
              </select>
            </div>

            {/* MRP Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                MRP Rate (விலை)
              </label>
              <input
                type="text"
                placeholder="e.g. 50"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-blue-600"
              />
            </div>

            {/* Batch Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Batch No (தொகுதி எண்)
              </label>
              <input
                type="text"
                placeholder="e.g. 1234"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              />
            </div>

            {/* Manufacturing Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Mfg. Date (தயாரிப்பு தேதி)
              </label>
              <input
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Exp. Date (காலாவதி தேதி)
              </label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              />
            </div>

            {/* FSSAI Number */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                FSSAI No (உரிம எண்)
              </label>
              <input
                type="text"
                value={fssaiNo}
                onChange={(e) => setFssaiNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              />
            </div>

            {/* Print Quantity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Print Quantity (எண்ணிக்கை)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={printQty}
                onChange={(e) => setPrintQty(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
              />
            </div>

            {/* Columns selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Sticker Columns (வரிசைகள்)
              </label>
              <select
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
              >
                <option value={1}>1 Column</option>
                <option value={2}>2 Columns (Side-by-side)</option>
                <option value={3}>3 Columns</option>
              </select>
            </div>
          </div>

          {/* Size Dimension Settings */}
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                Page Dimensions (தாள் அளவுகள்)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Page Width (mm)
                  </label>
                  <input
                    type="number"
                    value={pageWidthMm}
                    onChange={(e) => setPageWidthMm(parseFloat(e.target.value) || 100)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Page Height (mm)
                  </label>
                  <input
                    type="number"
                    value={pageHeightMm}
                    onChange={(e) => setPageHeightMm(parseFloat(e.target.value) || 25)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                Label Layout & Margins (லேபிள் மற்றும் விளிம்புகள்)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Label Width (mm)
                  </label>
                  <input
                    type="number"
                    value={templateWidthMm}
                    onChange={(e) => setTemplateWidthMm(parseFloat(e.target.value) || 48.7)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Label Height (mm)
                  </label>
                  <input
                    type="number"
                    value={templateHeightMm}
                    onChange={(e) => setTemplateHeightMm(parseFloat(e.target.value) || 25)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Left Margin (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={marginLeftMm}
                    onChange={(e) => setMarginLeftMm(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Right Margin (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={marginRightMm}
                    onChange={(e) => setMarginRightMm(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Col Gap (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={colGapMm}
                    onChange={(e) => setColGapMm(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Rotations & Directions configurations */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                Orientation Settings (பிரிண்ட் திசை அமைப்புகள்)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Rotate Labels (எழுத்தை சுழற்று)
                  </label>
                  <select
                    value={rotateLabelsDeg}
                    onChange={(e) => setRotateLabelsDeg(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white font-semibold"
                  >
                    <option value={0}>0° (சாதாரண நிலை)</option>
                    <option value={90}>90° (வலதுபுறம்)</option>
                    <option value={180}>180° (தலைகீழ்)</option>
                    <option value={270}>270° / -90° (இடதுபுறம்)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                Font Adjustment (எழுத்து அளவு)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Content Font (pt)
                  </label>
                  <input
                    type="number"
                    value={fontSizePt}
                    onChange={(e) => setFontSizePt(parseFloat(e.target.value) || 10)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Header Font (pt)
                  </label>
                  <input
                    type="number"
                    value={headerFontSizePt}
                    onChange={(e) => setHeaderFontSizePt(parseFloat(e.target.value) || 11)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Sticker Live Preview */}
        <div className="lg:col-span-5 flex flex-col justify-start">
          <div className="sticky top-6">
            <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
              <div className="flex items-center space-x-2 mb-4 w-full justify-start text-gray-700">
                <Eye className="h-5 w-5 text-gray-500" />
                <span className="font-bold text-sm tracking-wide uppercase">Live Sticker Preview</span>
                <span className="text-xs text-gray-400">({templateWidthMm}mm × {templateHeightMm}mm)</span>
              </div>

              {/* Physical Card rendering mimicking BarTender preview (strictly 1 sticker preview as requested) */}
              <div className="flex justify-center w-full">
                <div
                  className="bg-white rounded-lg shadow-md flex flex-col justify-start items-stretch border border-gray-300 p-4 transition-all overflow-hidden"
                  style={{
                    width: `${templateWidthMm * 6}px`, // Scaled for screen rendering
                    height: `${templateHeightMm * 6}px`,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: rotateLabelsDeg !== 0 ? `rotate(${rotateLabelsDeg}deg)` : 'none',
                      transformOrigin: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start'
                    }}
                  >
                    {/* Header Title Box */}
                    <div
                      className="text-center font-bold text-black overflow-hidden whitespace-nowrap mb-1"
                      style={{
                        fontSize: `${headerFontSizePt * 1.2}px`,
                        padding: '2px 4px'
                      }}
                    >
                      Sri Devi Snacks
                    </div>

                    {/* Info Rows */}
                    <div
                      className="flex flex-col justify-start font-bold text-black space-y-0.5"
                      style={{
                        fontSize: `${fontSizePt * 1.2}px`,
                        lineHeight: '1.25'
                      }}
                    >
                      <div className="whitespace-nowrap">MRP: {mrp || '50'}</div>
                      <div className="whitespace-nowrap">Mfg. Date: {formatDate(mfgDate) || '13-08-2026'}</div>
                      <div className="whitespace-nowrap">Exp. Date: {formatDate(expDate) || '13-08-2026'}</div>
                      <div className="whitespace-nowrap">Batch No: {batchNo || '1234'}</div>
                      <div className="whitespace-nowrap">FSSAI No: {fssaiNo || '12420026000550'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Action Button */}
            <button
              onClick={handlePrint}
              disabled={loading}
              className="mt-6 w-full inline-flex items-center justify-center px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <Printer className="h-6 w-6 mr-3" />
              Print Labels ({printQty} Stickers)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;
