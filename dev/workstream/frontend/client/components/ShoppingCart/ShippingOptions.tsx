import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Zap,
  Truck,
  Clock,
  Package
} from 'lucide-react';

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: string;
  description: string;
}

interface ShippingOptionsProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  formatPrice: (price: number) => string;
}

const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    price: 0,
    estimatedDays: '5-7 business days',
    description: 'Free standard shipping'
  },
  {
    id: 'express',
    name: 'Express Shipping',
    price: 9.99,
    estimatedDays: '2-3 business days',
    description: 'Faster delivery'
  },
  {
    id: 'overnight',
    name: 'Overnight Shipping',
    price: 19.99,
    estimatedDays: '1 business day',
    description: 'Next-day delivery'
  },
  {
    id: 'pickup',
    name: 'Store Pickup',
    price: 0,
    estimatedDays: 'Same day',
    description: 'Pick up at local pharmacy'
  }
];

export function ShippingOptions({ selectedMethod, onMethodChange, formatPrice }: ShippingOptionsProps) {
  const getShippingIcon = (method: string) => {
    switch (method) {
      case 'overnight': return <Zap className="w-4 h-4" />;
      case 'express': return <Truck className="w-4 h-4" />;
      case 'pickup': return <Package className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Shipping Options</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {SHIPPING_OPTIONS.map((option) => (
            <Button
              key={option.id}
              variant={selectedMethod === option.id ? "default" : "outline"}
              className="w-full justify-start p-4 h-auto"
              onClick={() => onMethodChange(option.id)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {getShippingIcon(option.id)}
                  <div className="text-left">
                    <div className="font-medium">{option.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description} • {option.estimatedDays}
                    </div>
                  </div>
                </div>
                <div className="font-semibold">
                  {option.price === 0 ? 'Free' : formatPrice(option.price)}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}