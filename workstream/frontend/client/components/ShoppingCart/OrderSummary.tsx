import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  CreditCard,
  Shield,
  Info,
  CheckCircle
} from 'lucide-react';

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
  hasInsurance: boolean;
  formatPrice: (price: number) => string;
  onCheckout: () => void;
  isProcessing?: boolean;
}

export function OrderSummary({
  subtotal,
  discount,
  shipping,
  tax,
  total,
  itemCount,
  hasInsurance,
  formatPrice,
  onCheckout,
  isProcessing = false
}: OrderSummaryProps) {
  const insuranceCoverage = hasInsurance ? subtotal * 0.8 : 0; // 80% coverage
  const patientResponsibility = subtotal - insuranceCoverage + shipping + tax - discount;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Order Summary
          <Badge variant="secondary">{itemCount} item{itemCount !== 1 ? 's' : ''}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Cost Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>{formatPrice(tax)}</span>
            </div>

            {hasInsurance && (
              <>
                <Separator />
                <div className="space-y-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Insurance Coverage</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Insurance pays</span>
                    <span className="text-blue-600">-{formatPrice(insuranceCoverage)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Your responsibility</span>
                    <span>{formatPrice(patientResponsibility)}</span>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(hasInsurance ? patientResponsibility : total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            onClick={onCheckout}
            disabled={itemCount === 0 || isProcessing}
            className="w-full h-12 text-base"
            size="lg"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
          </Button>

          {/* Security Notice */}
          <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium">Secure Checkout</p>
              <p>Your payment information is encrypted and secure. HIPAA compliant.</p>
            </div>
          </div>

          {/* Prescription Notice */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-700 dark:text-amber-300">
              <p className="font-medium">Prescription Items</p>
              <p>Prescription medications require valid prescription verification before processing.</p>
            </div>
          </div>

          {/* Savings Summary */}
          {discount > 0 && (
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-green-700 dark:text-green-300 font-medium">
                🎉 You're saving {formatPrice(discount)}!
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}