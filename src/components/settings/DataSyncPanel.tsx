import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type {
  GlobalFundSettings,
  IndirectCost,
  ProductCalculation,
  RawMaterial,
  StockMovement,
  StockThreshold,
  TaxSettings,
  UnitSettings,
  Warehouse,
} from '@/domain/types';
import type { ExchangeRateSettings } from '@/domain/exchange-rates';
import {
  applyBackupToStorage,
  buildBackupFileContent,
  createBackupPayload,
  parseBackupFileContent,
  parseBackupPayload,
  type AppBackupV1,
} from '@/backup/app-backup';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppData } from '@/context/AppDataContext';
import { useConfirm } from '@/context/DialogContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Database } from 'lucide-react-native';

interface DataSyncPanelProps {
  inventory: ProductCalculation[];
  rawMaterials: RawMaterial[];
  globalCosts: IndirectCost[];
  globalFund: GlobalFundSettings;
  taxSettings: TaxSettings;
  unitSettings: UnitSettings;
  exchangeRateSettings: ExchangeRateSettings;
  warehouses: Warehouse[];
  stockMovements: StockMovement[];
  stockThresholds: StockThreshold[];
  onBackupImported?: (backup: AppBackupV1) => void;
}

type SyncTab = 'export' | 'import';

export function DataSyncPanel({
  inventory,
  rawMaterials,
  globalCosts,
  globalFund,
  taxSettings,
  unitSettings,
  exchangeRateSettings,
  warehouses,
  stockMovements,
  stockThresholds,
  onBackupImported,
}: DataSyncPanelProps) {
  const { colors } = useTheme();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { reloadFromBackup } = useAppData();
  const [tab, setTab] = useState<SyncTab>('export');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const payload = useMemo(
    () =>
      createBackupPayload({
        inventory,
        rawMaterials,
        globalCosts,
        globalFund,
        taxSettings,
        unitSettings,
        exchangeRateSettings,
        warehouses,
        stockMovements,
        stockThresholds,
      }),
    [
      inventory,
      rawMaterials,
      globalCosts,
      globalFund,
      taxSettings,
      unitSettings,
      exchangeRateSettings,
      warehouses,
      stockMovements,
      stockThresholds,
    ]
  );

  const summary = `${inventory.length} producto(s), ${rawMaterials.length} materia(s) prima(s), ${warehouses.length} almacén(es)`;

  const copyPayload = async () => {
    await Clipboard.setStringAsync(payload);
    showToast('Código copiado al portapapeles', 'success');
  };

  const shareBackupFile = async () => {
    const content = buildBackupFileContent(payload);
    const uri = `${FileSystem.cacheDirectory}costify-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    await FileSystem.writeAsStringAsync(uri, content);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/json' });
    } else {
      showToast('Compartir no disponible en este dispositivo', 'error');
    }
  };

  const importBackup = async () => {
    try {
      const backup = parseBackupPayload(importText);
      const confirmed = await confirm({
        title: 'Importar respaldo',
        message:
          `Se importarán ${backup.inventory.length} productos y ${backup.rawMaterials.length} materias primas.\n\n` +
          'Los datos actuales de este dispositivo serán reemplazados.',
        confirmLabel: 'Importar',
        variant: 'danger',
      });
      if (!confirmed) return;

      await applyBackupToStorage(backup);
      reloadFromBackup({
        inventory: backup.inventory,
        rawMaterials: backup.rawMaterials,
        globalCosts: backup.globalCosts,
        globalFund: backup.globalFund,
        taxSettings: backup.taxSettings,
      });
      onBackupImported?.(backup);
      setImportText('');
      setImportError(null);
      showToast('Respaldo importado correctamente', 'success');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Error al importar');
    }
  };

  const pickBackupFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const payloadFromFile = parseBackupFileContent(text);
      setImportText(payloadFromFile);
      setImportError(null);
      showToast('Archivo cargado. Revisa y confirma la importación.', 'info');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No se pudo leer el archivo');
    }
  };

  return (
    <Card>
      <SectionHeader
        icon={Database}
        title="Respaldo manual"
        description="Copia el código de respaldo o comparte el archivo en otro dispositivo"
      />

      <View style={styles.tabs}>
        {(['export', 'import'] as SyncTab[]).map((id) => (
          <Button
            key={id}
            variant={tab === id ? 'secondary' : 'outline'}
            size="sm"
            onPress={() => setTab(id)}
            style={styles.tab}
          >
            {id === 'export' ? 'Exportar' : 'Importar'}
          </Button>
        ))}
      </View>

      {tab === 'export' ? (
        <View style={styles.section}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Respaldo actual: <Text style={{ color: colors.foreground, fontWeight: '700' }}>{summary}</Text>
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Comparte este código o archivo para restaurar tus datos en otro dispositivo.
          </Text>
          <TextInput
            value={payload}
            editable={false}
            multiline
            style={[styles.code, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
          />
          <Button onPress={copyPayload}>Copiar código</Button>
          <Button variant="outline" onPress={shareBackupFile}>
            Compartir archivo JSON
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.section}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Pega un código de respaldo o selecciona un archivo exportado previamente.
          </Text>
          <Button variant="outline" onPress={pickBackupFile}>
            Seleccionar archivo
          </Button>
          <TextInput
            value={importText}
            onChangeText={(text) => {
              setImportText(text);
              setImportError(null);
            }}
            placeholder="Pega aquí el código costify1:..."
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.code, { color: colors.foreground, borderColor: colors.border }]}
          />
          {importError ? <Text style={{ color: colors.danger, fontSize: 12 }}>{importError}</Text> : null}
          <Button variant="danger" onPress={importBackup} disabled={!importText.trim()}>
            Importar y reemplazar datos
          </Button>
        </ScrollView>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1 },
  section: { gap: 10 },
  code: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    fontSize: 12,
    textAlignVertical: 'top',
  },
});
