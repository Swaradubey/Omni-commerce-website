export interface Product {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  originalPrice?: number;
  isOnSale?: boolean;
  salePercentage?: number;
  description: string;
  category: string;
  image: string;
  images: string[];
  stock: number;
  rating: number;
  reviews: number;
  featured?: boolean;
  sku?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: {
    name: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}
