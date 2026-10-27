/**
 * GST Utilities for Sri Devi Snacks
 * 
 * Rules:
 * 1. If a shop has a GST effective date (gst_effective_date), ONLY bills on or
 *    after that date qualify as GST bills.
 *    Any bill BEFORE that date (whether in September, October, or earlier) is
 *    NEVER a GST bill!
 * 2. If a shop does NOT have an explicit effective date (i.e. legacy shops that
 *    already had a GST number prior to October):
 *    - 'நிலா பேக்கரி' cutoff applies at '2026-09-05'
 *    - Other existing GST shops maintain their GST status across past months.
 */

/**
 * Normalizes a date input to a YYYY-MM-DD string for safe date-only comparisons.
 */
export function toDateString(dateInput?: string | Date | null): string {
  if (!dateInput) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.trim();
    if (cleanStr.includes('T')) {
      return cleanStr.split('T')[0];
    }
    if (cleanStr.includes(' ')) {
      return cleanStr.split(' ')[0];
    }
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }
    // If it is DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(cleanStr)) {
      const parts = cleanStr.split(/[-/]/);
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Checks whether GST is active and applicable for a specific bill date for a shop.
 */
export function isShopGstActiveForBill(shop: any, billDateInput?: string | Date | null): boolean {
  if (!shop) return false;

  const gstNo = (shop.gst || shop.gstNumber || shop.gst_number || '').trim();
  if (!gstNo) return false;

  const billDateStr = toDateString(billDateInput);
  const effectiveDateRaw = shop.gst_effective_date || shop.gstEffectiveDate;

  // 1. If shop has an explicit GST effective date set (e.g. '2026-10-14'):
  // ANY bill before this date (whether in September or October) CANNOT be a GST bill!
  if (effectiveDateRaw) {
    const effectiveDateStr = toDateString(effectiveDateRaw);
    return billDateStr >= effectiveDateStr;
  }

  // 2. Legacy check: If no effective date is set:
  const shopName = (shop.shop_name || shop.shopName || '').trim();
  if (shopName === 'நிலா பேக்கரி') {
    return billDateStr >= '2026-09-05';
  }

  // Pre-existing GST shops without an effective date remain active
  return true;
}

/**
 * Gets the shop GST number for a bill date, or empty string if not applicable.
 */
export function getShopGstNumberForBill(shop: any, billDateInput?: string | Date | null): string {
  if (!isShopGstActiveForBill(shop, billDateInput)) {
    return '';
  }
  return (shop.gst || shop.gstNumber || shop.gst_number || '').trim();
}

/**
 * Gets the shop GST type ('GST' or 'IGST'). Default is 'GST'.
 */
export function getShopGstType(shop: any): 'GST' | 'IGST' {
  if (!shop) return 'GST';
  const type = (shop.gst_type || shop.gstType || '').toString().trim().toUpperCase();
  return type === 'IGST' ? 'IGST' : 'GST';
}
