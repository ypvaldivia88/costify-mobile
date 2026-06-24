import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Moon, Sun } from 'lucide-react-native';
import { ProductsView } from '@/components/products/ProductsView';
import { RawMaterialsManager } from '@/components/raw-materials/RawMaterialsManager';
import { SettingsView } from '@/components/settings/SettingsView';
import { WarehousesView } from '@/components/warehouses/WarehousesView';
import type { AppBackupV1 } from '@/backup/app-backup';
import { AppDataProvider, useAppData } from '@/context/AppDataContext';
import { DialogProvider } from '@/context/DialogContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ExchangeRatesProvider } from '@/hooks/use-exchange-rates-context';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { UnitCatalogProvider } from '@/hooks/use-unit-catalog';
import { NAV_BY_ID, NAV_ITEMS, type AppTab } from '@/navigation/tabs';

type RootTabParamList = Record<AppTab, undefined>;

const Tab = createBottomTabNavigator<RootTabParamList>();

function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={{ color: colors.muted, marginTop: 12 }}>Cargando tus datos…</Text>
    </View>
  );
}

function SettingsTab() {
  const data = useAppData();

  const handleBackupImported = (backup: AppBackupV1) => {
    data.reloadFromBackup(backup);
  };

  return (
    <SettingsView
      inventory={data.inventory}
      rawMaterials={data.materials}
      globalCosts={data.globalCosts}
      globalFund={data.globalFund}
      taxSettings={data.taxSettings}
      unitSettings={data.unitSettings}
      exchangeRateSettings={data.exchangeSettings}
      warehouses={data.warehouses}
      stockMovements={data.stockMovements}
      stockThresholds={data.stockThresholds}
      onSaveCosts={data.saveCosts}
      onUpdateGlobalFund={data.updateGlobalFund}
      onUpdateTaxSettings={data.updateTaxSettings}
      onSaveUnitSettings={data.saveUnitSettings}
      onResetUnitSettings={data.resetUnitSettings}
      onBackupImported={handleBackupImported}
    />
  );
}

function ExchangeRatesBridge({ children }: { children: ReactNode }) {
  const {
    snapshot,
    exchangeSettings,
    refreshing,
    error,
    refreshRates,
    updateSettings,
    markCostingRate,
  } = useExchangeRates();

  return (
    <ExchangeRatesProvider
      snapshot={snapshot}
      settings={exchangeSettings}
      refreshing={refreshing}
      error={error}
      refreshRates={refreshRates}
      updateSettings={updateSettings}
      markCostingRate={markCostingRate}
    >
      {children}
    </ExchangeRatesProvider>
  );
}

function AppHeader({ title }: { title: string }) {
  const { colors, scheme, toggleScheme } = useTheme();
  return (
    <SafeAreaView
      edges={['top']}
      style={{ backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }}
    >
      <View style={styles.header}>
        <View>
          <Text style={{ color: colors.brand, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>
            COSTIFY
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '800' }}>{title}</Text>
        </View>
        <Pressable
          onPress={toggleScheme}
          style={[styles.themeBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
        >
          {scheme === 'dark' ? (
            <Sun size={18} color={colors.foreground} />
          ) : (
            <Moon size={18} color={colors.foreground} />
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MainTabs({
  onRouteChange,
}: {
  onRouteChange: (route: AppTab) => void;
}) {
  const data = useAppData();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<AppTab>('products');
  const defaultWarehouse = data.getDefaultWarehouse();

  if (!data.hydrated) return <LoadingScreen />;

  const screenTitle = NAV_BY_ID[activeTab].title;

  return (
    <UnitCatalogProvider settings={data.unitSettings}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title={screenTitle} />
        <Tab.Navigator
          screenListeners={{
            state: (e) => {
              const route = e.data.state?.routes[e.data.state.index];
              if (route?.name) {
                const name = route.name as AppTab;
                setActiveTab(name);
                onRouteChange(name);
              }
            },
          }}
          screenOptions={({ route }) => {
            const meta = NAV_BY_ID[route.name as AppTab];
            const Icon = meta.icon;
            return {
              headerShown: false,
              tabBarActiveTintColor: colors.brand,
              tabBarInactiveTintColor: colors.muted,
              tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                height: 64,
                paddingBottom: 8,
                paddingTop: 8,
              },
              tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
              tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
            };
          }}
        >
          <Tab.Screen name="products" options={{ title: NAV_BY_ID.products.label }}>
            {() => (
              <ProductsView
                inventory={data.inventory}
                materials={data.materials}
                globalIndirectCosts={data.globalCosts}
                globalFund={data.globalFund}
                taxSettings={data.taxSettings}
                unitSettings={data.unitSettings}
                warehouses={data.warehouses}
                stockLevels={data.stockLevels}
                stockValuation={data.stockValuation}
                defaultWarehouseId={defaultWarehouse?.id}
                onSaveProduct={(product) => data.saveProduct(product)}
                onDeleteProduct={data.deleteProduct}
                onRecalculateAll={data.recalculateAll}
                onRegisterProductMovement={data.registerProductMovement}
                onRegisterProductInitialStock={data.registerProductInitialStock}
                onRegisterProduction={data.registerProduction}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="raw-materials" options={{ title: NAV_BY_ID['raw-materials'].label }}>
            {() => (
              <RawMaterialsManager
                materials={data.materials}
                onSave={data.saveMaterial}
                onDelete={data.deleteMaterial}
                onStockChange={data.updateStock}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="warehouses" options={{ title: NAV_BY_ID.warehouses.label }}>
            {() => (
              <WarehousesView
                warehouses={data.warehouses}
                stockMovements={data.stockMovements}
                stockThresholds={data.stockThresholds}
                stockLevels={data.stockLevels}
                stockAlerts={data.stockAlerts}
                stockValuation={data.stockValuation}
                materials={data.materials}
                products={data.inventory}
                onSaveWarehouse={data.saveWarehouse}
                onDeleteWarehouse={data.deleteWarehouse}
                onRegisterMovement={data.registerMovement}
                onSaveThreshold={data.saveStockThreshold}
                onDeleteThreshold={data.deleteStockThreshold}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="settings" options={{ title: NAV_BY_ID.settings.label }}>
            {() => <SettingsTab />}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </UnitCatalogProvider>
  );
}

function NavigationRoot() {
  const { scheme, colors } = useTheme();
  const [, setActiveTab] = useState<AppTab>('products');
  const navTheme =
    scheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: colors.background,
            card: colors.surface,
            border: colors.border,
            text: colors.foreground,
            primary: colors.brand,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: colors.background,
            card: colors.surface,
            border: colors.border,
            text: colors.foreground,
            primary: colors.brand,
          },
        };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <MainTabs onRouteChange={setActiveTab} />
    </NavigationContainer>
  );
}

export function AppNavigator() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <DialogProvider>
            <AppDataProvider>
              <ExchangeRatesBridge>
                <NavigationRoot />
              </ExchangeRatesBridge>
            </AppDataProvider>
          </DialogProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
