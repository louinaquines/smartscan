import React, { useState } from 'react';
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
import { CURRENCIES, CurrencyId, LANGUAGES, LanguageId } from '../lib/currencies';
import { useTranslation } from '../lib/i18n';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  currencyId: CurrencyId;
  setCurrency: (id: CurrencyId) => void;
  languageId: LanguageId;
  setLanguage: (id: LanguageId) => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  activeCurrency: { id: string; symbol: string; flag: string; country: string };
}

export default function SettingsSheet({
  open,
  onClose,
  currencyId,
  setCurrency,
  languageId,
  setLanguage,
  themeMode,
  setThemeMode,
  activeCurrency,
}: SettingsSheetProps) {
  const darkMode = themeMode === 'dark';
  const theme = getTheme(darkMode);
  const { t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);

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
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]} />
          </View>

          <View style={styles.settingsHeader}>
            <View style={styles.headerTitles}>
              <Text style={[styles.settingsTitle, { color: theme.text }]}>{t('settings')}</Text>
              <Text style={[styles.settingsSubtitle, { color: theme.muted }]}>{t('makeCanyFit')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.surfaceBlue, borderColor: theme.glassBorder }]}
              onPress={onClose}
              activeOpacity={0.78}
            >
              <Ionicons name="close" size={20} color={theme.text} />
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
                <Ionicons name="cash-outline" size={18} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>{t('currency')}</Text>
                <Text style={[styles.settingValue, { color: theme.muted }]}>{activeCurrency.flag} {activeCurrency.id}</Text>
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
                        { backgroundColor: theme.surfaceBlue, borderColor: theme.glassBorder },
                        selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => setCurrency(currency.id)}
                      activeOpacity={0.78}>
                      <Text style={styles.currencyFlag}>{currency.flag}</Text>
                      <View>
                        <Text style={[styles.currencyCode, { color: selected ? activeTextColor : theme.text }]}>{currency.id}</Text>
                        <Text style={[styles.currencyCountry, { color: selected ? activeMutedColor : theme.muted }]} numberOfLines={1}>{currency.country}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="language-outline" size={18} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>{t('language')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.langDropdown, { backgroundColor: theme.surfaceBlue, borderColor: theme.glassBorder }]}
                onPress={() => setLangOpen(!langOpen)}
                activeOpacity={0.7}>
                <Text style={[styles.langDropdownText, { color: theme.text }]}>{t('lang' + languageId)}</Text>
                <Ionicons name={langOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.muted} />
              </TouchableOpacity>
              {langOpen && (
                <View style={[styles.langList, { backgroundColor: theme.surfaceBlue, borderColor: theme.glassBorder }]}>
                  {LANGUAGES.map((language) => {
                    const selected = language.id === languageId;
                    return (
                      <TouchableOpacity
                        key={language.id}
                        style={[
                          styles.langRow,
                          selected && styles.langRowActive,
                        ]}
                        onPress={() => { setLanguage(language.id); setLangOpen(false); }}
                        activeOpacity={0.7}>
                        <Text style={[
                          styles.langText,
                          { color: theme.text },
                          selected && styles.langTextActive,
                        ]}>{t('lang' + language.id)}</Text>
                        {selected && <Ionicons name="checkmark" size={18} color={darkMode ? '#111' : '#FFF'} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="contrast-outline" size={18} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>{t('appearance')}</Text>
              </View>
              <View style={[styles.themeSwitch, { backgroundColor: theme.surfaceBlue, borderColor: theme.glassBorder }]}>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    themeMode === 'light' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setThemeMode('light')}
                  activeOpacity={0.82}>
                  <Ionicons name="sunny-outline" size={19} color={themeMode === 'light' ? (darkMode ? '#111' : '#FFF') : theme.text} />
                  <Text style={[styles.themeOptionText, { color: theme.text }, themeMode === 'light' && { color: darkMode ? '#111' : '#FFF' }]}>{t('light')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    themeMode === 'dark' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setThemeMode('dark')}
                  activeOpacity={0.82}>
                  <Ionicons name="moon-outline" size={18} color={themeMode === 'dark' ? '#111' : theme.text} />
                  <Text style={[styles.themeOptionText, { color: theme.text }, themeMode === 'dark' && { color: '#111' }]}>{t('dark')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.privacyBadge, { backgroundColor: theme.surfaceBlue, borderColor: theme.glassBorder }]}>
              <View style={[styles.privacyIcon, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.privacyText, { color: theme.text }]}>{t('privacyNotice')}</Text>
            </View>

            <View style={[styles.versionCard, { backgroundColor: theme.surfaceBlue, borderColor: theme.glassBorder }]}>
              <Text style={[styles.versionTitle, { color: theme.text }]}>{t('version')}</Text>
              <Text style={[styles.versionText, { color: theme.muted }]}>{t('builtFor')}</Text>
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
  langDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  langDropdownText: {
    fontSize: 15,
    fontWeight: '800',
  },
  langList: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  langText: {
    fontSize: 15,
    fontWeight: '800',
  },
  langTextActive: {
    fontWeight: '900',
  },
  langRowActive: {
    backgroundColor: 'rgba(0,0,0,0.06)',
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
