import { BusinessProfile, Customer, Invoice, Payment, Product, ClientOrder } from '../types';

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  name: 'My Business',
  tagline: '',
  phone: '',
  email: '',
  address: '',
  defaultCurrency: 'UGX',
  notes: '',
};

export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_ORDERS: ClientOrder[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
