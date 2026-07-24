import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../lib/theme';
import { CURRENCIES, CurrencyId } from '../lib/currencies';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  currencyId: CurrencyId;
  setCurrency: (id: CurrencyId) => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  activeCurrency: { id: string; symbol: string; flag: string; country: string };
}

export default function SettingsSheet({
  open,
  onClose,
  currencyId,
  setCurrency,
  themeMode,
  setThemeMode,
  activeCurrency,
}: SettingsSheetProps) {
  const darkMode = themeMode === 'dark';
  const t = getTheme(darkMode);

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Sheet */}
        <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]} />
          </View>

          <View style={styles.settingsHeader}>
            <View style={styles.headerTitles}>
              <Text style={[styles.settingsTitle, { color: t.text }]}>Settings</Text>
              <Text style={[styles.settingsSubtitle, { color: t.muted }]}>Make Cany fit your shopping style.</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: t.surfaceBlue, borderColor: t.glassBorder }]}
              onPress={onClose}
              activeOpacity={0.78}
            >
              <Ionicons name="close" size={20} color={t.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.settingsSection}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="cash-outline" size={18} color={t.primary} />
                <Text style={[styles.settingLabel, { color: t.text }]}>Currency</Text>
                <Text style={[styles.settingValue, { color: t.muted }]}>{activeCurrency.flag} {activeCurrency.id}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyRail}>
                {CURRENCIES.map((currency) => {
                  const selected = currency.id === currencyId;
                  const activeTextColor = darkMode ? '#111111' : '#FFFFFF';
                  const activeMutedColor = darkMode ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)';
                  return (
                    <TouchableOpacity
                      key={currency.id}
                      style={[
                        styles.currencyChip,
                        { backgroundColor: t.surfaceBlue, borderColor: t.glassBorder },
                        selected && { backgroundColor: t.primary, borderColor: t.primary },
                      ]}
                      onPress={() => setCurrency(currency.id)}
                      activeOpacity={0.78}>
                      <Text style={styles.currencyFlag}>{currency.flag}</Text>
                      <View>
                        <Text style={[styles.currencyCode, { color: selected ? activeTextColor : t.text }]}>{currency.id}</Text>
                        <Text style={[styles.currencyCountry, { color: selected ? activeMutedColor : t.muted }]} numberOfLines={1}>{currency.country}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="contrast-outline" size={18} color={t.primary} />
                <Text style={[styles.settingLabel, { color: t.text }]}>Appearance</Text>
              </View>
              <View style={[styles.themeSwitch, { backgroundColor: t.surfaceBlue, borderColor: t.glassBorder }]}>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    themeMode === 'light' && { backgroundColor: t.primary },
                  ]}
                  onPress={() => setThemeMode('light')}
                  activeOpacity={0.82}>
                  <Ionicons name="sunny-outline" size={19} color={themeMode === 'light' ? (darkMode ? '#111' : '#FFF') : t.text} />
                  <Text style={[styles.themeOptionText, { color: t.text }, themeMode === 'light' && { color: darkMode ? '#111' : '#FFF' }]}>Light</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    themeMode === 'dark' && { backgroundColor: t.primary },
                  ]}
                  onPress={() => setThemeMode('dark')}
                  activeOpacity={0.82}>
                  <Ionicons name="moon-outline" size={18} color={themeMode === 'dark' ? '#111' : t.text} />
                  <Text style={[styles.themeOptionText, { color: t.text }, themeMode === 'dark' && { color: '#111' }]}>Dark</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.privacyBadge, { backgroundColor: t.surfaceBlue, borderColor: t.glassBorder }]}>
              <View style={[styles.privacyIcon, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color={t.primary} />
              </View>
              <Text style={[styles.privacyText, { color: t.text }]}>Your shopping lists, budget, and history stay safely on your device. Cany never tracks or uploads your data.</Text>
            </View>

            <View style={[styles.versionCard, { backgroundColor: t.surfaceBlue, borderColor: t.glassBorder }]}>
              <Text style={[styles.versionTitle, { color: t.text }]}>Cany v1.0.0</Text>
              <Text style={[styles.versionText, { color: t.muted }]}>Built for smart offline shopping</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '86%',
    borderWidth: 1,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 16,
  },
  headerTitles: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  settingsSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sheetScroll: {
    maxHeight: 520,
  },
  sheetScrollContent: {
    paddingBottom: 20,
  },
  settingsSection: {
    marginBottom: 18,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  settingValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  currencyRail: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  currencyChip: {
    minWidth: 112,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  currencyCode: {
    fontSize: 13,
    fontWeight: '900',
  },
  currencyCodeActive: {
    color: '#111',
  },
  currencyCountry: {
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 64,
    marginTop: 2,
  },
  currencyFlag: {
    fontSize: 20,
  },
  themeSwitch: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 5,
    borderWidth: 1,
  },
  themeOption: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '900',
  },
  privacyBadge: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  privacyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  versionCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  versionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
});
