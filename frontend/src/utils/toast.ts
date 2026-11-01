export type ToastKind = 'success' | 'error';
export interface OperationToast { id: number; kind: ToastKind; title: string; message: string }
let nextId = 0;
let items: OperationToast[] = [];
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());
export const toastStore = {
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => items,
  dismiss: (id: number) => { items = items.filter((item) => item.id !== id); publish(); },
};
export const showToast = (kind: ToastKind, message: string, title = kind === 'success' ? 'Thành công' : 'Không thể thực hiện') => {
  items = [...items, { id: ++nextId, kind, title, message }];
  publish();
};
