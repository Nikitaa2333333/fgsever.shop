import { useState, useEffect } from 'react';
import type { CatalogProduct } from '../data';

interface UseProductsResult {
  products: CatalogProduct[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useProducts(category?: string, sort?: string, query?: string): UseProductsResult {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    if (query) params.set('q', query);

    fetch(`/api/products?${params}`)
      .then(r => r.json())
      .then(data => {
        setProducts(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch(() => {
        import('../data').then(m => {
          let filtered = category
            ? m.allProducts.filter(p => p.categoryId === category && p.imageUrl)
            : m.allProducts.filter(p => p.imageUrl);
          if (query) {
            const lower = query.toLowerCase();
            filtered = filtered.filter(p =>
              p.title.toLowerCase().includes(lower) ||
              (p.sku && p.sku.toLowerCase().includes(lower)) ||
              (p.oem && p.oem.toLowerCase().includes(lower))
            );
          }
          setProducts(filtered);
          setTotal(filtered.length);
        });
      })
      .finally(() => setLoading(false));
  }, [category, sort, query]);

  return { products, total, loading, error };
}
