import { useState, useEffect } from 'react';

interface ModelBodyRow {
  model: string;
  body: string;
  count: number;
}

// Возвращает { 'X5': ['E70','F15','G05'], ... } из API
export function useModels(categoryId?: string): Record<string, string[]> {
  const [result, setResult] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryId) params.set('category', categoryId);
    fetch(`/api/models?${params}`)
      .then(r => r.json())
      .then((rows: ModelBodyRow[]) => {
        const map: Record<string, string[]> = {};
        for (const row of rows) {
          if (!map[row.model]) map[row.model] = [];
          if (!map[row.model].includes(row.body)) map[row.model].push(row.body);
        }
        setResult(map);
      })
      .catch(() => setResult({}));
  }, [categoryId]);

  return result;
}
