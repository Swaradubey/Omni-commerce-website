import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Search,
  Plus,
  Package,
  DollarSign,
  Calculator,
  Check,
  AlertCircle,
  X,
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
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

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

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p =>
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const addItem = (product: any) => {
    const resolvedId = product._id || product.id || product.productId;
    setSelectedItems((prev) => [
      ...prev,
      {
        id: `${resolvedId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: resolvedId,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
      },
    ]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const removeItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(itemId);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: qty } : item
      )
    );
  };

  const updatePrice = (itemId: string, price: number) => {
    if (price < 0) return;
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, price: price } : item
      )
    );
  };

  const totalAmount = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Please enter a customer name');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        userId: null,
        customerName: customerName,
        customerEmail: '',
        clientId: products[0]?.clientId,
        products: selectedItems.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        originalTotal: totalAmount,
        requestedPrice: totalAmount,
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
    setCustomerName('');
    setSelectedItems([]);
    setProductSearch('');
    setMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 p-0">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .quote-modal-scroll::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              .quote-modal-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .quote-modal-scroll::-webkit-scrollbar-thumb {
                background: #e2e8f0;
                border-radius: 10px;
              }
              .dark .quote-modal-scroll::-webkit-scrollbar-thumb {
                background: #374151;
              }
              .quote-modal-scroll::-webkit-scrollbar-thumb:hover {
                background: #cbd5e1;
              }
              .dark .quote-modal-scroll::-webkit-scrollbar-thumb:hover {
                background: #4b5563;
              }
              .quote-input {
                transition: all 0.15s ease;
              }
              .quote-input:focus {
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
              }
              .order-item-hover:hover {
                background-color: #f8fafc;
              }
              .dark .order-item-hover:hover {
                background-color: #1e293b;
              }
              .quantity-input::-webkit-inner-spin-button,
              .quantity-input::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              .quantity-input {
                -moz-appearance: textfield;
              }
            `,
          }}
        />
        <form onSubmit={handleSubmit} className="flex flex-col h-full quote-modal-scroll overflow-y-auto">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur-sm border-b border-gray-100 px-8 py-5 dark:border-gray-800 dark:bg-gray-950/95">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Create New Quotation
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Fill in the details below to generate a new quote
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
              {/* Left Column: Customer & Notes */}
              <div className="space-y-6">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">
                    Customer Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="quote-input h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">
                    Notes / Message
                  </Label>
                  <Textarea
                    placeholder="Add special instructions or terms for this quotation..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="quote-input min-h-[128px] resize-none rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900"
                  />
                </div>
              </div>

              {/* Right Column: Products */}
              <div className="space-y-6">
                {/* Add Products Search */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">
                    Add Products
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 pointer-events-none" />
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      className="quote-input pl-11 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900"
                    />
                  </div>

                  <AnimatePresence>
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute z-50 w-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
                      >
                        <div className="max-h-56 overflow-y-auto">
                          {filteredProducts.map(p => (
                            <div
                              key={p._id}
                              onClick={() => addItem(p)}
                              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer flex items-center justify-between transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {p.image ? (
                                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <Package className="h-4 w-4 text-amber-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">SKU: {p.sku} · Stock: {p.stock}</p>
                                </div>
                              </div>
                              <p className="font-semibold text-sm text-blue-600 dark:text-blue-400 flex-shrink-0 ml-3">₹{p.price}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Order Summary Card */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5 flex flex-col" style={{ minHeight: 200 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4.5 w-4.5 text-gray-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                        Order Summary
                      </h3>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 space-y-2 overflow-y-auto quote-modal-scroll pr-1">
                    {selectedItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
                        <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center mb-3">
                          <Package className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-sm font-medium">No products added yet</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px] text-center">
                          Search and add products to build your quotation
                        </p>
                      </div>
                    ) : (
                      selectedItems.map(item => (
                        <div
                          key={item.id}
                          className="order-item-hover group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-gray-800/60 transition-colors relative"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              removeItem(item.id);
                            }}
                            className="absolute top-2 right-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded"
                            aria-label="Remove product"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img src={item.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pl-2 flex items-center justify-between">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                                className="quantity-input w-14 h-7 text-[11px] text-center rounded-lg px-1 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              />
                              <span className="text-[10px] text-gray-400">×</span>
                              <div className="relative">
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                <Input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                                  className="pl-7 w-20 h-7 text-[11px] rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Totals */}
                  {selectedItems.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700/60 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Subtotal
                        </span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          ₹{totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          Grand Total
                        </span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                          ₹{totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-8 py-4 dark:border-gray-800 dark:bg-gray-950/95">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl px-6 h-11 text-sm font-medium"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0 || !customerName.trim()}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:shadow-none rounded-xl px-10 gap-2 h-12 text-sm font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Check className="h-4.5 w-4.5" />
                  <span>Generate Quote</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}