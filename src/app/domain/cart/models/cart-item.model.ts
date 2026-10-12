import { Product, ProductColor } from '../../catalog/models/product.model';

export interface CartItem {
  id: string; // generated unique id: product_id + size + color
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: ProductColor;
  isBundlePart?: boolean;
}

export interface CouponDiscount {
  code: string;
  percent: number;
  fixedAmount?: number;
  minSubtotal?: number;
  description: string;
}

export interface CartSummary {
  itemsCount: number;
  subtotal: number;
  bundleDiscount: number;
  couponDiscount: number;
  shipping: number;
  total: number;
  freeShippingThreshold: number;
  freeShippingRemaining: number;
}
