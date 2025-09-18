import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useCart } from '../../contexts/CartContext';
import { CartItem } from './CartItem';
import { ShippingOptions } from './ShippingOptions';
import { PromoCode } from './PromoCode';
import { OrderSummary } from './OrderSummary';
import {
  ShoppingCart as ShoppingCartIcon,
  Trash2,
  ArrowRight
} from 'lucide-react';

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const {
    state,
    removeItem,
    updateQuantity,
    setShippingMethod,
    applyPromotion,
    removePromotion,
    clearCart
  } = useCart();

  const [activeTab, setActiveTab] = useState('cart');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Memoized calculations for better performance
  const calculations = useMemo(() => {
    const subtotal = state.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const discount = state.appliedPromotions.reduce((sum, promo) => sum + promo.discount, 0);
    const shippingCost = getShippingCost(state.shippingMethod);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal - discount + shippingCost + tax;

    return {
      subtotal,
      discount,
      shipping: shippingCost,
      tax,
      total,
      itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [state.items, state.appliedPromotions, state.shippingMethod]);

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getShippingCost = (method: string): number => {
    const costs = {
      standard: 0,
      express: 9.99,
      overnight: 19.99,
      pickup: 0
    };
    return costs[method as keyof typeof costs] || 0;
  };

  const handleCheckout = async () => {
    if (calculations.itemCount === 0) return;

    setIsProcessingCheckout(true);
    try {
      // Simulate checkout process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real app, this would integrate with payment processing
      console.log('Proceeding to payment gateway...', {
        items: state.items,
        total: calculations.total,
        shipping: state.shippingMethod,
        promotions: state.appliedPromotions
      });

      // Navigate to checkout page or payment gateway
      // For now, we'll just close the cart
      onClose();
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleApplyPromotion = async (code: string) => {
    // In a real app, this would validate the promo code with the backend
    try {
      await applyPromotion(code);
    } catch (error) {
      throw new Error('Invalid promo code or code already applied');
    }
  };

  const isEmpty = state.items.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="w-6 h-6" />
            Shopping Cart
            {!isEmpty && (
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                ({calculations.itemCount} item{calculations.itemCount !== 1 ? 's' : ''})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isEmpty ? (
          <EmptyCart onClose={onClose} />
        ) : (
          <div className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cart">Cart Items</TabsTrigger>
                <TabsTrigger value="shipping">Shipping</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="cart" className="h-full">
                  <CartItemsTab
                    items={state.items}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeItem}
                    onClearCart={clearCart}
                    formatPrice={formatPrice}
                  />
                </TabsContent>

                <TabsContent value="shipping" className="h-full">
                  <div className="space-y-6">
                    <ShippingOptions
                      selectedMethod={state.shippingMethod}
                      onMethodChange={setShippingMethod}
                      formatPrice={formatPrice}
                    />

                    <PromoCode
                      appliedPromotions={state.appliedPromotions}
                      onApplyPromotion={handleApplyPromotion}
                      onRemovePromotion={removePromotion}
                      formatPrice={formatPrice}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="h-full">
                  <div className="max-w-md mx-auto">
                    <OrderSummary
                      subtotal={calculations.subtotal}
                      discount={calculations.discount}
                      shipping={calculations.shipping}
                      tax={calculations.tax}
                      total={calculations.total}
                      itemCount={calculations.itemCount}
                      hasInsurance={state.hasInsurance}
                      formatPrice={formatPrice}
                      onCheckout={handleCheckout}
                      isProcessing={isProcessingCheckout}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessingCheckout}
              >
                Continue Shopping
              </Button>

              <div className="flex gap-2">
                {activeTab === 'cart' && (
                  <Button
                    onClick={() => setActiveTab('shipping')}
                    disabled={isEmpty}
                  >
                    Shipping <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {activeTab === 'shipping' && (
                  <Button
                    onClick={() => setActiveTab('summary')}
                  >
                    Review Order <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Separate component for cart items tab
function CartItemsTab({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  formatPrice
}: {
  items: any[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  formatPrice: (price: number) => string;
}) {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Items in your cart</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearCart}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear Cart
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemoveItem}
            formatPrice={formatPrice}
          />
        ))}
      </div>
    </div>
  );
}

// Empty cart component
function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center py-12">
      <ShoppingCartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Your cart is empty
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Add some products to your cart to get started
      </p>
      <Button onClick={onClose}>
        Continue Shopping
      </Button>
    </div>
  );
}

export default ShoppingCart;