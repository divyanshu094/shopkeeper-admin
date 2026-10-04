import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminApiService } from './services/admin-api.service';
import { AdminCategory, AdminOrder, AdminProduct, AdminSection, AnalyticsSummary, PaymentTransaction } from './models/admin.models';
import {
  adminLogin,
  adminLogout,
  clearAdminAuthError,
  requestAdminPasswordReset,
  resetAdminPassword,
} from './store/auth.actions';
import { loadAdminSection } from './store/admin.actions';
import { AdminAppState } from './store/state';
import { initialAdminAuthState } from './store/auth.reducer';
import { initialAdminDataState } from './store/admin.reducer';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly store = inject(Store<AdminAppState>);
  private readonly api = inject(AdminApiService);
  private readonly authState = toSignal(this.store.select((state: AdminAppState) => state.auth), { initialValue: initialAdminAuthState });
  private readonly adminState = toSignal(this.store.select((state: AdminAppState) => state.data), { initialValue: initialAdminDataState });
  isAuthenticated = computed(() => Boolean(this.authState().token && this.authState().user?.isAdmin));
  adminUser = computed(() => this.authState().user);
  authLoading = computed(() => this.authState().loading);
  authError = computed(() => this.authState().error || '');
  recoveryLoading = computed(() => this.authState().recoveryLoading);
  recoveryMessage = computed(() => this.authState().recoveryMessage || '');
  recoveryLink = computed(() => this.authState().recoveryLink || '');
  passwordResetComplete = computed(() => this.authState().passwordResetComplete);
  data = computed(() => this.adminState());
  isLoading = computed(() => this.adminState().loading);
  errorMessage = computed(() => this.adminState().error || this.mutationError());
  overview = computed(() => this.adminState().overview);
  orders = computed(() => this.adminState().orders);
  products = computed(() => this.adminState().products);
  categories = computed(() => this.adminState().categories);
  customers = computed(() => this.adminState().customers);
  deliveryAgents = computed(() => this.adminState().deliveryAgents);
  payments = computed(() => this.adminState().payments);
  activeSection = signal<AdminSection>('overview');
  readonly today = new Date();
  mutationError = signal('');
  notice = signal('');
  isSaving = signal(false);
  dialog = signal<'product' | 'category' | 'agent' | null>(null);
  orderSearch = '';
  productSearch = '';
  customerSearch = '';
  editingProductId: string | null = null;
  editingCategoryId: string | null = null;
  email = '';
  password = '';
  recoveryEmail = '';
  recoveryPassword = '';
  confirmRecoveryPassword = '';
  recoveryError = signal('');
  recoveryMode = signal<'login' | 'request' | 'reset'>(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('token') ? 'reset' : 'login',
  );
  recoveryToken = signal(
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('token') || '',
  );
  productForm = this.emptyProduct();
  categoryForm = this.emptyCategory();
  agentForm = this.emptyAgent();
  readonly orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  readonly sections: Array<{ id: AdminSection; label: string; mark: string }> = [
    { id: 'overview', label: 'Overview', mark: 'OV' },
    { id: 'orders', label: 'Orders', mark: 'OR' },
    { id: 'products', label: 'Inventory', mark: 'IN' },
    { id: 'categories', label: 'Categories', mark: 'CA' },
    { id: 'customers', label: 'Customers', mark: 'CU' },
    { id: 'delivery', label: 'Delivery team', mark: 'DT' },
    { id: 'payments', label: 'Payments', mark: 'PY' },
  ];

  ngOnInit() {
    if (this.isAuthenticated()) this.loadSection('overview');
  }

  signIn() {
    this.store.dispatch(adminLogin({ email: this.email.trim(), password: this.password }));
  }

  openPasswordRecovery() {
    this.recoveryError.set('');
    this.recoveryMode.set('request');
    this.store.dispatch(clearAdminAuthError());
  }

  requestPasswordReset() {
    this.recoveryError.set('');
    if (!this.recoveryEmail.trim()) {
      this.recoveryError.set('Enter the email address on your administrator account.');
      return;
    }
    this.store.dispatch(requestAdminPasswordReset({ email: this.recoveryEmail.trim().toLowerCase() }));
  }

  updatePassword() {
    this.recoveryError.set('');
    if (this.recoveryPassword.length < 8) {
      this.recoveryError.set('Use at least 8 characters for your new password.');
      return;
    }
    if (this.recoveryPassword !== this.confirmRecoveryPassword) {
      this.recoveryError.set('The passwords do not match.');
      return;
    }
    this.store.dispatch(resetAdminPassword({
      token: this.recoveryToken(),
      password: this.recoveryPassword,
    }));
  }

  returnToSignIn() {
    this.recoveryMode.set('login');
    this.recoveryToken.set('');
    this.recoveryPassword = '';
    this.confirmRecoveryPassword = '';
    this.recoveryError.set('');
    this.store.dispatch(adminLogout());
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }

  signOut() {
    this.store.dispatch(adminLogout());
    this.activeSection.set('overview');
    this.password = '';
  }

  loadSection(section: AdminSection) {
    this.activeSection.set(section);
    this.mutationError.set('');
    this.notice.set('');
    this.store.dispatch(loadAdminSection({ section }));
  }

  sectionTitle(): string {
    return this.sections.find((section) => section.id === this.activeSection())?.label || 'Overview';
  }

  openProduct(product?: AdminProduct) {
    this.editingProductId = product?._id ?? null;
    this.productForm = product ? {
      name: product.name,
      description: product.description || '',
      price: product.price,
      originalPrice: product.originalPrice ?? null,
      category: typeof product.category === 'string' ? product.category : product.category?._id || '',
      brand: product.brand || '',
      stock: product.stock,
      sku: product.sku || '',
      imageUrls: product.images?.join(', ') || '',
      isActive: product.isActive,
    } : this.emptyProduct();
    this.dialog.set('product');
    if (!this.categories().length) this.store.dispatch(loadAdminSection({ section: 'categories' }));
  }

  saveProduct() {
    const { imageUrls, ...fields } = this.productForm;
    const body = {
      ...fields,
      images: imageUrls.split(',').map((image) => image.trim()).filter(Boolean),
      price: Number(this.productForm.price),
      originalPrice: this.productForm.originalPrice ? Number(this.productForm.originalPrice) : undefined,
      stock: Number(this.productForm.stock),
    };
    const request = this.editingProductId
      ? this.api.put(`admin/products/${this.editingProductId}`, body)
      : this.api.post('admin/products', body);
    this.runMutation(request, 'Product saved.', ['products']);
  }

  archiveProduct(product: AdminProduct) {
    if (!confirm(`Archive ${product.name}? It will no longer appear in the shop.`)) return;
    this.runMutation(this.api.delete(`admin/products/${product._id}`), 'Product archived.', ['products']);
  }

  openCategory(category?: AdminCategory) {
    this.editingCategoryId = category?._id ?? null;
    this.categoryForm = category ? {
      name: category.name,
      description: category.description || '',
      image: category.image || '',
      isActive: category.isActive,
      sortOrder: category.sortOrder ?? 0,
    } : this.emptyCategory();
    this.dialog.set('category');
  }

  saveCategory() {
    const request = this.editingCategoryId
      ? this.api.put(`admin/categories/${this.editingCategoryId}`, this.categoryForm)
      : this.api.post('admin/categories', this.categoryForm);
    this.runMutation(request, 'Category saved.', ['categories', 'products']);
  }

  openAgentForm() {
    this.agentForm = this.emptyAgent();
    this.dialog.set('agent');
  }

  saveAgent() {
    this.runMutation(this.api.post('admin/delivery-agents', this.agentForm), 'Delivery account created.', ['delivery']);
  }

  updateOrderStatus(order: AdminOrder, status: string) {
    if (order.status === status) return;
    this.runMutation(
      this.api.put(`admin/orders/${order._id}/status`, { status }),
      `Order ${order.tracking?.trackingNumber || order._id} updated.`,
      ['orders', 'overview'],
    );
  }

  closeDialog() {
    this.dialog.set(null);
  }

  categoryId(product: AdminProduct): string {
    return typeof product.category === 'string' ? product.category : product.category?._id || '';
  }

  categoryName(product: AdminProduct): string {
    return typeof product.category === 'string' ? 'Category' : product.category?.name || 'Category';
  }

  orderNumber(order: AdminOrder): string {
    return order.tracking?.trackingNumber || order._id.slice(-8).toUpperCase();
  }

  paymentOrderNumber(payment: PaymentTransaction): string {
    const order = payment?.order;
    if (typeof order === 'string') return order.slice(-8).toUpperCase();
    return order?.tracking?.trackingNumber || order?._id?.slice(-8).toUpperCase() || '—';
  }

  paymentAmountMinor(payment: { amountMinor: number }): number {
    return payment.amountMinor / 100;
  }

  trackById(_index: number, item: { _id: string }): string {
    return item._id;
  }

  filteredOrders(): AdminOrder[] {
    const query = this.orderSearch.trim().toLowerCase();
    if (!query) return this.orders();
    return this.orders().filter((order) =>
      `${this.orderNumber(order)} ${order.user?.name || ''} ${order.user?.email || ''}`.toLowerCase().includes(query),
    );
  }

  filteredProducts(): AdminProduct[] {
    const query = this.productSearch.trim().toLowerCase();
    if (!query) return this.products();
    return this.products().filter((product) =>
      `${product.name} ${product.sku || ''} ${this.categoryName(product)}`.toLowerCase().includes(query),
    );
  }

  filteredCustomers(): AdminAppState['data']['customers'] {
    const query = this.customerSearch.trim().toLowerCase();
    if (!query) return this.customers();
    return this.customers().filter((customer) =>
      `${customer.name} ${customer.email} ${customer.phone || ''}`.toLowerCase().includes(query),
    );
  }

  toggleCategory(category: AdminCategory) {
    this.runMutation(
      this.api.put(`admin/categories/${category._id}`, { isActive: !category.isActive }),
      category.isActive ? 'Category hidden.' : 'Category made visible.',
      ['categories', 'products'],
    );
  }

  private runMutation(request: ReturnType<AdminApiService['post']>, message: string, reload: AdminSection[]) {
    this.isSaving.set(true);
    this.mutationError.set('');
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialog.set(null);
        this.notice.set(message);
        reload.forEach((section) => this.store.dispatch(loadAdminSection({ section })));
      },
      error: (error) => this.mutationError.set(error?.error?.message || 'The change could not be saved.'),
    });
  }

  private emptyProduct() {
    return { name: '', description: '', price: 0, originalPrice: null as number | null, category: '', brand: '', stock: 0, sku: '', imageUrls: '', isActive: true };
  }

  private emptyCategory() {
    return { name: '', description: '', image: '', isActive: true, sortOrder: 0 };
  }

  private emptyAgent() {
    return { name: '', email: '', password: '', phone: '', vehicleType: 'bike', vehicleNumber: '', licenseNumber: '' };
  }
}
