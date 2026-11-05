import { BusinessProfile, Customer, Invoice, Payment, Product, ClientOrder } from '../types';

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  name: 'NexTone',
  tagline: 'Printing, Branding & Custom Media Solutions',
  phone: '+256 700 123456',
  email: 'orders@nextone.ug',
  address: 'Plot 42, Kampala Road, Kampala, Uganda',
  taxNumber: '1000849201',
  defaultCurrency: 'UGX',
  bankName: 'Stanbic Bank Uganda',
  bankAccount: '9030018492041',
  bankSwift: 'SBICUGKX',
  mobileMoneyMerchant: 'MTN MoMo Pay: 894120',
  mobileMoneyNumber: '+256 772 123456',
  notes: 'Payment terms: 50% deposit on order confirmation, balance upon delivery.',
};

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    sku: 'BNR-ROLL-01',
    name: 'Roll-up Banner',
    category: 'Banners & Signage',
    unit: 'pcs',
    unitPrice: 120000,
    description: 'Heavy duty aluminium cassette stand (85x200cm) with anti-curl PVC printed graphic.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_2',
    sku: 'TSH-DTF-02',
    name: 'Branded T-Shirt',
    category: 'Apparels & Merchandise',
    unit: 'pcs',
    unitPrice: 28000,
    description: '100% combed cotton round neck T-shirt with full color chest DTF print.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_3',
    sku: 'BC-LAM-03',
    name: 'Business Cards',
    category: 'Paper Printing',
    unit: 'box',
    unitPrice: 35000,
    description: 'Box of 100 premium business cards with double-sided matte or gloss lamination (350gsm).',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_4',
    sku: 'STK-VIN-04',
    name: 'Vinyl Stickers',
    category: 'Large Format Printing',
    unit: 'sheet',
    unitPrice: 15000,
    description: 'A3 waterproof gloss vinyl sticker sheet with custom die-cut labels.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_5',
    sku: 'FLG-TEAR-05',
    name: 'Teardrop Flag',
    category: 'Banners & Signage',
    unit: 'pcs',
    unitPrice: 220000,
    description: 'Outdoor promotional teardrop feather flag (3m) with flexible carbon pole and water base.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_6',
    sku: 'MUG-PRN-06',
    name: 'Branded Mug',
    category: 'Promotional Items',
    unit: 'pcs',
    unitPrice: 18000,
    description: 'White ceramic coffee mug with full wrap-around heat-press corporate logo print.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_7',
    sku: 'FLY-A4-07',
    name: 'Flyers & Brochures',
    category: 'Paper Printing',
    unit: 'pack',
    unitPrice: 65000,
    description: 'Pack of 100 full color digital gloss art paper flyers/brochures (A5/A4).',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_8',
    sku: 'LND-WVN-08',
    name: 'Branded Lanyards',
    category: 'Corporate ID',
    unit: 'pcs',
    unitPrice: 6000,
    description: 'Custom woven fabric lanyard with metal hook and plastic card holder.',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_ORDERS: ClientOrder[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
