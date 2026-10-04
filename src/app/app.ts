import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminApiService } from './services/admin-api.service';
import { AdminCategory, AdminOrder, AdminProduct, AdminSection, AnalyticsSummary, DeliveryAgent, PaymentTransaction } from './models/admin.models';
import {
  ADMIN_API_ENDPOINTS,
  ADMIN_APP_TEXT,
  ADMIN_CONFIG,
  ADMIN_ORDER_STATUSES,
  ADMIN_SECTIONS,
} from './constants/app.constants';
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
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  readonly text = ADMIN_APP_TEXT;
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
  readonly minimumPasswordLength = ADMIN_CONFIG.minimumPasswordLength;
  mutationError = signal('');
  notice = signal('');
  isSaving = signal(false);
  dialog = signal<'product' | 'category' | 'agent' | null>(null);
  orderSearch = '';
  productSearch = '';
  customerSearch = '';
  editingProductId: string | null = null;
  editingCategoryId: string | null = null;
  editingAgentId: string | null = null;
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
  readonly orderStatuses = ADMIN_ORDER_STATUSES;
  readonly sections = ADMIN_SECTIONS;

  ngOnInit() {
    this.title.setTitle(ADMIN_APP_TEXT.appName);
    this.meta.updateTag({ name: 'description', content: ADMIN_APP_TEXT.description });
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
      this.recoveryError.set(ADMIN_APP_TEXT.recovery.emailRequired);
      return;
    }
    this.store.dispatch(requestAdminPasswordReset({ email: this.recoveryEmail.trim().toLowerCase() }));
  }

  updatePassword() {
    this.recoveryError.set('');
    if (this.recoveryPassword.length < ADMIN_CONFIG.minimumPasswordLength) {
      this.recoveryError.set(ADMIN_APP_TEXT.recovery.minimumPassword.replace('{{length}}', ADMIN_CONFIG.minimumPasswordLength.toString()));
      return;
    }
    if (this.recoveryPassword !== this.confirmRecoveryPassword) {
      this.recoveryError.set(ADMIN_APP_TEXT.recovery.passwordsMismatch);
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
    return this.sections.find((section) => section.id === this.activeSection())?.label || ADMIN_APP_TEXT.sections.overview;
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
      ? this.api.put(`${ADMIN_API_ENDPOINTS.products}/${this.editingProductId}`, body)
      : this.api.post(ADMIN_API_ENDPOINTS.products, body);
    this.runMutation(request, ADMIN_APP_TEXT.messages.productSaved, ['products']);
  }

  archiveProduct(product: AdminProduct) {
    if (!confirm(ADMIN_APP_TEXT.messages.archiveConfirm.replace('{{name}}', product.name))) return;
    this.runMutation(this.api.delete(`${ADMIN_API_ENDPOINTS.products}/${product._id}`), ADMIN_APP_TEXT.messages.productArchived, ['products']);
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
      ? this.api.put(`${ADMIN_API_ENDPOINTS.categories}/${this.editingCategoryId}`, this.categoryForm)
      : this.api.post(ADMIN_API_ENDPOINTS.categories, this.categoryForm);
    this.runMutation(request, ADMIN_APP_TEXT.messages.categorySaved, ['categories', 'products']);
  }

  openAgentForm(agent?: DeliveryAgent) {
    this.editingAgentId = agent?._id ?? null;
    this.agentForm = agent ? {
      name: agent.user?.name || '',
      email: agent.user?.email || '',
      password: '',
      phone: agent.user?.phone || '',
      vehicleType: agent.vehicleType,
      vehicleNumber: agent.vehicleNumber || '',
      licenseNumber: agent.licenseNumber || '',
    } : this.emptyAgent();
    this.dialog.set('agent');
  }

  saveAgent() {
    const request = this.editingAgentId
      ? this.api.put(ADMIN_API_ENDPOINTS.deliveryAgent(this.editingAgentId), this.agentForm)
      : this.api.post(ADMIN_API_ENDPOINTS.deliveryAgents, this.agentForm);
    const message = this.editingAgentId
      ? ADMIN_APP_TEXT.messages.deliveryDetailsSaved
      : ADMIN_APP_TEXT.messages.deliveryAccountCreated;
    this.runMutation(request, message, ['delivery']);
  }

  toggleDeliveryAgent(agent: DeliveryAgent) {
    const isActive = agent.isActive === false;
    this.runMutation(
      this.api.put(ADMIN_API_ENDPOINTS.deliveryAgent(agent._id), { isActive }),
      ADMIN_APP_TEXT.messages.deliveryStatusUpdated,
      ['delivery'],
    );
  }

  deleteDeliveryAgent(agent: DeliveryAgent) {
    const name = agent.user?.name || agent.user?.email || agent._id;
    if (!confirm(ADMIN_APP_TEXT.messages.deleteDeliveryPartnerConfirm.replace('{{name}}', name))) return;
    this.runMutation(
      this.api.delete(ADMIN_API_ENDPOINTS.deliveryAgent(agent._id)),
      ADMIN_APP_TEXT.messages.deliveryPartnerDeleted,
      ['delivery'],
    );
  }

  updateOrderStatus(order: AdminOrder, status: string) {
    if (order.status === status) return;
    this.runMutation(
      this.api.put(`${ADMIN_API_ENDPOINTS.orders}/${order._id}/status`, { status }),
      ADMIN_APP_TEXT.messages.orderUpdated.replace('{{order}}', order.tracking?.trackingNumber || order._id),
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
    return typeof product.category === 'string' ? ADMIN_APP_TEXT.messages.categoryFallback : product.category?.name || ADMIN_APP_TEXT.messages.categoryFallback;
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
    return payment.amountMinor / ADMIN_CONFIG.minorCurrencyUnitsPerMajor;
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
      this.api.put(`${ADMIN_API_ENDPOINTS.categories}/${category._id}`, { isActive: !category.isActive }),
      category.isActive ? ADMIN_APP_TEXT.messages.categoryHidden : ADMIN_APP_TEXT.messages.categoryVisible,
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
      error: (error) => this.mutationError.set(error?.error?.message || ADMIN_APP_TEXT.messages.saveFailed),
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
