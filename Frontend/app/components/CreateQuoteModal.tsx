import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { 
  Search, 
  Plus, 
  Trash2, 
  User, 
  Package, 
  DollarSign, 
  Calculator,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import ApiService from '../api/apiService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateQuoteModal({ isOpen, onClose, onSuccess }: CreateQuoteModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchProducts();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      const res = await ApiService.get('/admin/customers', { pageName: 'Customers' });
      if (res.success) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await ApiService.get('/products', { pageName: 'Products' });
      if (res.success) {
        setProducts(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(c => 
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.email?.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p => 
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const addItem = (product: any) => {
    const existing = selectedItems.find(item => item.productId === product._id);
    if (existing) {
      setSelectedItems(selectedItems.map(item => 
        item.productId === product._id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setSelectedItems([...selectedItems, {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      }]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const removeItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    setSelectedItems(selectedItems.map(item => 
      item.productId === productId ? { ...item, quantity: qty } : item
    ));
  };

  const updatePrice = (productId: string, price: number) => {
    if (price < 0) return;
    setSelectedItems(selectedItems.map(item => 
      item.productId === productId ? { ...item, price: price } : item
    ));
  };

  const totalAmount = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        userId: selectedCustomer._id,
        customerName: selectedCustomer.name,
        customerEmail: selectedCustomer.email,
        clientId: selectedCustomer.clientId || products[0]?.clientId, // Fallback to first product's client if available
        products: selectedItems.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        originalTotal: totalAmount,
        requestedPrice: totalAmount, // Default to total for admin creation
        message: message,
      };

      const res = await ApiService.post('/quotes', payload, { pageName: 'Quote' });
      if (res.success) {
        toast.success('Quote created successfully!');
        resetForm();
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.message || 'Failed to create quote');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setSelectedItems([]);
    setProductSearch('');
    setMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-stone-200 bg-white dark:bg-zinc-950">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-3xl font-black text-[#1F1F1F] dark:text-[#F9FAFB]">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                  <Plus className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                Create New Quotation
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Customer & Details */}
              <div className="space-y-6">
                <div className="space-y-2 relative">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Customer</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers by name or email..."
                      value={selectedCustomer ? selectedCustomer.name : customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        if (selectedCustomer) setSelectedCustomer(null);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="pl-10 h-12 rounded-xl border-gray-200 dark:border-zinc-800"
                    />
                    {selectedCustomer && (
                      <button 
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showCustomerDropdown && filteredCustomers.length > 0 && !selectedCustomer && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto"
                      >
                        {filteredCustomers.map(c => (
                          <div
                            key={c._id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setShowCustomerDropdown(false);
                            }}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-3 transition-colors"
                          >
                            <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notes / Message</Label>
                  <Textarea
                    placeholder="Add special instructions or terms..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[120px] rounded-2xl border-gray-200 dark:border-zinc-800 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Right Column: Products Selection */}
              <div className="space-y-6">
                <div className="space-y-2 relative">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Add Products</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      className="pl-10 h-12 rounded-xl border-gray-200 dark:border-zinc-800"
                    />
                  </div>

                  <AnimatePresence>
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto"
                      >
                        {filteredProducts.map(p => (
                          <div
                            key={p._id}
                            onClick={() => addItem(p)}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden">
                                {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-amber-600" />}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{p.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {p.sku} • Stock: {p.stock}</p>
                              </div>
                            </div>
                            <p className="font-black text-sm text-blue-600">₹{p.price}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Order Summary</h3>
                    <div className="flex items-center gap-2 text-blue-600">
                      <Calculator className="h-4 w-4" />
                      <span className="text-xs font-bold">Auto-calculated</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Package className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-xs font-medium">No products added yet</p>
                      </div>
                    ) : (
                      selectedItems.map(item => (
                        <div key={item.productId} className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                                className="w-16 h-8 text-xs text-center rounded-lg px-1"
                              />
                              <span className="text-[10px] text-muted-foreground">x</span>
                              <div className="relative">
                                <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <Input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                                  className="w-24 h-8 text-xs pl-5 rounded-lg"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-sm">₹{(item.price * item.quantity).toLocaleString()}</p>
                            <button 
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              className="text-rose-500 hover:text-rose-600 p-1 mt-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-xs font-bold uppercase tracking-wider">Subtotal</span>
                      <span className="font-bold">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-gray-900 dark:text-gray-100">Grand Total</span>
                      <span className="text-2xl font-black text-blue-600">₹{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800 rounded-b-3xl">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl px-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0 || !selectedCustomer}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-10 gap-2 shadow-xl shadow-blue-600/20 h-12"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              <span className="font-bold">Generate Quote</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
