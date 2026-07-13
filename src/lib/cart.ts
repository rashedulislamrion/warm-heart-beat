import { useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  qty: number;
  restaurant_id: string;
  restaurant_name: string;
};

const KEY = "payra_cart_v1";
let items: CartItem[] = load();
const listeners = new Set<() => void>();

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function snapshot() {
  return items;
}
const EMPTY: CartItem[] = [];
function serverSnapshot() {
  return EMPTY;
}

export function useCart() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export const cart = {
  add(item: Omit<CartItem, "qty">, restaurantName: string) {
    // If different restaurant, clear cart
    if (items.length && items[0]!.restaurant_id !== item.restaurant_id) {
      items = [];
    }
    const existing = items.find((i) => i.id === item.id);
    if (existing) existing.qty += 1;
    else items = [...items, { ...item, qty: 1, restaurant_name: restaurantName }];
    persist();
  },
  inc(id: string) {
    items = items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
    persist();
  },
  dec(id: string) {
    items = items
      .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
      .filter((i) => i.qty > 0);
    persist();
  },
  remove(id: string) {
    items = items.filter((i) => i.id !== id);
    persist();
  },
  clear() {
    items = [];
    persist();
  },
  get() {
    return items;
  },
};

export function cartTotal(list: CartItem[]) {
  return list.reduce((s, i) => s + i.price * i.qty, 0);
}
export function cartCount(list: CartItem[]) {
  return list.reduce((s, i) => s + i.qty, 0);
}
