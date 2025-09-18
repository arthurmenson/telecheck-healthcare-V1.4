import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tag, CheckCircle, X } from 'lucide-react';

interface PromoCodeProps {
  appliedPromotions: Array<{
    code: string;
    discount: number;
    description: string;
  }>;
  onApplyPromotion: (code: string) => void;
  onRemovePromotion: (code: string) => void;
  formatPrice: (price: number) => string;
}

export function PromoCode({
  appliedPromotions,
  onApplyPromotion,
  onRemovePromotion,
  formatPrice
}: PromoCodeProps) {
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || isApplying) return;

    setIsApplying(true);
    try {
      await onApplyPromotion(promoCode.trim());
      setPromoCode('');
    } catch (error) {
      console.error('Failed to apply promo code:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyPromo();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Promo Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Applied Promotions */}
          {appliedPromotions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Applied Promotions
              </h4>
              {appliedPromotions.map((promo) => (
                <div
                  key={promo.code}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">
                        {promo.code}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        {promo.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      -{formatPrice(promo.discount)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePromotion(promo.code)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Promo Code Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={isApplying}
            />
            <Button
              onClick={handleApplyPromo}
              disabled={!promoCode.trim() || isApplying}
              className="px-4"
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </Button>
          </div>

          {/* Popular Promo Codes */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Popular Codes
            </h4>
            <div className="flex flex-wrap gap-2">
              {['SAVE10', 'FIRSTORDER', 'HEALTH20'].map((code) => (
                <Button
                  key={code}
                  variant="outline"
                  size="sm"
                  onClick={() => setPromoCode(code)}
                  className="text-xs"
                  disabled={appliedPromotions.some(p => p.code === code)}
                >
                  {code}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}