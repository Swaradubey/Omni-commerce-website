const data = {
  items: [
    {
      productId: "1",
      name: "Premium Wireless Headphones",
      price: 249.99,
      quantity: 1,
      image: "https://example.com/image.jpg"
    }
  ],
  shippingAddress: {
    fullName: "Swara",
    address: "123 Main St",
    city: "Noida",
    state: "Delhi",
    zipCode: "201301",
    country: "India"
  },
  paymentMethod: "Card",
  totalPrice: 249.99
};

fetch('http://localhost:5000/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
.then(res => res.json())
.then(json => console.log(JSON.stringify(json, null, 2)))
.catch(err => console.error(err));
