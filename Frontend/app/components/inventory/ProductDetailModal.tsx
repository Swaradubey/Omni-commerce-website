import React from 'react';
import { X, Package, Tag, Hash, DollarSign, Database, Clock, Calendar, Info, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../../api/products';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductDetailModal({ isOpen, onClose, product }: ProductDetailModalProps) {
  if (!isOpen || !product) return null;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'In Stock':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
      case 'Low Stock':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
      case 'Out of Stock':
        return 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-500/10 border-gray-100 dark:border-gray-500/20';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#09090b] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 dark:border-white/10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product Details</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">View comprehensive information about this item</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-white/5">
            {/* Image Section */}
            <div className="w-full md:w-2/5 p-6 bg-gray-50/30 dark:bg-white/[0.01]">
              <div className="aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-inner group bg-white dark:bg-zinc-900">
                <img
                  src={product.image || 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=400&fit=crop'}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=400&fit=crop';
                  }}
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(product.status)}`}>
                  {product.status}
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                  {product.category}
                </span>
              </div>
            </div>

            {/* Info Section */}
            <div className="w-full md:w-3/5 p-8 flex flex-col h-full overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-2 uppercase tracking-tight">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 text-sm font-medium">
                    <Hash className="w-4 h-4" />
                    SKU: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{product.sku}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-white/[0.02] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Unit Price</p>
                    <div className="flex items-center gap-1.5 text-2xl font-bold text-gray-900 dark:text-white">
                      <DollarSign className="w-5 h-5 text-emerald-500" />
                      {product.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Total Stock</p>
                    <div className="flex items-center gap-1.5 text-2xl font-bold text-gray-900 dark:text-white">
                      <BarChart3 className="w-5 h-5 text-indigo-500" />
                      {product.stock.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" /> Product Description
                  </h4>
                  <p className="text-gray-600 dark:text-zinc-300 text-sm leading-relaxed">
                    {product.description || 'No description provided for this product.'}
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500">Created At</p>
                      <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500">Last Updated</p>
                      <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                      {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-8 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
