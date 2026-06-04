import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { OcrChoice, OcrPriceChoice } from '../lib/ocrParser';

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

  // Sync internal state when the modal opens or props change
  useEffect(() => {
    if (open) {
      setEditName(name);
      setEditPrice(price.toFixed(2));
      setQuantity(1);
    }
  }, [open, name, price]);

  const handleConfirm = () => {
    // Sanitize input (handle commas and ensure it's a valid number)
    const sanitizedPrice = editPrice.replace(',', '.');
    const updatedPrice = parseFloat(sanitizedPrice) || 0;
    onConfirm(editName || 'Product', updatedPrice, quantity);
  };

  const incrementQuantity = () => setQuantity((q) => q + 1);
  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));

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
        <View style={styles.sheet}>
          {/* Handle for visual indicator */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.title}>Verify Product</Text>
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

          {/* Product Name */}
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

          {/* Price */}
          <View style={styles.field}>
            <Text style={styles.label}>Price</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>PHP</Text>
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

          {/* Quantity */}
          <View style={styles.field}>
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={decrementQuantity}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Total Calculation */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>
              PHP {(parseFloat(editPrice.replace(',', '.') || '0') * quantity).toFixed(2)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    maxHeight: '80%',
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
});
