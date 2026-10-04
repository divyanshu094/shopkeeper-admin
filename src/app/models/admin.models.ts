export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: true;
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  user: AdminUser;
}

export type AdminSection =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'customers'
  | 'delivery'
  | 'payments';

export interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  recentOrders: AdminOrder[];
  topProducts: Array<{ _id: string; name: string; soldCount: number; stock: number }>;
}

export interface AdminOrder {
  _id: string;
  status: string;
  total: number;
  createdAt: string;
  user?: { name?: string; email?: string; phone?: string };
  payment?: { method: string; status: string };
  items?: Array<{ quantity: number; product?: { name?: string } }>;
  tracking?: { trackingNumber?: string };
}

export interface AdminProduct {
  _id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  category: string | { _id: string; name: string };
  brand?: string;
  stock: number;
  sku?: string;
  isActive: boolean;
  images?: string[];
  soldCount?: number;
}

export interface AdminCategory {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  parent?: string | { _id: string; name: string };
  isActive: boolean;
  sortOrder?: number;
}

export interface DeliveryAgent {
  _id: string;
  user: { _id: string; name: string; email: string; phone?: string } | null;
  vehicleType: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  isAvailable: boolean;
  isActive?: boolean;
  totalDeliveries: number;
  earnings: number;
}

export interface PaymentTransaction {
  _id: string;
  order: string | { _id: string; status?: string; tracking?: { trackingNumber?: string } };
  provider: string;
  type: string;
  status: string;
  amountMinor: number;
  currency: string;
  method?: string;
  gatewayPaymentId?: string;
  gatewayRefundId?: string;
  gatewayOrderId?: string;
  failureDescription?: string;
  createdAt: string;
}