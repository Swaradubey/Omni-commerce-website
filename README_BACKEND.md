# EcoShop - E-commerce Website

## Backend Setup

1. Install dependencies:
```bash
cd Backend
npm install
```

2. Create `.env` file in Backend folder:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ecoshop
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your_jwt_secret_key_here
```

3. Start backend server:
```bash
npm run dev
```

## Frontend Setup

1. Create `.env` file in root folder:
```env
VITE_API_URL=http://localhost:5000
```

2. Start frontend development server:
```bash
npm run dev
```

## Database Setup

1. Install MongoDB Compass: https://www.mongodb.com/products/compass
2. Connect to MongoDB using:
   - Host: localhost
   - Port: 27017
3. Create database: `ecoshop`
4. Collections will be created automatically

## API Endpoints

- `POST /api/orders` - Create new order
- `GET /api/orders/:orderId` - Get order details

## Order Model Structure

```javascript
{
  userId: ObjectId,          // Optional - if user is authenticated
  orderId: "ORD-1234567890", // Custom order ID
  status: "processing",      // Order status
  items: [
    {
      productId: ObjectId,
      name: "Product Name",
      price: 29.99,
      quantity: 2,
      image: "/product-image.jpg"
    }
  ],
  subtotal: 59.98,
  shipping: 10.00,
  total: 69.98,
  shippingAddress: {
    name: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    address: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "United States"
  }
}
```

## Testing in MongoDB Compass

1. After placing an order, check the `orders` collection
2. Verify order data is saved correctly
3. Check populated product references in items array
4. View timestamps for order creation

## Notes

- Card payment details are NOT stored in database (only UI)
- Order IDs are generated as `ORD-timestamp`
- Shipping is free for orders over $50
- Error handling and loading states are implemented
- Backend is CORS-enabled for frontend integration