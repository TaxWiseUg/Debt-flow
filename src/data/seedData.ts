import { BusinessProfile, Customer, Invoice, Payment, Product } from '../types';

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  name: 'My Business Ledger',
  tagline: 'Invoicing & Customer Debt Tracking',
  phone: '',
  email: '',
  address: '',
  taxNumber: '',
  defaultCurrency: 'UGX',
  bankName: '',
  bankAccount: '',
  bankSwift: '',
  mobileMoneyMerchant: '',
  mobileMoneyNumber: '',
  notes: '',
};

// Clean, zero mock data as requested
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
