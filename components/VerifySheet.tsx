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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

interface VerifySheetProps {
  open: boolean;
  name: string;
  price: number;
  onConfirm: (name: string, price: number, quantity: number) => void;
  onCancel: () => void;
}

export default function VerifySheet({
  open,
  name,
  price,
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

          {/* Product Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter product name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={editName}
              onChangeText={setEditName}
            />
          </View>

          {/* Price */}
          <View style={styles.field}>
            <Text style={styles.label}>Price</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                <Ionicons name="remove" size={20} color="white" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Total Calculation */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>
              ₱{(parseFloat(editPrice.replace(',', '.') || '0') * quantity).toFixed(2)}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.ink,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,142,173,0.35)',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '600',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 14,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quantityBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,142,173,0.18)',
    borderRadius: 12,
  },
  quantityText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(244,142,173,0.1)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(244,142,173,0.25)',
  },
  totalLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.accent,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
