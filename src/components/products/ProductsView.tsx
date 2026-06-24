import { useState } from 'react';
import type {
  GlobalFundSettings,
  MovementType,
  ProductCalculation,
  RawMaterial,
  StockLevel,
  TaxSettings,
  UnitSettings,
  Warehouse,
} from '@/domain/types';
import { CostCalculator } from '@/components/calculator/CostCalculator';
import { InitialStockDialog } from '@/components/products/InitialStockDialog';
import { ProductDetailView } from '@/components/products/ProductDetailView';
import { ProductsList } from '@/components/products/ProductsList';

type ProductsMode = 'list' | 'create' | 'edit' | 'detail';

interface ProductsViewProps {
  inventory: ProductCalculation[];
  materials: RawMaterial[];
  globalIndirectCosts: ProductCalculation['indirectCosts'];
  globalFund: GlobalFundSettings;
  taxSettings: TaxSettings;
  unitSettings: UnitSettings;
  warehouses: Warehouse[];
  stockLevels: StockLevel[];
  stockValuation?: { rawMaterialsValue: number; productsValue: number; totalValue: number };
  defaultWarehouseId?: string;
  onSaveProduct: (product: ProductCalculation) => void;
  onDeleteProduct: (id: string) => void;
  onRecalculateAll: () => void;
  onRegisterProductMovement: (
    product: ProductCalculation,
    input: {
      type: MovementType;
      warehouseId: string;
      sourceWarehouseId?: string;
      quantity: number;
      note?: string;
    }
  ) => void;
  onRegisterProductInitialStock: (
    product: ProductCalculation,
    quantity: number,
    warehouseId: string
  ) => void;
  onRegisterProduction: (
    product: ProductCalculation,
    quantity: number,
    warehouseId: string,
    note?: string
  ) => void;
}

export function ProductsView({
  inventory,
  materials,
  globalIndirectCosts,
  globalFund,
  taxSettings,
  unitSettings,
  warehouses,
  stockLevels,
  stockValuation,
  defaultWarehouseId,
  onSaveProduct,
  onDeleteProduct,
  onRecalculateAll,
  onRegisterProductMovement,
  onRegisterProductInitialStock,
  onRegisterProduction,
}: ProductsViewProps) {
  const [mode, setMode] = useState<ProductsMode>('list');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductCalculation | null>(null);
  const [pendingStockProduct, setPendingStockProduct] = useState<ProductCalculation | null>(null);

  const selectedProduct = inventory.find((p) => p.id === selectedProductId) ?? null;

  const openDetail = (product: ProductCalculation) => {
    setSelectedProductId(product.id);
    setMode('detail');
  };

  const handleSave = (product: ProductCalculation) => {
    const isNew = !inventory.some((p) => p.id === product.id);
    onSaveProduct(product);

    if (isNew) {
      setPendingStockProduct(product);
      setSelectedProductId(product.id);
      setEditingProduct(null);
      setMode('detail');
    } else {
      setEditingProduct(null);
      setSelectedProductId(product.id);
      setMode('detail');
    }
  };

  const finishInitialStock = () => {
    if (pendingStockProduct) {
      setSelectedProductId(pendingStockProduct.id);
      setMode('detail');
    }
    setPendingStockProduct(null);
  };

  if (mode === 'create' || mode === 'edit') {
    return (
      <CostCalculator
        inventory={inventory}
        rawMaterials={materials}
        globalIndirectCosts={globalIndirectCosts}
        globalFund={globalFund}
        taxSettings={taxSettings}
        unitSettings={unitSettings}
        editingProduct={mode === 'edit' ? editingProduct : null}
        onSave={handleSave}
        onCancelEdit={() => {
          setEditingProduct(null);
          if (selectedProductId) {
            setMode('detail');
          } else {
            setMode('list');
          }
        }}
      />
    );
  }

  if (mode === 'detail' && selectedProduct) {
    return (
      <>
        <ProductDetailView
          product={selectedProduct}
          taxSettings={taxSettings}
          materials={materials}
          warehouses={warehouses}
          stockLevels={stockLevels}
          unitSettings={unitSettings}
          onBack={() => {
            setSelectedProductId(null);
            setMode('list');
          }}
          onEdit={() => {
            setEditingProduct(selectedProduct);
            setMode('edit');
          }}
          onRegisterMovement={(input) => onRegisterProductMovement(selectedProduct, input)}
          onRegisterProduction={(quantity, warehouseId, note) =>
            onRegisterProduction(selectedProduct, quantity, warehouseId, note)
          }
        />
        {pendingStockProduct?.id === selectedProduct.id ? (
          <InitialStockDialog
            product={pendingStockProduct}
            warehouses={warehouses}
            defaultWarehouseId={defaultWarehouseId}
            onConfirm={(quantity, warehouseId) => {
              onRegisterProductInitialStock(pendingStockProduct, quantity, warehouseId);
              finishInitialStock();
            }}
            onSkip={finishInitialStock}
          />
        ) : null}
      </>
    );
  }

  return (
    <ProductsList
      items={inventory}
      taxSettings={taxSettings}
      onDelete={onDeleteProduct}
      onSelect={openDetail}
      onEdit={(item) => {
        setEditingProduct(item);
        setMode('edit');
      }}
      onNew={() => {
        setEditingProduct(null);
        setSelectedProductId(null);
        setMode('create');
      }}
      onRecalculateAll={onRecalculateAll}
      stockValuation={stockValuation}
    />
  );
}
