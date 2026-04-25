import { Product } from '../types/product';

export const products: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    slug: 'premium-wireless-headphones',
    price: 299.99,
    salePrice: 249.99,
    description: 'Experience crystal-clear sound with our premium wireless headphones. Featuring active noise cancellation, 30-hour battery life, and premium comfort padding.',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1578517581165-61ec5ab27a19?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aXJlbGVzcyUyMGhlYWRwaG9uZXMlMjBwcm9kdWN0fGVufDF8fHx8MTc3NDMwNzk1OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1578517581165-61ec5ab27a19?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aXJlbGVzcyUyMGhlYWRwaG9uZXMlMjBwcm9kdWN0fGVufDF8fHx8MTc3NDMwNzk1OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 45,
    rating: 4.8,
    reviews: 234,
    featured: true
  },
  {
    id: '2',
    name: 'Smart Watch Pro',
    slug: 'smart-watch-pro',
    price: 399.99,
    description: 'Stay connected with our Smart Watch Pro. Track your fitness, receive notifications, and monitor your health with advanced sensors.',
    category: 'Wearables',
    image: 'https://images.unsplash.com/photo-1745256375848-1d599594635d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydCUyMHdhdGNoJTIwbW9kZXJufGVufDF8fHx8MTc3NDM1NDcxNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1745256375848-1d599594635d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydCUyMHdhdGNoJTIwbW9kZXJufGVufDF8fHx8MTc3NDM1NDcxNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 32,
    rating: 4.6,
    reviews: 189,
    featured: true
  },
  {
    id: '3',
    name: 'UltraBook Pro Laptop',
    slug: 'ultrabook-pro-laptop',
    price: 1299.99,
    salePrice: 1099.99,
    description: 'Powerful performance meets sleek design. 16GB RAM, 512GB SSD, Intel i7 processor, and stunning 4K display.',
    category: 'Computers',
    image: 'https://images.unsplash.com/flagged/photo-1576697010739-6373b63f3204?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlciUyMGRlc2t8ZW58MXx8fHwxNzc0Mjk5MzcwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/flagged/photo-1576697010739-6373b63f3204?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlciUyMGRlc2t8ZW58MXx8fHwxNzc0Mjk5MzcwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 18,
    rating: 4.9,
    reviews: 312,
    featured: true
  },
  {
    id: '4',
    name: 'Professional DSLR Camera',
    slug: 'professional-dslr-camera',
    price: 1899.99,
    description: 'Capture stunning photos with our professional DSLR camera. 24MP sensor, 4K video recording, and advanced autofocus.',
    category: 'Cameras',
    image: 'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW1lcmElMjBwaG90b2dyYXBoeSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzQzMDI5MzF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW1lcmElMjBwaG90b2dyYXBoeSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzQzMDI5MzF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 12,
    rating: 4.7,
    reviews: 156,
    featured: false
  },
  {
    id: '5',
    name: 'Flagship Smartphone',
    slug: 'flagship-smartphone',
    price: 999.99,
    salePrice: 899.99,
    description: 'Experience the latest in mobile technology. 5G capable, triple camera system, and all-day battery life.',
    category: 'Mobile',
    image: 'https://images.unsplash.com/photo-1741061961703-0739f3454314?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwbW9iaWxlJTIwcGhvbmV8ZW58MXx8fHwxNzc0Mjk4NTE3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1741061961703-0739f3454314?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwbW9iaWxlJTIwcGhvbmV8ZW58MXx8fHwxNzc0Mjk4NTE3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 67,
    rating: 4.5,
    reviews: 445,
    featured: true
  },
  {
    id: '6',
    name: 'Portable Bluetooth Speaker',
    slug: 'portable-bluetooth-speaker',
    price: 79.99,
    description: 'Take your music anywhere with this waterproof portable speaker. 12-hour battery life and powerful 360° sound.',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1674303324806-7018a739ed11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibHVldG9vdGglMjBzcGVha2VyJTIwcG9ydGFibGV8ZW58MXx8fHwxNzc0MzE0NTczfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1674303324806-7018a739ed11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibHVldG9vdGglMjBzcGVha2VyJTIwcG9ydGFibGV8ZW58MXx8fHwxNzc0MzE0NTczfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 89,
    rating: 4.4,
    reviews: 278,
    featured: false
  },
  {
    id: '7',
    name: 'Gaming Console Elite',
    slug: 'gaming-console-elite',
    price: 499.99,
    description: 'Next-gen gaming experience with stunning 4K graphics, ray tracing, and ultra-fast loading times.',
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1695028644151-1ec92bae9fb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjb25zb2xlJTIwY29udHJvbGxlcnxlbnwxfHx8fDE3NzQzMTMzNTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1695028644151-1ec92bae9fb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjb25zb2xlJTIwY29udHJvbGxlcnxlbnwxfHx8fDE3NzQzMTMzNTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 23,
    rating: 4.9,
    reviews: 567,
    featured: true
  },
  {
    id: '8',
    name: 'Pro Tablet',
    slug: 'pro-tablet',
    price: 799.99,
    salePrice: 699.99,
    description: 'Powerful tablet for work and play. Includes keyboard and stylus. Perfect for creators and professionals.',
    category: 'Tablets',
    image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZXQlMjBkZXZpY2UlMjBpcGFkfGVufDF8fHx8MTc3NDMyMDQ2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZXQlMjBkZXZpY2UlMjBpcGFkfGVufDF8fHx8MTc3NDMyMDQ2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 41,
    rating: 4.7,
    reviews: 223,
    featured: false
  },
  {
    id: '9',
    name: 'Mechanical Gaming Keyboard',
    slug: 'mechanical-gaming-keyboard',
    price: 149.99,
    description: 'RGB backlit mechanical keyboard with custom switches. Perfect for gaming and typing enthusiasts.',
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1656711081969-9d16ebc2d210?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrZXlib2FyZCUyMG1lY2hhbmljYWwlMjBnYW1pbmd8ZW58MXx8fHwxNzc0Mjc5MjQ1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1656711081969-9d16ebc2d210?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrZXlib2FyZCUyMG1lY2hhbmljYWwlMjBnYW1pbmd8ZW58MXx8fHwxNzc0Mjc5MjQ1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 56,
    rating: 4.6,
    reviews: 198,
    featured: false
  },
  {
    id: '10',
    name: 'Precision Gaming Mouse',
    slug: 'precision-gaming-mouse',
    price: 69.99,
    description: 'High-precision gaming mouse with adjustable DPI, programmable buttons, and ergonomic design.',
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1756928626912-17d51297f43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VzZSUyMGNvbXB1dGVyJTIwZ2FtaW5nfGVufDF8fHx8MTc3NDM1NDcxOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1756928626912-17d51297f43d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VzZSUyMGNvbXB1dGVyJTIwZ2FtaW5nfGVufDF8fHx8MTc3NDM1NDcxOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 73,
    rating: 4.5,
    reviews: 167,
    featured: false
  },
  {
    id: '11',
    name: 'True Wireless Earbuds',
    slug: 'true-wireless-earbuds',
    price: 159.99,
    salePrice: 129.99,
    description: 'Premium wireless earbuds with active noise cancellation and superior sound quality. 24-hour battery life with charging case.',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1748698361079-fd70b999be1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXJidWRzJTIwd2lyZWxlc3MlMjBhaXJwb2RzfGVufDF8fHx8MTc3NDI1ODM0N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1748698361079-fd70b999be1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXJidWRzJTIwd2lyZWxlc3MlMjBhaXJwb2RzfGVufDF8fHx8MTc3NDI1ODM0N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 94,
    rating: 4.7,
    reviews: 389,
    featured: true
  },
  {
    id: '12',
    name: '4K Ultra HD Monitor',
    slug: '4k-ultra-hd-monitor',
    price: 599.99,
    description: '32-inch 4K monitor with HDR support, 144Hz refresh rate, and stunning color accuracy. Perfect for gaming and content creation.',
    category: 'Computers',
    image: 'https://images.unsplash.com/photo-1649704394792-9cd6a3995cc5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25pdG9yJTIwZGlzcGxheSUyMHNjcmVlbnxlbnwxfHx8fDE3NzQyODE1ODR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    images: [
      'https://images.unsplash.com/photo-1649704394792-9cd6a3995cc5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25pdG9yJTIwZGlzcGxheSUyMHNjcmVlbnxlbnwxfHx8fDE3NzQyODE1ODR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    ],
    stock: 28,
    rating: 4.8,
    reviews: 201,
    featured: false
  }
];

export const categories = [
  'All Products',
  'Audio',
  'Wearables',
  'Computers',
  'Cameras',
  'Mobile',
  'Gaming',
  'Tablets'
];
