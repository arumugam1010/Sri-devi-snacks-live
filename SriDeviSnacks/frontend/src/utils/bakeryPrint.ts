import html2canvas from 'html2canvas';

export interface BakeryPrintBillData {
  id?: string | number;
  date?: string;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
  location_name?: string;
  items: Array<{
    product_name?: string;
    name?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total_amount: number;
  paid_amount?: number;
  pending_amount?: number;
}

const isMobileOrTablet = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent.toLowerCase());
};

export const printBakeryBill = async (
  billData: BakeryPrintBillData,
  useRawBT: boolean = true,
  logoSrc: string = '/Logo.png'
) => {
  const isMobile = isMobileOrTablet();
  
  const formatDate = () => {
    if (billData.date) return billData.date;
    if (billData.created_at) {
      try {
        const d = new Date(billData.created_at);
        return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return billData.created_at;
      }
    }
    return new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayDate = formatDate();
  const billId = billData.id ? `#${billData.id}` : 'DRAFT';
  const total = Number(billData.total_amount) || 0;
  const paid = billData.paid_amount !== undefined ? Number(billData.paid_amount) : total;
  const pending = billData.pending_amount !== undefined ? Number(billData.pending_amount) : Math.max(0, total - paid);
  const totalQty = (billData.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const printContent = `
    <div class="print-receipt" style="width: 100%; font-family: 'Courier New', Courier, monospace; color: #000;">
      <div class="text-center" style="text-align: center; margin-bottom: 8px;">
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 2px;">"ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 600; margin: 3px 0;">
          <span>GST No: 33BAPPS2831B2ZU</span>
          <span>Mobile: 8807810021</span>
        </div>
        <div style="text-align: center; margin: 4px 0;">
          <img src="${logoSrc}" alt="Sri Devi Snacks" style="height: 48px; width: auto; max-width: 140px; margin: 0 auto; display: block; object-fit: contain;" />
        </div>
        <div style="font-size: 17px; font-weight: 900; letter-spacing: 0.5px; margin-top: 2px;">Sri Devi Snacks</div>
        <div style="font-size: 10px;">128 C Santhanamari Amman Kovil Street</div>
        <div style="font-size: 10px;">Vallioor, Tirunelveli-627117</div>
        <div style="font-size: 12px; font-weight: bold; margin-top: 4px; text-transform: uppercase;">Bakery Bill</div>
      </div>

      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 6px 0; font-size: 11px; line-height: 1.4;">
        ${billData.customer_name ? `<div><strong>Customer:</strong> ${billData.customer_name}</div>` : ''}
        ${billData.customer_phone ? `<div><strong>Phone:</strong> ${billData.customer_phone}</div>` : ''}
        ${billData.location_name ? `<div><strong>Location:</strong> ${billData.location_name}</div>` : ''}
        <div style="display: flex; justify-content: space-between;">
          <span><strong>Date:</strong> ${displayDate}</span>
          <span><strong>Bill No:</strong> ${billId}</span>
        </div>
      </div>

      <div style="margin: 6px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1px dashed #000; font-weight: bold;">
              <th style="text-align: left; padding: 4px 2px;">Product Name</th>
              <th style="text-align: center; padding: 4px 2px; width: 40px;">QTY</th>
              <th style="text-align: right; padding: 4px 2px; width: 55px;">Price</th>
              <th style="text-align: right; padding: 4px 2px; width: 60px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(billData.items || []).map((item) => {
              const name = item.product_name || item.name || '';
              const qty = Number(item.quantity) || 0;
              const price = Number(item.price) || 0;
              const rowTotal = Number(item.total) || (qty * price);
              return `
                <tr style="border-bottom: 1px dotted #ccc;">
                  <td style="text-align: left; padding: 3px 2px; word-break: break-word;">${name}</td>
                  <td style="text-align: center; padding: 3px 2px;">${qty}</td>
                  <td style="text-align: right; padding: 3px 2px;">₹${price.toFixed(2)}</td>
                  <td style="text-align: right; padding: 3px 2px; font-weight: bold;">₹${rowTotal.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 6px; font-size: 11px; line-height: 1.5;">
        <div style="display: flex; justify-content: space-between;">
          <span>Item Total (${totalQty} items):</span>
          <span>₹${total.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>Today Total Amount (இன்றைய பில்):</span>
          <span>₹${total.toFixed(2)}</span>
        </div>
        <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900;">
          <span>Final Total:</span>
          <span style="color: #1d4ed8;">₹${total.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Paid Amount:</span>
          <span>₹${paid.toFixed(2)}</span>
        </div>
        ${pending > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #b91c1c; margin-top: 2px;">
            <span>Pending Amount:</span>
            <span>₹${pending.toFixed(2)}</span>
          </div>
        ` : ''}
      </div>

      <div style="border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; text-align: center; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">
        Thank you – Visit Again!
      </div>
    </div>
  `;

  const fallbackPrint = (htmlBody: string) => {
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
      const pageHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Bakery Bill ${billId}</title>
            <style>
              @page { size: 80mm auto; margin: 5mm; }
              body {
                width: 72mm;
                margin: 0 auto;
                padding: 4px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #000;
              }
              @media screen {
                body {
                  width: 320px;
                  margin: 20px auto;
                  padding: 10px;
                  box-shadow: 0 0 10px rgba(0,0,0,0.15);
                }
              }
            </style>
          </head>
          <body>
            ${htmlBody}
          </body>
        </html>
      `;
      doc.write(pageHtml);
      doc.close();

      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } else if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 300);
    } else if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  if (isMobile && useRawBT) {
    try {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '800px';
      container.style.background = '#ffffff';
      container.style.padding = '10px';
      container.style.boxSizing = 'border-box';
      container.innerHTML = printContent + `
        <style>
          * {
            font-family: 'Arial Black', Arial, Helvetica, sans-serif !important;
            font-weight: 900 !important;
            color: #000000 !important;
            -webkit-text-stroke: 0.5px black !important;
          }
          body, div, p, td, th, span {
            font-size: 34px !important;
            line-height: 1.4 !important;
          }
          img {
            max-width: 260px !important;
            height: auto !important;
            margin: 0 auto !important;
          }
          .text-center { text-align: center !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th { font-size: 26px !important; padding: 8px 4px !important; border-bottom: 4px solid #000 !important; }
          td { font-size: 28px !important; padding: 8px 4px !important; border-bottom: 2px solid #666 !important; }
        </style>
      `;
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        scale: 1.0,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(container);

      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      window.location.href = `rawbt:data:image/jpeg;base64,` + base64Image;
    } catch (err) {
      console.error('RawBT print failed, falling back to standard print:', err);
      fallbackPrint(printContent);
    }
  } else {
    fallbackPrint(printContent);
  }
};
