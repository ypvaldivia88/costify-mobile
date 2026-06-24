import type { LucideIcon } from 'lucide-react-native';
import { Boxes, Package, Settings, Warehouse } from 'lucide-react-native';

export type AppTab = 'products' | 'raw-materials' | 'warehouses' | 'settings';

export interface NavItem {
  id: AppTab;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'products',
    label: 'Productos',
    title: 'Productos',
    description: 'Fichas de costo, precios sugeridos y stock por almacén',
    icon: Package,
  },
  {
    id: 'raw-materials',
    label: 'Insumos',
    title: 'Materias primas',
    description: 'Registra insumos y controla el stock disponible',
    icon: Boxes,
  },
  {
    id: 'warehouses',
    label: 'Almacén',
    title: 'Almacenes',
    description: 'Stock actual, movimientos y alertas de inventario',
    icon: Warehouse,
  },
  {
    id: 'settings',
    label: 'Ajustes',
    title: 'Ajustes',
    description: 'Impuestos, gastos, unidades de medida y respaldo',
    icon: Settings,
  },
];

export const NAV_BY_ID = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item])) as Record<
  AppTab,
  NavItem
>;
