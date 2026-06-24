import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { PurchaseCurrency, RawMaterial, UnitType } from '@/domain/types';
import { calculateRawMaterialUnitCost } from '@/domain/calculations';
import {
  getPurchaseFormValuesFromMeta,
  getSuggestedRate,
  resolvePurchasePrice,
} from '@/domain/purchase-currency';
import type { PurchasePriceMode } from '@/ui/purchase-price';
import { formatCurrency } from '@/format/currency';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumericInput } from '@/components/ui/NumericInput';
import { PurchasePriceInput } from '@/components/ui/PurchasePriceInput';
import { Select } from '@/components/ui/Select';
import { useTheme } from '@/context/ThemeContext';
import { useExchangeRatesContext } from '@/hooks/use-exchange-rates-context';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';

interface RawMaterialFormProps {
  editingMaterial?: RawMaterial | null;
  onSave: (data: {
    name: string;
    purchasePrice: number;
    unitType: UnitType;
    packageQuantity: number;
    stockQuantity: number;
    purchaseMeta?: RawMaterial['purchaseMeta'];
  }) => void;
  onCancel?: () => void;
}

type FormErrors = Partial<
  Record<'name' | 'purchasePrice' | 'packageQuantity' | 'exchangeRate', string>
>;

const defaultForm = {
  name: '',
  purchasePrice: 0,
  purchasePriceMode: 'per-unit' as PurchasePriceMode,
  purchaseCurrency: 'CUP' as PurchaseCurrency,
  exchangeRate: 0,
  unitType: 'kg' as UnitType,
  packageQuantity: 1,
  stockQuantity: 0,
};

