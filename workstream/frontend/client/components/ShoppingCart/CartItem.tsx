import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import {
  Plus,
  Minus,
  Trash2,
  Package,
  Shield,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface CartItemProps {
  item: {
    id: string;
    name: string;
    brand?: string;
    dosage?: string;
    quantity: number;
    totalPrice: number;
    prescriptionRequired?: boolean;
    isSubscription?: boolean;
    aiRecommended?: boolean;
  };
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  formatPrice: (price: number) => string;
}

export function CartItem({ item, onUpdateQuantity, onRemove, formatPrice }: CartItemProps) {
  const handleQuantityDecrease = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleQuantityIncrease = () => {
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Product Image */}
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {item.name}
                </h3>
                {item.brand && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.brand} • {item.dosage}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {item.prescriptionRequired && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Rx Required
                    </Badge>
                  )}
                  {item.isSubscription && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Subscription
                    </Badge>
                  )}
                  {item.aiRecommended && (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Recommended
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label={`Remove ${item.name} from cart`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Quantity and Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuantityDecrease}
                  disabled={item.quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center font-medium" aria-label={`Quantity: ${item.quantity}`}>
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuantityIncrease}
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatPrice(item.totalPrice)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}