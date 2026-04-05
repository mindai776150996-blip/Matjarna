import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Product } from '../types';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);
  private productsSubject = new BehaviorSubject<Product[]>([]);
  products$: Observable<Product[]> = this.productsSubject.asObservable();
  
  private errorSubject = new BehaviorSubject<string | null>(null);
  errors$: Observable<string | null> = this.errorSubject.asObservable();

  private readonly API_URL = 'https://script.google.com/macros/s/AKfycbwpkSc7L2Ay5XPG3hfoSpR4kqjQlCxHEJohjUDpRlvFABkFQNws7kttATUaVpV8WVnm/exec';

  constructor() {
    this.loadData();
  }

  refresh(): void {
    this.loadData();
  }

  private loadData(): void {
    this.http.get<any[]>(this.API_URL).pipe(
      map(data => {
        // Filter out empty rows
        const validData = data.filter(item => item.name && item.name.trim() !== '');
        
        return validData.map((item, index) => {
          // Parse images
          const images = item.image ? item.image.split('\n').filter((url: string) => url.trim() !== '') : [];
          const image_sections = item.image_section ? item.image_section.split('\n').filter((url: string) => url.trim() !== '') : [];
          
          return {
            id: item.id ? Number(item.id) : index + 1,
            name: item.name || '',
            images: images,
            description: item.description || '',
            group: item.group || '',
            section: item.section || '',
            image_sections: image_sections,
            price: item.price || '',
            star: Number(item.star) || 0,
            amount: Number(item.amount) || 0
          } as Product;
        });
      }),
      tap(products => {
        this.productsSubject.next(products);
        this.errorSubject.next(null);
      }),
      catchError(error => {
        console.error('Error fetching products:', error);
        this.errorSubject.next('حدث خطأ أثناء جلب المنتجات. يرجى المحاولة مرة أخرى.');
        return of([]);
      })
    ).subscribe();
  }

  updateProductAmount(productId: number, newAmount: number): Observable<any> {
    const currentProducts = this.productsSubject.value;
    const updatedProducts = currentProducts.map(p => 
      p.id === productId ? { ...p, amount: newAmount } : p
    );
    this.productsSubject.next(updatedProducts);
    return of({ success: true });
  }
}
