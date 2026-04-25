import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
 import { productApi, Product } from '../../api/products';
 import { InventorySkeleton } from '../../components/inventory/InventorySkeleton';
 import { formatINR } from '../../utils/formatINR';

export function DashboardProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productApi.getAll();
        if (response.success && Array.isArray(response.data)) {
          setProducts(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch products', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const stats = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const categories = new Set(products.map(p => p.category)).size;

    return [
      { title: "Total Products", value: total, icon: Package, color: "blue" },
      { title: "Low Stock", value: lowStock, icon: AlertTriangle, color: "orange" },
      { title: "Out of Stock", value: outOfStock, icon: AlertTriangle, color: "rose" },
      { title: "Categories", value: categories, icon: Layers, color: "emerald" },
    ];
  }, [products]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <InventorySkeleton />;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none shadow-md bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden relative group">
              <div className={`absolute top-0 left-0 w-1 h-full bg-${stat.color}-500 opacity-70`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-4 h-4 text-${stat.color}-500`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{stat.value}</div>
                <div className="flex items-center mt-1 text-[10px] text-muted-foreground font-medium">
                  <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" />
                  <span>+4.2% from last week</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-xl bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-white/5 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Catalog Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Review and manage your entire product inventory.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="rounded-xl border-gray-200 dark:border-white/10 h-10">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 dark:bg-white/[0.02] text-muted-foreground text-[12px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredProducts.map((product, idx) => (
                  <motion.tr
                    key={product._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-15 h-15 rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden border border-gray-200 dark:border-white/10">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground opacity-30" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground line-clamp-1">{product.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-muted-foreground">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-foreground">
                        {formatINR(product.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs font-bold ${product.stock === 0 ? 'text-rose-500' : product.stock <= 10 ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                          {product.stock} in stock
                        </span>
                        <div className="w-24 h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${product.stock === 0 ? 'bg-rose-500' : product.stock <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            style={{ width: `${Math.min((product.stock / 100) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${product.stock > 0
                        ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-rose-100/50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {product.stock > 0 ? 'Active' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProducts.length === 0 && (
            <div className="p-20 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5 mb-4">
                <Search className="w-6 h-6 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-bold">No products found</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                We couldn't find any products matching "{searchTerm}". Try broadening your search terms.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
