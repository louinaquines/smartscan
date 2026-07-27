import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, CurrencyId, CurrencyOption, getCurrency, LANGUAGES, LanguageId, getLanguage } from '../lib/currencies';
import { colors, shadow } from '../lib/theme';
import { useTranslation, getNativeLanguageName } from '../lib/i18n';

type OnboardingPayload = {
  name: string;
  country: string;
  currencyId: CurrencyId;
  languageId: LanguageId;
};

type OnboardingProps = {
  onDone: (payload: OnboardingPayload) => void | Promise<void>;
};

const STEPS = ['Name', 'Country', 'Currency', 'Language'];

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={styles.progressRow}>
      {STEPS.map((label, index) => {
        const active = index <= step;
        return (
          <View key={label} style={[styles.progressDot, active && styles.progressDotActive]} />
        );
      })}
    </View>
  );
}

function CurrencyCard({ currency }: { currency: CurrencyOption }) {
  return (
    <View style={styles.selectedCurrencyCard}>
      <Text style={styles.currencyFlag}>{currency.flag}</Text>
      <View style={styles.currencyCopy}>
        <Text style={styles.currencyName}>{currency.name}</Text>
        <Text style={styles.currencyMeta}>{currency.symbol} · {currency.id}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
    </View>
  );
}

export default function Onboarding({ onDone }: OnboardingProps) {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(CURRENCIES[0].country);
  const [currencyId, setCurrencyId] = useState<CurrencyId>(CURRENCIES[0].id);
  const [languageId, setLanguageId] = useState<LanguageId>('USD');

  const selectedCurrency = getCurrency(currencyId);
  const selectedLanguage = getLanguage(languageId);
  const cleanName = name.trim();

  const selectCountry = (currency: CurrencyOption) => {
    setSelectedCountry(currency.country);
    setCurrencyId(currency.id);
    setLanguageId(currency.id as LanguageId);
    setCountryOpen(false);
  };

  const canContinue =
    step === 0 ? cleanName.length > 0 :
    step === 1 ? selectedCountry.length > 0 :
    true;

  const goNext = () => {
    if (!canContinue) return;
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setSubmitting(true);
    onDone({ name: cleanName, country: selectedCountry, currencyId, languageId });
  };

  if (submitting) {
    return (
      <View style={styles.introScreen}>
        <View style={styles.logoGlow}>
          <Image source={require('../assets/cany-logo2.png')} style={styles.smallLogo} />
        </View>
        <Text style={styles.setupTitle}>Setting up your account...</Text>
      </View>
    );
  }

  if (!started) {
    return (
      <View style={styles.introScreen}>
        <View style={styles.logoGlow}>
          <Image source={require('../assets/waving.jpg')} style={styles.mascot} resizeMode="contain" />
        </View>
        <View style={styles.introTextBlock}>
          <Text style={styles.brand}>Cany</Text>
          <Text style={styles.introCopy}>Smart, real-time grocery budget tracking right at the shelf.</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => setStarted(true)}>
          <Text style={styles.primaryButtonText}>{t('getStarted')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        <ProgressDots step={step} />

        <View style={styles.setupHeader}>
          <Image source={require('../assets/cany-logo2.png')} style={styles.smallLogo} />
          <Text style={styles.setupTitle}>{t('quickSetup')}</Text>
          <Text style={styles.setupSubtitle}>{t(STEPS[step].toLowerCase())} · {t('stepOf', { step: step + 1, total: STEPS.length })}</Text>
        </View>

        <View style={styles.panel}>
          {step === 0 && (
            <View>
              <Text style={styles.question}>{t('whatsYourName')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('yourName')}
                placeholderTextColor={colors.soft}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={goNext}
              />
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.question}>{t('whereShopping')}</Text>
              <Pressable style={styles.dropdownHeader} onPress={() => setCountryOpen((o) => !o)}>
                <View style={styles.dropdownHeaderLeft}>
                  <Text style={styles.countryFlag}>{selectedCurrency.flag}</Text>
                  <Text style={styles.dropdownSelectedText}>{selectedCountry}</Text>
                </View>
                <Ionicons name={countryOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
              </Pressable>
              {countryOpen && (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {CURRENCIES.map((currency) => {
                    const selected = currency.country === selectedCountry;
                    return (
                      <Pressable
                        key={currency.id}
                        style={[styles.dropdownRow, selected && styles.dropdownRowSelected]}
                        onPress={() => selectCountry(currency)}
                      >
                        <Text style={styles.countryFlag}>{currency.flag}</Text>
                        <View style={styles.countryCopy}>
                          <Text style={styles.countryName}>{currency.country}</Text>
                          <Text style={styles.countryCurrency}>{currency.name}</Text>
                        </View>
                        {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.question}>{t('preferredCurrency')}</Text>
              <Text style={styles.helper}>{t('suggestedFrom', { country: selectedCountry })}</Text>
              <CurrencyCard currency={selectedCurrency} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyRail}>
                {CURRENCIES.map((currency) => {
                  const selected = currency.id === currencyId;
                  return (
                    <Pressable
                      key={currency.id}
                      style={[styles.currencyChip, selected && styles.currencyChipSelected]}
                      onPress={() => setCurrencyId(currency.id)}
                    >
                      <Text style={styles.currencyChipFlag}>{currency.flag}</Text>
                      <Text style={[styles.currencyChipText, selected && styles.currencyChipTextSelected]}>{currency.id}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.question}>{t('preferredLanguage')}</Text>
              <Text style={styles.helper}>{t('selectLanguage')}</Text>
              <Pressable style={styles.dropdownHeader} onPress={() => setLangOpen((o) => !o)}>
                <Text style={styles.dropdownSelectedText}>{getNativeLanguageName(languageId)}</Text>
                <Ionicons name={langOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
              </Pressable>
              {langOpen && (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {LANGUAGES.map((language) => {
                    const selected = language.id === languageId;
                    return (
                      <Pressable
                        key={language.id}
                        style={[styles.dropdownRow, selected && styles.dropdownRowSelected]}
                        onPress={() => { setLanguageId(language.id); setLangOpen(false); }}
                      >
                        <Text style={[styles.langDropdownText, selected && styles.langDropdownTextSelected]}>
                          {getNativeLanguageName(language.id)}
                        </Text>
                        {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        <View style={[styles.actionRow, step === 0 && styles.actionRowCentered]}>
          {step > 0 && (
            <Pressable style={styles.backButton} onPress={() => setStep((current) => current - 1)}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.finishButton, step > 0 && styles.finishButtonFlex, !canContinue && styles.disabledButton, pressed && canContinue && styles.pressed]}
            onPress={goNext}
          >
            <Text style={styles.finishButtonText}>{step === STEPS.length - 1 ? t('finishShopping') : t('continue')}</Text>
            <Ionicons name={step === STEPS.length - 1 ? 'checkmark' : 'arrow-forward'} size={18} color="#FFF" />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  introScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  logoGlow: {
    width: 232,
    height: 232,
    borderRadius: 58,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow,
  },
  mascot: { width: 190, height: 190 },
  introTextBlock: { alignItems: 'center', marginTop: 34, marginBottom: 30 },
  brand: { color: colors.text, fontSize: 42, fontWeight: '900' },
  introCopy: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 330,
  },
  primaryButton: {
    width: '100%',
    maxWidth: 360,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    ...shadow,
  },
  primaryButtonText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  setupContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 58, paddingBottom: 28 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 30 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted },
  progressDotActive: { width: 26, backgroundColor: colors.primary },
  setupHeader: { alignItems: 'center', marginBottom: 24 },
  smallLogo: { width: 74, height: 74, borderRadius: 20, marginBottom: 12 },
  setupTitle: { color: colors.text, fontSize: 30, fontWeight: '900' },
  setupSubtitle: { color: colors.muted, fontSize: 13, fontWeight: '800', marginTop: 5, textTransform: 'uppercase' },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow,
  },
  question: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 14 },
  helper: { color: colors.muted, fontSize: 14, fontWeight: '700', marginTop: -6, marginBottom: 14 },
  input: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  countryFlag: { fontSize: 22 },
  countryCopy: { flex: 1, minWidth: 0 },
  countryName: { color: colors.text, fontSize: 15, fontWeight: '900' },
  countryCurrency: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  dropdownHeader: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownSelectedText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    maxHeight: 260,
  },
  dropdownRow: {
    minHeight: 52,
    backgroundColor: colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownRowSelected: { backgroundColor: colors.primarySoft },
  selectedCurrencyCard: {
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  currencyFlag: { fontSize: 30 },
  currencyCopy: { flex: 1, minWidth: 0 },
  currencyName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  currencyMeta: { color: colors.muted, fontSize: 13, fontWeight: '800', marginTop: 3 },
  langDropdownText: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  langDropdownTextSelected: { color: colors.primary, fontWeight: '900' },
  currencyRail: { flexDirection: 'row', gap: 8, paddingTop: 14, paddingRight: 8 },
  currencyChip: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  currencyChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  currencyChipFlag: { fontSize: 16 },
  currencyChipText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  currencyChipTextSelected: { color: '#FFF' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  actionRowCentered: { justifyContent: 'center' },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  finishButton: {
    minHeight: 56,
    minWidth: 200,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  finishButtonFlex: { flex: 1, minWidth: 0 },
  finishButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
});
