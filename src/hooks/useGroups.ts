import { useState, useEffect } from 'react';

interface GroupItem {
  subCategory: string;
  count: number;
}

export function useGroups(categoryId: string): GroupItem[] {
  const [groups, setGroups] = useState<GroupItem[]>([]);

  useEffect(() => {
    if (!categoryId) return;
    fetch(`/api/groups?category=${categoryId}`)
      .then(r => r.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]));
  }, [categoryId]);

  return groups;
}