export function RawMaterialForm({ editingMaterial, onSave, onCancel }: RawMaterialFormProps) {
  const { colors } = useTheme();
  const unitCatalog = useUnitCatalog();
  const { snapshot, markCostingRate } = useExchangeRatesContext();
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (editingMaterial) {
      const fromMeta = getPurchaseFormValuesFromMeta(
        editingMaterial.purchasePrice,
        editingMaterial.packageQuantity,
        editingMaterial.purchaseMeta
      );
      setForm({
        name: editingMaterial.name,
        purchasePrice: fromMeta.value,
        purchasePriceMode: fromMeta.mode,
        purchaseCurrency: fromMeta.currency,
        exchangeRate: fromMeta.exchangeRate,
        unitType: editingMaterial.unitType,
        packageQuantity: editingMaterial.packageQuantity,
        stockQuantity: editingMaterial.stockQuantity,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [editingMaterial]);

  const unitLabel = unitCatalog.getShortLabel(form.unitType);
  const unitOptions = unitCatalog.getSelectableUnitIds();
  const suggestedRate = getSuggestedRate(snapshot, form.purchaseCurrency);

  const resolvedPreview = (() => {
    try {
      if (form.purchasePrice <= 0) return null;
      return resolvePurchasePrice(
        form.purchasePrice,
        form.purchasePriceMode,
        form.packageQuantity,
        form.purchaseCurrency,
        form.exchangeRate,
        snapshot
      );
    } catch {
      return null;
    }
  })();

  const totalPurchasePrice = resolvedPreview?.purchasePriceCup ?? 0;
  const unitCost = calculateRawMaterialUnitCost(totalPurchasePrice, form.packageQuantity);
  const unitPurchasePrice =
    form.packageQuantity > 0 ? totalPurchasePrice / form.packageQuantity : totalPurchasePrice;

  const handleCurrencyChange = (purchaseCurrency: PurchaseCurrency) => {
    const nextRate = getSuggestedRate(snapshot, purchaseCurrency);
    setForm((p) => ({
      ...p,
      purchaseCurrency,
      exchangeRate: purchaseCurrency === 'CUP' ? 0 : nextRate,
    }));
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = 'Ingresa el nombre de la materia prima';
    if (form.purchasePrice <= 0) {
      next.purchasePrice =
        form.purchasePriceMode === 'per-unit'
          ? 'Ingresa un precio por unidad válido'
          : 'Ingresa un precio del lote válido';
    }
    if (form.purchaseCurrency !== 'CUP' && form.exchangeRate <= 0) {
      next.exchangeRate = 'Indica la tasa real que pagaste';
    }
    if (form.packageQuantity <= 0) next.packageQuantity = 'Ingresa la cantidad comprada';
    return next;
  };

  const handleSubmit = () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const resolved = resolvePurchasePrice(
        form.purchasePrice,
        form.purchasePriceMode,
        form.packageQuantity,
        form.purchaseCurrency,
        form.exchangeRate,
        snapshot
      );

      if (snapshot?.rates.USD) {
        markCostingRate(snapshot.rates.USD);
      }

      onSave({
        name: form.name.trim(),
        purchasePrice: resolved.purchasePriceCup,
        unitType: form.unitType,
        packageQuantity: form.packageQuantity,
        stockQuantity: form.stockQuantity,
        purchaseMeta: resolved.purchaseMeta,
      });

      if (!editingMaterial) setForm(defaultForm);
      setErrors({});
    } catch (error) {
      setErrors({
        exchangeRate: error instanceof Error ? error.message : 'No se pudo convertir el precio',
      });
    }
  };

  return (
    <View style={styles.wrap}>
      <Input
        label="Nombre de la materia prima"
        placeholder="Ej. Harina de trigo"
        value={form.name}
        error={errors.name}
        onChangeText={(name) => {
          setForm((p) => ({ ...p, name }));
          if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
        }}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Select
            label="Tipo de unidad"
            value={form.unitType}
            onValueChange={(unitType) => setForm((p) => ({ ...p, unitType: unitType as UnitType }))}
          >
            {unitOptions.map((unit) => (
              <Picker.Item key={unit} label={unitCatalog.getLabel(unit)} value={unit} />
            ))}
          </Select>
        </View>
        <View style={styles.half}>
          <NumericInput
            label="Cantidad comprada"
            value={form.packageQuantity}
            error={errors.packageQuantity}
            onChange={(packageQuantity) => {
              setForm((p) => ({ ...p, packageQuantity }));
              if (errors.packageQuantity) setErrors((p) => ({ ...p, packageQuantity: undefined }));
            }}
            hint={`Total de ${unitCatalog.getLabel(form.unitType)} adquiridos`}
          />
        </View>
      </View>

      <PurchasePriceInput
        mode={form.purchasePriceMode}
        onModeChange={(purchasePriceMode) => setForm((p) => ({ ...p, purchasePriceMode }))}
        currency={form.purchaseCurrency}
        onCurrencyChange={handleCurrencyChange}
        exchangeRate={form.exchangeRate}
        onExchangeRateChange={(exchangeRate) => {
          setForm((p) => ({ ...p, exchangeRate }));
          if (errors.exchangeRate) setErrors((p) => ({ ...p, exchangeRate: undefined }));
        }}
        suggestedTrmiRate={suggestedRate}
        value={form.purchasePrice}
        onChange={(purchasePrice) => {
          setForm((p) => ({ ...p, purchasePrice }));
          if (errors.purchasePrice) setErrors((p) => ({ ...p, purchasePrice: undefined }));
        }}
        packageQuantity={form.packageQuantity}
        unitLabel={unitLabel}
        snapshot={snapshot}
        error={errors.purchasePrice}
        exchangeRateError={errors.exchangeRate}
        perUnitHint={`Costo por cada ${unitCatalog.getLabel(form.unitType)}`}
        perPackageHint={`Precio total por ${form.packageQuantity} ${unitLabel}`}
      />

      <NumericInput
        label={`Stock disponible (${unitLabel})`}
        value={form.stockQuantity}
        onChange={(stockQuantity) => setForm((p) => ({ ...p, stockQuantity }))}
      />

      {form.purchasePrice > 0 && form.packageQuantity > 0 && totalPurchasePrice > 0 ? (
        <View style={[styles.unitCostBox, { backgroundColor: colors.accentSurface, borderColor: colors.accentBorder }]}>
          <Text style={{ color: colors.brand, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
            Costo unitario
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: '900', marginTop: 4 }}>
            {formatCurrency(unitCost)}
            <Text style={{ color: colors.brand, fontSize: 14 }}> / {unitLabel}</Text>
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>
            Precio total de compra:{' '}
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>
              {formatCurrency(totalPurchasePrice)}
            </Text>
            {' '}
            ({form.packageQuantity} {unitLabel} × {formatCurrency(unitPurchasePrice)})
          </Text>
          {resolvedPreview?.purchaseMeta ? (
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
              Registrado: {resolvedPreview.purchaseMeta.originalAmount.toFixed(2)}{' '}
              {resolvedPreview.purchaseMeta.originalCurrency} ×{' '}
              {formatCurrency(resolvedPreview.purchaseMeta.exchangeRateUsed)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {editingMaterial && onCancel ? (
        <Button variant="outline" onPress={onCancel}>
          Cancelar edición
        </Button>
      ) : null}
      <Button variant="secondary" onPress={handleSubmit} disabled={!form.name || form.purchasePrice <= 0}>
        {editingMaterial ? 'Actualizar materia prima' : 'Guardar materia prima'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, minWidth: 0 },
  unitCostBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
});
