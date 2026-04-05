import { Component, ChangeDetectionStrategy, signal, inject, computed, OnInit, effect, viewChild, ElementRef } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ProductService } from './services/product.service';
import { Product, Category } from './types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  // FIX: Corrected the change detection strategy to use the `ChangeDetectionStrategy` enum.
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class AppComponent implements OnInit {
  private productService = inject(ProductService);
  private document = inject(DOCUMENT);

  // State Signals
  products = signal<Product[]>([]);
  searchTerm = signal('');
  selectedGroup = signal<string | null>(null);
  selectedSection = signal<string | null>(null);
  selectedProduct = signal<Product | null>(null);
  selectedProductImageIndex = signal(0);
  mobileMenuOpen = signal(false);
  isMobileMenuClosing = signal(false);
  theme = signal<'light' | 'dark'>('light');
  language = signal<'en' | 'ar'>('ar');
  currentView = signal<'products' | 'all_sections' | 'cart'>('products');
  sortBy = signal<'default' | 'name_asc'>('default');
  hoveredGroup = signal<string | null>(null);
  loading = signal<boolean>(true);
  fetchError = signal<string | null>(null);
  productAdded = signal<boolean>(false);
  cartItems = signal<Product[]>([]);
  searchOpen = signal<boolean>(false);
  frameColor = signal<'wine' | 'white'>('wine');
  lastSelectedProductId = signal<number | null>(null);
  previousView = signal<'products' | 'all_sections' | 'cart' | null>(null);
  
  currentYear = new Date().getFullYear();
  
  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  // Computed Signals
  cartCount = computed(() => this.cartItems().length);

  // Translations
  private translations = {
    en: {
      storeName: 'Matjarna',
      allProducts: 'All Products',
      searchPlaceholder: 'Search for products, brands and more',
      backToProducts: 'Back to Products',
      inStock: 'Quantity available',
      addToCart: 'Add to Cart',
      addedToCart: 'Added!',
      heroTitle: 'Discover Your Style',
      heroSubtitle: 'Premium products curated just for you. Quality and design in every detail.',
      shopNow: 'Shop Now',
      viewAllCategories: 'View All Categories',
      noProductsFound: 'No products found',
      noProductsSuggestion: 'Try adjusting your search or filter.',
      footerRights: 'All Rights Reserved.',
      footerBuiltWith: 'Developed by: Moath Bakhresh',
      allCategoriesTitle: 'Browse by Category',
      backToHome: 'Back to Home',
      backToAllCategories: 'Back to All Categories',
      cart: 'Cart',
      loadingError: 'Failed to Load Products',
      shoppingCart: 'Shopping Cart',
      emptyCart: 'Your cart is empty.',
      emptyCartSuggestion: "Looks like you haven't added anything to your cart yet.",
      continueShopping: 'Continue Shopping',
      product: 'Product',
      products: 'Products',
      price: 'Price',
      total: 'Total',
      checkout: 'Proceed to Checkout',
      remove: 'Remove',
      outOfStock: 'Out of Stock',
      lowStock: 'Low Stock',
      lowStockWarning: (amount: number) => `Hurry, only ${amount} left in stock!`,
      checkoutDisabledTooltip: 'Some items in your cart are out of stock',
      retry: 'Retry',
    },
    ar: {
      storeName: 'متجرنا',
      allProducts: 'كل المنتجات',
      searchPlaceholder: 'ابحث عن منتجات، ماركات، والمزيد',
      backToProducts: 'العودة للمنتجات',
      inStock: 'الكمية المتوفرة',
      addToCart: 'أضف إلى السلة',
      addedToCart: 'تمت الإضافة!',
      heroTitle: 'اكتشف ذوقك',
      heroSubtitle: 'تسوّق بدقة… وتألق بأسلوبك',
      shopNow: 'تسوق الآن',
      viewAllCategories: 'عرض كل الفئات',
      noProductsFound: 'لم يتم العثور على منتجات',
      noProductsSuggestion: 'حاول تعديل البحث أو الفلتر.',
      footerRights: 'جميع الحقوق محفوظة.',
      footerBuiltWith: 'تم التطوير بواسطة : معاذ باخريش',
      allCategoriesTitle: 'تصفح حسب الفئة',
      backToHome: 'العودة للرئيسية',
      backToAllCategories: 'العودة للفئات',
      cart: 'السلة',
      loadingError: 'فشل تحميل المنتجات',
      shoppingCart: 'سلة التسوق',
      emptyCart: 'سلة التسوق فارغة.',
      emptyCartSuggestion: 'يبدو أنك لم تقم بإضافة أي شيء إلى سلتك بعد.',
      continueShopping: 'متابعة التسوق',
      product: 'منتج',
      products: 'منتجات',
      price: 'السعر',
      total: 'المجموع',
      checkout: 'المتابعة للدفع',
      remove: 'إزالة',
      outOfStock: 'نفذت الكمية',
      lowStock: 'كمية محدودة',
      lowStockWarning: (amount: number) => `أسرع، تبقى ${amount} فقط في المخزون!`,
      checkoutDisabledTooltip: 'بعض المنتجات في سلتك نفذت من المخزون',
      retry: 'إعادة المحاولة',
    }
  };

  t = computed(() => this.translations[this.language()]);

  // Derived State (Computed Signals)
  showHero = computed(() => !this.selectedGroup() && !this.selectedSection() && this.sortBy() === 'default');
  
  categories = computed<Category[]>(() => {
    const products = this.products();
    if (!products) return [];

    const groups = [...new Set(products.map(p => p.group))];
    return groups.map(group => ({
      group,
      sections: [...new Set(products.filter(p => p.group === group).map(p => p.section))]
    }));
  });
  
  allSections = computed(() => {
    const products = this.products();
    if (!products) return [];
    
    const sectionsMap = new Map<string, { name: string; images: string[] }>();
    
    for (const product of products) {
        if (!sectionsMap.has(product.section)) {
            const images = product.image_sections.length > 0 
                ? product.image_sections 
                : (product.images.length > 0 ? [product.images[0]] : []);
            sectionsMap.set(product.section, {
                name: product.section,
                images: images
            });
        }
    }
    return Array.from(sectionsMap.values());
  });

  filteredProducts = computed(() => {
    const allProducts = this.products();
    const term = this.searchTerm().toLowerCase();
    const group = this.selectedGroup();
    const section = this.selectedSection();

    const filtered = allProducts.filter(product => {
      const matchesSearch = term === '' || 
        product.name.toLowerCase().includes(term) ||
        product.section.toLowerCase().includes(term) ||
        product.group.toLowerCase().includes(term);
      const matchesGroup = group === null || product.group === group;
      const matchesSection = section === null || product.section === section;

      return matchesSearch && matchesGroup && matchesSection;
    });

    if (this.sortBy() === 'name_asc') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, this.language()));
    }

    return filtered;
  });

  cartTotalsByCurrency = computed(() => {
    const totals = new Map<string, number>();
    this.cartItems().forEach(item => {
        const priceMatch = item.price.match(/[\d.]+/);
        const currencyMatch = item.price.replace(/[\d.\s]+/g, '').trim() || 'ريال';
        if (priceMatch) {
            const price = parseFloat(priceMatch[0]);
            const currentTotal = totals.get(currencyMatch) || 0;
            totals.set(currencyMatch, currentTotal + price);
        }
    });
    return Array.from(totals.entries()).map(([currency, total]) => ({ currency, total }));
  });

  selectedSectionParentGroup = computed<string | null>(() => {
    const section = this.selectedSection();
    if (!section) return null;
    const category = this.categories().find(cat => cat.sections.includes(section));
    return category ? category.group : null;
  });

  isCheckoutDisabled = computed(() => {
    const cart = this.cartItems();
    if (cart.length === 0) return true;
    const allProducts = this.products();
    // A cart item is invalid only if the product has been removed from the store completely.
    // The quantity check (`productInStock.amount === 0`) is removed to fix a bug 
    // where adding the last available item to the cart would incorrectly disable checkout.
    // The checkout process itself will use the final remaining quantity when updating the sheet.
    return cart.some(cartItem => {
        const productInStock = allProducts.find(p => p.id === cartItem.id);
        return !productInStock;
    });
  });

  constructor() {
    // Update document attributes for theme and language
    effect(() => {
      const htmlElement = this.document.documentElement;
      htmlElement.className = this.theme();
      htmlElement.dir = this.language() === 'ar' ? 'rtl' : 'ltr';
      htmlElement.lang = this.language();
    });

    effect(() => {
      if (this.searchOpen() && this.searchInput()) {
        setTimeout(() => this.searchInput()!.nativeElement.focus(), 100);
      }
    });

    // Effect to keep the selected product signal in sync with the main products list
    effect(() => {
      const allProducts = this.products();
      const currentSelected = this.selectedProduct();
      if (currentSelected) {
        const updatedProduct = allProducts.find(p => p.id === currentSelected.id);
        this.selectedProduct.set(updatedProduct || null);
      }
    });
  }
  
  ngOnInit() {
    // Set initial loading state. If service loads from cache, products() might have length.
    if(this.products().length === 0) {
        this.loading.set(true);
    }

    this.productService.products$.subscribe(data => {
        if (data && data.length > 0) {
            this.products.set(data);
            if (this.loading()) {
              this.loading.set(false);
            }
            this.fetchError.set(null);
        }
    });
    
    this.productService.errors$.subscribe(errorMsg => {
        if (errorMsg) {
            // Only show the blocking error screen if we have no data to show the user.
            if(this.products().length === 0) {
              this.fetchError.set(errorMsg);
              this.loading.set(false);
            }
        }
    });
  }

  // Event Handlers
  handleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.selectedGroup.set(null);
    this.selectedSection.set(null);
    this.sortBy.set('default');
  }
  
  retryFetch() {
    this.loading.set(true);
    this.fetchError.set(null);
    this.productService.refresh();
  }

  handleImageError(event: Event) {
    const element = event.target as HTMLImageElement;
    element.src = 'https://picsum.photos/seed/placeholder/400/400';
    // To prevent potential infinite loops if the fallback also fails
    element.onerror = null;
  }

  toggleSearch(event?: Event) {
    event?.preventDefault();
    this.searchOpen.update(v => !v);
    if(this.searchOpen() && this.mobileMenuOpen()){
        this.toggleMobileMenu();
    }
  }

  toggleTheme(event: MouseEvent) {
    // Fallback for browsers that don't support the new API
    if (!(this.document as any).startViewTransition) {
      this.theme.update(t => t === 'light' ? 'dark' : 'light');
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = (this.document as any).startViewTransition(() => {
      this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
    });

    transition.ready.then(() => {
      const clipPath = [ `circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)` ];
      this.document.documentElement.animate({ 
        clipPath: clipPath 
      }, {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)'
      });
    });
  }

  toggleFrameColor(event: Event) {
    event.preventDefault();
    this.frameColor.update(c => c === 'wine' ? 'white' : 'wine');
  }

  selectGroup(event: Event, group: string | null, doScroll = true) {
    event.preventDefault();
    this.selectedGroup.set(group);
    this.selectedSection.set(null);
    this.sortBy.set('default');
    this.currentView.set('products');
    this.previousView.set(null);
    if (this.mobileMenuOpen()) {
        this.toggleMobileMenu();
    }
    this.hoveredGroup.set(null);
    this.searchOpen.set(false);
    if (doScroll) {
      this.scrollToProductsAfterRender();
    }
  }
  
  selectSection(event: Event, section: string) {
    event.preventDefault();
    if (this.currentView() === 'all_sections') {
      this.previousView.set('all_sections');
    } else {
      this.previousView.set(null);
    }
    this.selectedSection.set(section);
    this.selectedGroup.set(null);
    this.sortBy.set('default');
    this.currentView.set('products');
    if (this.mobileMenuOpen()) {
        this.toggleMobileMenu();
    }
    this.hoveredGroup.set(null);
    this.searchOpen.set(false);
    this.scrollToProductsAfterRender();
  }

  selectProduct(product: Product) {
    this.lastSelectedProductId.set(product.id);
    this.selectedProduct.set(product);
    this.selectedProductImageIndex.set(0);
    window.scrollTo(0, 0);
  }

  clearSelectedProduct() {
    this.selectedProduct.set(null);
    this.productAdded.set(false);
    this.scrollToLastSelectedProductAfterRender();
  }

  toggleMobileMenu() {
    if (this.mobileMenuOpen() && !this.isMobileMenuClosing()) {
        // It's open and not already closing, so start closing it
        this.isMobileMenuClosing.set(true);
        setTimeout(() => {
            this.mobileMenuOpen.set(false);
            this.isMobileMenuClosing.set(false);
        }, 300); // This duration MUST match the CSS animation duration
    } else if (!this.mobileMenuOpen()) {
        // It's closed, so let's open it
        this.mobileMenuOpen.set(true);
        if (this.searchOpen()) {
            this.searchOpen.set(false);
        }
    }
  }

  shopNow(event: Event) {
    event.preventDefault();
    this.selectedGroup.set(null);
    this.selectedSection.set(null);
    this.sortBy.set('name_asc');
    this.currentView.set('products');
    this.scrollToProductsAfterRender();
  }
  
  showAllSections(event: Event) {
    event.preventDefault();
    this.currentView.set('all_sections');
    window.scrollTo(0, 0);
  }
  
  goToHomeView(event: Event) {
    event.preventDefault();
    this.currentView.set('products');
    this.selectedGroup.set(null);
    this.selectedSection.set(null);
    this.sortBy.set('default');
    this.selectedProduct.set(null);
    this.searchTerm.set('');
    this.previousView.set(null);
    window.scrollTo(0, 0);
  }

  goBack(event: Event) {
    event.preventDefault();
    const prev = this.previousView();

    if (prev === 'all_sections') {
      this.currentView.set('all_sections');
      this.selectedSection.set(null);
      this.selectedGroup.set(null);
      this.sortBy.set('default');
      this.previousView.set(null);
      window.scrollTo(0, 0);
    } else {
      this.goToHomeView(event);
    }
  }

  showCart(event: Event) {
    event.preventDefault();
    this.selectedProduct.set(null);
    this.currentView.set('cart');
    window.scrollTo(0, 0);
  }

  addToCart(event: MouseEvent, productToAdd: Product | null) {
    if (!productToAdd || this.productAdded() || productToAdd.amount === 0) return;

    this.productAdded.set(true);
    this.cartItems.update(items => [...items, productToAdd]);

    // Decrement the quantity in the main product list.
    this.products.update(products =>
      products.map(p =>
        p.id === productToAdd.id ? { ...p, amount: p.amount - 1 } : p
      )
    );

    const button = event.currentTarget as HTMLElement;
    const cartIcon = this.document.getElementById('cart-icon');

    if (!button || !cartIcon) {
        setTimeout(() => this.productAdded.set(false), 2000);
        return;
    }

    const buttonRect = button.getBoundingClientRect();
    const cartIconRect = cartIcon.getBoundingClientRect();
    
    const flyer = this.document.createElement('div');
    flyer.style.position = 'fixed';
    flyer.style.backgroundColor = this.frameColor() === 'wine' ? '#722F37' : '#EFF0BB';
    flyer.style.borderRadius = '50%';
    flyer.style.width = '24px';
    flyer.style.height = '24px';
    flyer.style.zIndex = '50';
    flyer.style.pointerEvents = 'none';
    
    const startX = buttonRect.left + buttonRect.width / 2 - 12;
    const startY = buttonRect.top + buttonRect.height / 2 - 12;
    
    flyer.style.left = `${startX}px`;
    flyer.style.top = `${startY}px`;
    this.document.body.appendChild(flyer);

    const endX = cartIconRect.left + cartIconRect.width / 2 - 12;
    const endY = cartIconRect.top + cartIconRect.height / 2 - 12;

    const animation = flyer.animate([
        { transform: `translate(0, 0) scale(1)`, opacity: 1 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.2)`, opacity: 0.5 }
    ], {
        duration: 700,
        easing: 'ease-in-out'
    });

    animation.onfinish = () => {
        flyer.remove();
    };

    setTimeout(() => {
        this.productAdded.set(false);
    }, 2000);
  }

  removeFromCart(indexToRemove: number) {
    const itemToRemove = this.cartItems()[indexToRemove];
    if (!itemToRemove) return;

    // Restore the quantity in the main product list.
    this.products.update(products =>
      products.map(p =>
        p.id === itemToRemove.id ? { ...p, amount: p.amount + 1 } : p
      )
    );
    
    this.cartItems.update(items => items.filter((_, index) => index !== indexToRemove));
  }
  
  checkout() {
    if (this.isCheckoutDisabled()) {
      return;
    }

    const cart = this.cartItems();
    const totals = this.cartTotalsByCurrency();

    if (cart.length === 0) {
      return;
    }

    const productLines = cart.map(item => `- ${item.name} (${item.price})`).join('\n');
    const totalsString = totals.map(t => `${t.total.toFixed(2)} ${t.currency}`).join(' + ');
    const message = `مرحباً، أود طلب المنتجات التالية من متجركم:\n\n${productLines}\n\n*الإجمالي: ${totalsString}*`;
    
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = '967771018128';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  }

  private scrollToProductsAfterRender() {
    setTimeout(() => {
      const element = this.document.getElementById('products-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  private scrollToLastSelectedProductAfterRender() {
    const productId = this.lastSelectedProductId();
    if (productId === null) return;

    setTimeout(() => {
        const element = this.document.getElementById(`product-${productId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
  }
  
  setHoveredGroup(group: string | null) {
    this.hoveredGroup.set(group);
  }

  changeProductImage(index: number) {
    this.selectedProductImageIndex.set(index);
  }

  nextProductImage() {
    const product = this.selectedProduct();
    if (product && product.images.length > 1) {
      this.selectedProductImageIndex.update(index => (index + 1) % product.images.length);
    }
  }

  prevProductImage() {
    const product = this.selectedProduct();
    if (product && product.images.length > 1) {
      this.selectedProductImageIndex.update(index => (index - 1 + product.images.length) % product.images.length);
    }
  }

  getStarFillWidth(starIndex: number, rating: number): string {
    const fill = rating - (starIndex - 1);
    if (fill >= 1) {
      return '100%';
    } else if (fill > 0) {
      return `${fill * 100}%`;
    }
    return '0%';
  }
}
