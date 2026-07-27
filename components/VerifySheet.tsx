import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BUDGET_CATEGORIES, BudgetCategoryId, DEFAULT_CATEGORY } from '../lib/budgetCategories';
import { colors } from '../lib/theme';
import { OcrChoice, OcrPriceChoice } from '../lib/ocrParser';
import { useTranslation } from '../lib/i18n';
import { formatMoney } from '../lib/format';
import { getCurrency } from '../lib/currencies';
import { useCartStore } from '../store/useCartStore';
import { PreviousPrice, PriceComparison } from '../lib/priceHistory';
import { WeightUnit, calculateTotalPriceByWeight, calculatePricePerKg, formatWeightBadge } from '../lib/weightCalculator';

interface VerifySheetProps {
  open: boolean;
  name: string;
  price: number;
  brand?: string;
  initialCategory?: BudgetCategoryId;
  previousPrice?: PreviousPrice | null;
  nameChoices?: OcrChoice[];
  priceChoices?: OcrPriceChoice[];
  onConfirm: (name: string, price: number, quantity: number, category: BudgetCategoryId, weight?: number, unit?: WeightUnit, pricePerKg?: number) => void;
  onCancel: () => void;
}

export default function VerifySheet({
  open,
  name,
  price,
  brand,
  initialCategory = DEFAULT_CATEGORY,
  previousPrice,
  nameChoices = [],
  priceChoices = [],
  onConfirm,
  onCancel,
}: VerifySheetProps) {
  const { t } = useTranslation();
  const currencyId = useCartStore((s) => s.currencyId);
  const currencySymbol = getCurrency(currencyId).symbol;
  const [editName, setEditName] = useState(name);
  const [editPrice, setEditPrice] = useState(price.toFixed(2));
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState<BudgetCategoryId>(initialCategory);
  
  // Weight & Per-Kilo State
  const [calcMode, setCalcMode] = useState<'fixed' | 'weight'>('fixed');
  const [inputPricePerKg, setInputPricePerKg] = useState('');
  const [inputWeight, setInputWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('g');

  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmedPrice, setConfirmedPrice] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0));
  const pressAnim = useRef(new Animated.Value(1));
  const successScale = useRef(new Animated.Value(0));
  const successOpacity = useRef(new Animated.Value(0));
  const checkScale = useRef(new Animated.Value(0));
  const textOpacity = useRef(new Animated.Value(0));

  // Sync internal state when the modal opens or props change
  useEffect(() => {
    if (open) {
      setEditName(name);
      setEditPrice(price.toFixed(2));
      setQuantity(1);
      setCategory(initialCategory);
      setCalcMode('fixed');
      setInputPricePerKg('');
      setInputWeight('');
      setWeightUnit('g');
    }
  }, [open, name, price, initialCategory]);

  useEffect(() => {
    if (open) {
      Animated.timing(scaleAnim.current, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      scaleAnim.current.setValue(0);
    }
  }, [open, scaleAnim]);

  // Recalculate total price when in weight mode
  useEffect(() => {
    if (calcMode === 'weight') {
      const pkg = parseFloat(inputPricePerKg.replace(',', '.')) || 0;
      const w = parseFloat(inputWeight.replace(',', '.')) || 0;
      if (pkg > 0 && w > 0) {
        const total = calculateTotalPriceByWeight(pkg, w, weightUnit);
        setEditPrice(total.toFixed(2));
      }
    }
  }, [calcMode, inputPricePerKg, inputWeight, weightUnit]);

  const handleConfirm = () => {
    Animated.sequence([
      Animated.timing(pressAnim.current, {
        toValue: 0.9,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(pressAnim.current, {
        toValue: 1,
        duration: 100,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      const sanitizedPrice = editPrice.replace(',', '.');
      const updatedPrice = parseFloat(sanitizedPrice) || 0;
      const totalPrice = updatedPrice * quantity;
      setConfirmedPrice(totalPrice);
      setShowSuccess(true);

      const parsedWeight = parseFloat(inputWeight.replace(',', '.')) || undefined;
      const parsedPkg = parseFloat(inputPricePerKg.replace(',', '.')) || (calcMode === 'fixed' && parsedWeight ? calculatePricePerKg(updatedPrice, parsedWeight, weightUnit) : undefined);

      // Reset animation values
      successScale.current.setValue(0);
      successOpacity.current.setValue(0);
      checkScale.current.setValue(0);
      textOpacity.current.setValue(0);

      // Play success animation sequence
      Animated.parallel([
        Animated.timing(successOpacity.current, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(successScale.current, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.parallel([
          Animated.spring(checkScale.current, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity.current, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto-dismiss after 1.5 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onConfirm(
          editName || 'Product',
          updatedPrice,
          quantity,
          category,
          calcMode === 'weight' ? parsedWeight : undefined,
          calcMode === 'weight' ? weightUnit : undefined,
          parsedPkg
        );
      }, 1500);
    });
  };

  const incrementQuantity = () => setQuantity((q) => q + 1);
  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
  const livePrice = parseFloat(editPrice.replace(',', '.') || '0') || 0;
  const priceComparison: PriceComparison | null = previousPrice && livePrice > 0
    ? {
      previousPrice: previousPrice.previousPrice,
      previousDate: previousPrice.previousDate,
      currentPrice: livePrice,
      difference: livePrice - previousPrice.previousPrice,
      direction: livePrice - previousPrice.previousPrice > 0 ? 'higher' : livePrice - previousPrice.previousPrice < 0 ? 'lower' : 'same',
    }
    : null;

  const currentPkg = calcMode === 'weight'
    ? parseFloat(inputPricePerKg.replace(',', '.')) || 0
    : (parseFloat(inputWeight.replace(',', '.')) ? calculatePricePerKg(livePrice, parseFloat(inputWeight), weightUnit) : 0);
  const currentWeightNum = parseFloat(inputWeight.replace(',', '.')) || 0;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onCancel}
        />

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ scale: scaleAnim.current }], opacity: scaleAnim.current }]}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.title}>{t('verifyProduct')}</Text>

          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {priceComparison && (
              <View style={[
                styles.priceAlert,
                priceComparison.direction === 'higher' && styles.priceAlertWarn,
                priceComparison.direction === 'lower' && styles.priceAlertGood,
              ]}>
                <Ionicons
                  name={priceComparison.direction === 'higher' ? 'trending-up-outline' : priceComparison.direction === 'lower' ? 'trending-down-outline' : 'remove-outline'}
                  size={18}
                  color={colors.text}
                />
                <Text style={styles.priceAlertText}>
                  {priceComparison.direction === 'higher'
                    ? `Last time ${formatMoney(priceComparison.previousPrice)}. Now ${formatMoney(priceComparison.currentPrice)}.`
                    : priceComparison.direction === 'lower'
                      ? `Cheaper than last time: ${formatMoney(priceComparison.previousPrice)} before.`
                      : `Same as last time: ${formatMoney(priceComparison.previousPrice)}.`}
                </Text>
              </View>
            )}

            {(nameChoices.length > 0 || priceChoices.length > 0) && (
              <View style={styles.smartPickPanel}>
                <View style={styles.smartPickHeader}>
                  <Ionicons name="hand-left-outline" size={16} color={colors.text} />
                  <Text style={styles.smartPickTitle}>{t('tapCorrectText')}</Text>
                </View>

                {nameChoices.length > 0 && (
                  <View style={styles.choiceGroup}>
                    <Text style={styles.choiceLabel}>{t('productNameLabel')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                      {nameChoices.map((choice) => (
                        <TouchableOpacity
                          key={choice.value}
                          activeOpacity={0.78}
                          style={[styles.choiceChip, editName === choice.value && styles.choiceChipActive]}
                          onPress={() => setEditName(choice.value)}>
                          <Text style={[styles.choiceText, editName === choice.value && styles.choiceTextActive]} numberOfLines={1}>{choice.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {priceChoices.length > 0 && (
                  <View style={styles.choiceGroup}>
                    <Text style={styles.choiceLabel}>{t('priceLabel')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                      {priceChoices.map((choice) => {
                        const selected = Number(editPrice) === choice.value;
                        return (
                          <TouchableOpacity
                            key={choice.label}
                            activeOpacity={0.78}
                            style={[styles.choiceChip, selected && styles.choiceChipActive]}
                            onPress={() => setEditPrice(choice.value.toFixed(2))}>
                            <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{choice.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>{t('productNameLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('productName')}
                placeholderTextColor="rgba(0,0,0,0.32)"
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            {/* Mode Switcher: Fixed Price vs Weight / Per-Kilo */}
            <View style={styles.calcToggleRow}>
              <TouchableOpacity
                style={[styles.calcToggleBtn, calcMode === 'fixed' && styles.calcToggleBtnActive]}
                onPress={() => setCalcMode('fixed')}
                activeOpacity={0.8}
              >
                <Ionicons name="pricetag-outline" size={14} color={calcMode === 'fixed' ? '#FFF' : colors.text} />
                <Text style={[styles.calcToggleText, calcMode === 'fixed' && styles.calcToggleTextActive]}>
                  {t('fixedPrice')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calcToggleBtn, calcMode === 'weight' && styles.calcToggleBtnActive]}
                onPress={() => setCalcMode('weight')}
                activeOpacity={0.8}
              >
                <Ionicons name="scale-outline" size={14} color={calcMode === 'weight' ? '#FFF' : colors.text} />
                <Text style={[styles.calcToggleText, calcMode === 'weight' && styles.calcToggleTextActive]}>
                  {t('perKiloCalc')}
                </Text>
              </TouchableOpacity>
            </View>

            {calcMode === 'fixed' ? (
              <View style={styles.field}>
                <Text style={styles.label}>{t('priceLabel')}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    placeholderTextColor="rgba(0,0,0,0.32)"
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.weightCard}>
                <View style={styles.weightRow}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{t('pricePerKg')}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="0.00"
                        placeholderTextColor="rgba(0,0,0,0.32)"
                        value={inputPricePerKg}
                        onChangeText={setInputPricePerKg}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{t('weight')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 500"
                      placeholderTextColor="rgba(0,0,0,0.32)"
                      value={inputWeight}
                      onChangeText={setInputWeight}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Unit Selector */}
                <View style={styles.field}>
                  <Text style={styles.label}>{t('unit')}</Text>
                  <View style={styles.unitRow}>
                    {(['g', 'kg', 'lb', 'oz'] as WeightUnit[]).map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitChip, weightUnit === u && styles.unitChipActive]}
                        onPress={() => setWeightUnit(u)}
                      >
                        <Text style={[styles.unitText, weightUnit === u && styles.unitTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {livePrice > 0 && (
                  <View style={styles.calcResultBox}>
                    <Text style={styles.calcResultLabel}>{t('calculatedTotal')}</Text>
                    <Text style={styles.calcResultValue}>{formatMoney(livePrice)}</Text>
                  </View>
                )}
              </View>
            )}

            {currentPkg > 0 && currentWeightNum > 0 && (
              <View style={styles.weightBadgeWrap}>
                <Ionicons name="scale" size={13} color={colors.primary} />
                <Text style={styles.weightBadgeText}>
                  {formatWeightBadge(currentWeightNum, weightUnit, currentPkg, currencySymbol)}
                </Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>{t('quantity')}</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity style={styles.quantityBtn} onPress={decrementQuantity}>
                  <Ionicons name="remove" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity style={styles.quantityBtn} onPress={incrementQuantity}>
                  <Ionicons name="add" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {BUDGET_CATEGORIES.map((option) => {
                  const selected = category === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      activeOpacity={0.78}
                      style={[styles.choiceChip, selected && styles.choiceChipActive]}
                      onPress={() => setCategory(option.id)}>
                      <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{t('category' + option.id)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>{t('total')}</Text>
              <Text style={styles.totalPrice}>
                {formatMoney((parseFloat(editPrice.replace(',', '.')) || 0) * quantity)}
              </Text>
            </View>

          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>

            <AnimatedTouchableOpacity
              style={[styles.confirmButton, { transform: [{ scale: pressAnim.current }] }]}
              onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>{t('addToCart')}</Text>
            </AnimatedTouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Success Modal Animation Overlay */}
      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity.current }]}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: successScale.current }] }]}>
            <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale.current }] }]}>
              <Ionicons name="checkmark" size={48} color="#FFFFFF" />
            </Animated.View>
            <Animated.View style={{ opacity: textOpacity.current, alignItems: 'center' }}>
              <Text style={styles.successTitle}>{t('itemAdded')}</Text>
              <Text style={styles.successName} numberOfLines={1}>{editName || 'Product'}</Text>
              <Text style={styles.successPrice}>{formatMoney(confirmedPrice)}</Text>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetScroll: {
    maxHeight: 520,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  priceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  priceAlertWarn: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  priceAlertGood: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  priceAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  smartPickPanel: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  smartPickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smartPickTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  choiceGroup: {
    gap: 6,
  },
  choiceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  choiceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  choiceTextActive: {
    color: '#FFFFFF',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  calcToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  calcToggleBtn: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  calcToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  calcToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  calcToggleTextActive: {
    color: '#FFFFFF',
  },
  weightCard: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 14,
    gap: 8,
  },
  weightRow: {
    flexDirection: 'row',
    gap: 10,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitChip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  unitChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  calcResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  calcResultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  calcResultValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  weightBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  weightBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  confirmButton: {
    flex: 2,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  successCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  successName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
    textAlign: 'center',
  },
  successPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
});
