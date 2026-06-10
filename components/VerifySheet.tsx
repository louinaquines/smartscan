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
import { colors } from '../lib/theme';
import { OcrChoice, OcrPriceChoice } from '../lib/ocrParser';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../lib/format';

interface VerifySheetProps {
  open: boolean;
  name: string;
  price: number;
  nameChoices?: OcrChoice[];
  priceChoices?: OcrPriceChoice[];
  onConfirm: (name: string, price: number, quantity: number) => void;
  onCancel: () => void;
}

export default function VerifySheet({
  open,
  name,
  price,
  nameChoices = [],
  priceChoices = [],
  onConfirm,
  onCancel,
}: VerifySheetProps) {
  const [editName, setEditName] = useState(name);
  const [editPrice, setEditPrice] = useState(price.toFixed(2));
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmedPrice, setConfirmedPrice] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0));
  const pressAnim = useRef(new Animated.Value(1));
  const successScale = useRef(new Animated.Value(0));
  const successOpacity = useRef(new Animated.Value(0));
  const checkScale = useRef(new Animated.Value(0));
  const textOpacity = useRef(new Animated.Value(0));
  const { showToast } = useToast();

  // Sync internal state when the modal opens or props change
  useEffect(() => {
    if (open) {
      setEditName(name);
      setEditPrice(price.toFixed(2));
      setQuantity(1);
    }
  }, [open, name, price]);
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
        onConfirm(editName || 'Product', updatedPrice, quantity);
      }, 1500);
    });
  };

  const incrementQuantity = () => setQuantity((q) => q + 1);
  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
        {/* Backdrop */}
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

          <Text style={styles.title}>Verify Product</Text>

          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {(nameChoices.length > 0 || priceChoices.length > 0) && (
              <View style={styles.smartPickPanel}>
                <View style={styles.smartPickHeader}>
                  <Ionicons name="hand-left-outline" size={16} color={colors.text} />
                  <Text style={styles.smartPickTitle}>Tap the correct text if Cany guessed wrong</Text>
                </View>

                {nameChoices.length > 0 && (
                  <View style={styles.choiceGroup}>
                    <Text style={styles.choiceLabel}>Product name</Text>
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
                    <Text style={styles.choiceLabel}>Price</Text>
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
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product name"
                placeholderTextColor="rgba(0,0,0,0.32)"
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Price</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currencySymbol}>₱</Text>
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

            <View style={styles.field}>
              <Text style={styles.label}>Quantity</Text>
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

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>
                ₱ {(parseFloat(editPrice.replace(',', '.') || '0') * quantity).toFixed(2)}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <AnimatedTouchableOpacity style={[styles.btn, styles.confirmBtn, { transform: [{ scale: pressAnim.current } ]}]} onPress={handleConfirm}>
                <Text style={styles.confirmBtnText}>Add to Cart</Text>
              </AnimatedTouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>

          {/* Success Overlay */}
          {showSuccess && (
            <Animated.View style={[styles.successOverlay, { opacity: successOpacity.current }]}>
              <Animated.View style={[styles.successContent, { transform: [{ scale: successScale.current }] }]}>
                <Animated.View style={[styles.successCheckCircle, { transform: [{ scale: checkScale.current }] }]}>
                  <Ionicons name="checkmark" size={38} color="#FFF" />
                </Animated.View>
                <Animated.View style={{ opacity: textOpacity.current }}>
                  <Text style={styles.successTitle}>You've successfully scanned an item</Text>
                  <Text style={styles.successPrice}>{formatMoney(confirmedPrice)}</Text>
                </Animated.View>
              </Animated.View>
            </Animated.View>
          )}
      </KeyboardAvoidingView>
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
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '86%',
  },
  sheetScroll: {
    maxHeight: 560,
  },
  sheetScrollContent: {
    paddingBottom: 10,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  smartPickPanel: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  smartPickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  smartPickTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  choiceGroup: {
    marginTop: 8,
  },
  choiceLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  choiceRow: {
    gap: 8,
    paddingRight: 8,
  },
  choiceChip: {
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  choiceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  choiceTextActive: {
    color: '#FFF',
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPink,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  quantityBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfacePink,
    borderRadius: 12,
  },
  quantityText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  totalLabel: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    marginTop: 20,
    backgroundColor: colors.card,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  successContent: {
    alignItems: 'center',
    gap: 16,
  },
  successCheckCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  successPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
});
