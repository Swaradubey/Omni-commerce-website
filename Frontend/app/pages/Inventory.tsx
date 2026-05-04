import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { InventoryStats } from '../components/inventory/InventoryStats';
import { InventoryFilters } from '../components/inventory/InventoryFilters';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { DeleteConfirmModal } from '../components/inventory/DeleteConfirmModal';
import { InventorySkeleton } from '../components/inventory/InventorySkeleton';
import { ProductModal } from '../components/inventory/ProductModal';
import { ProductDetailModal } from '../components/inventory/ProductDetailModal';
import { StoreManagerModal } from '../components/inventory/StoreManagerModal';
import { EmployeeModal } from '../components/inventory/EmployeeModal';
import { SortConfig, type InventoryItem } from '../types/inventory';
import { productApi, Product } from '../api/products';
import { clientsApi, type ClientRow } from '../api/clients';
import { employeesApi, type EmployeeRow } from '../api/employees';
import { storeManagersApi, type StoreManager } from '../api/storeManagers';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  canAccessInventoryEditor,
  canAdjustInventoryStock,
  canCreateInventoryProduct,
  canDeleteInventoryProduct,
  canOpenProductEditModal,
  getInventoryEditMode,
} from '../utils/inventoryPermissions';
import { isClientRole } from '../utils/staffRoles';

const ITEMS_PER_PAGE = 8;
const STAFF_LIST_ITEMS_PER_PAGE = 6;

function formatEmployeeRoleLabel(rawRole?: string): string {
  const normalized = String(rawRole || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!normalized) return '';
  return normalized.replace(/_/g, ' ');
}

export function Inventory() {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role;
  const inventoryEditorRole = getInventoryEditMode(role);
  const allowAdd = canCreateInventoryProduct(role);
  const allowDelete = canDeleteInventoryProduct(role);
  const allowStockShortcut = canAdjustInventoryStock(role);
  const allowEditModal = canOpenProductEditModal(role);

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [stockStatus, setStockStatus] = useState<string | 'all'>('all');
  const [category, setCategory] = useState('All Categories');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'updatedAt',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productModalMode, setProductModalMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [assignableClients, setAssignableClients] = useState<ClientRow[]>([]);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [seoManagerModalOpen, setSeoManagerModalOpen] = useState(false);
  const [staffEmployees, setStaffEmployees] = useState<EmployeeRow[]>([]);
  const [staffEmployeesPage, setStaffEmployeesPage] = useState(1);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const fetchAllProducts = async () => {
    setIsLoading(true);
    try {
      const response = await productApi.getManage();

      if (response.success) {
        setProducts((response.data as Product[]) || []);
      } else {
        throw new Error(response.message || 'Failed to fetch products');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (products.length > 0) {
      console.log("inventory products received:", products.length);
      console.log("product client info:", products.map(p => ({
        name: p.name,
        clientId: p.clientId || (typeof p.client === 'string' ? p.client : p.client?._id),
        clientName: p.client?.shopName || p.client?.companyName || 'Not assigned'
      })));
    }
  }, [products]);

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const loadStaffEmployees = useCallback(async () => {
    if (!isClientRole(user?.role) || !user?.clientId) {
      setStaffEmployees([]);
      return;
    }
    setEmployeesLoading(true);
    try {
      const res = await employeesApi.listByClient(user.clientId, ['employee', 'staff', 'seo_manager']);
      const payload = res.data as EmployeeRow[] | { items?: EmployeeRow[] } | null | undefined;
      if (res.success && Array.isArray(payload)) {
        setStaffEmployees(payload);
      } else if (
        res.success &&
        payload &&
        !Array.isArray(payload) &&
        Array.isArray(payload.items)
      ) {
        setStaffEmployees(payload.items);
      } else {
        setStaffEmployees([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load employees';
      toast.error(msg);
      setStaffEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, [user?.role, user?.clientId]);

  const staffEmployeesTotalPages = Math.max(1, Math.ceil(staffEmployees.length / STAFF_LIST_ITEMS_PER_PAGE));
  const paginatedStaffEmployees = useMemo(() => {
    const start = (staffEmployeesPage - 1) * STAFF_LIST_ITEMS_PER_PAGE;
    return staffEmployees.slice(start, start + STAFF_LIST_ITEMS_PER_PAGE);
  }, [staffEmployees, staffEmployeesPage]);

  useEffect(() => {
    setStaffEmployeesPage((prev) => Math.min(prev, staffEmployeesTotalPages));
  }, [staffEmployeesTotalPages]);

  useEffect(() => {
    void loadStaffEmployees();
  }, [loadStaffEmployees]);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      setAssignableClients([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await clientsApi.list();
        if (!cancelled && res.success && Array.isArray(res.data)) {
          setAssignableClients(res.data);
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  // Map Product to InventoryItem for the table component
  const inventoryItems = useMemo((): InventoryItem[] => {
    return products.map((p) => ({
      ...p,
      id: p._id || '',
      client: p.client ?? null,
    }));
  }, [products]);

  // Filter and sort
  const filteredItems = useMemo(() => {
    let result = [...inventoryItems];

    if (search) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          (item.name?.toLowerCase() || '').includes(q) ||
          (item.sku?.toLowerCase() || '').includes(q) ||
          (item.category?.toLowerCase() || '').includes(q)
      );
    }

    if (stockStatus !== 'all') {
      result = result.filter((item) => {
        if (stockStatus === 'in-stock') return (item.stock || 0) > 10;
        if (stockStatus === 'low-stock') return (item.stock || 0) >= 1 && (item.stock || 0) <= 10;
        if (stockStatus === 'out-of-stock') return (item.stock || 0) === 0;
        return true;
      });
    }

    if (category && category !== 'All Categories') {
      const targetCategory = category.toLowerCase().trim();
      result = result.filter((item) => (item.category?.toLowerCase().trim() || '') === targetCategory);
    }

    result.sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      switch (sortConfig.key) {
        case 'name':
          return dir * (a.name?.localeCompare(b.name || '') || 0);
        case 'price':
          return dir * ((a.price || 0) - (b.price || 0));
        case 'stock':
          return dir * ((a.stock || 0) - (b.stock || 0));
        case 'updatedAt':
          return dir * (new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime());
        default:
          return 0;
      }
    });

    return result;
  }, [inventoryItems, search, stockStatus, category, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stockStatus, category]);

  const handleSort = useCallback((key: SortConfig['key']) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleSaveProduct = async (productData: Product | Partial<Product>) => {
    try {
      if (productModalMode === 'add') {
        if (!allowAdd) {
          toast.error('You are not allowed to add products');
          return;
        }
        const response = await productApi.create(productData as Product);
        if (response.success) {
          await fetchAllProducts();
          toast.success('Product created successfully');
          setIsProductModalOpen(false);
        } else {
          throw new Error(response.message);
        }
      } else if (selectedProduct?._id) {
        let body: Product | Partial<Product> = productData;
        if (inventoryEditorRole === 'inventory_manager') {
          const pd = productData as Partial<Product>;
          body = {};
          if (pd.title !== undefined) body.title = pd.title;
          else if (pd.name !== undefined) body.title = pd.name;
          if (pd.description !== undefined) body.description = pd.description;
        }
        const response = await productApi.update(selectedProduct._id, body);
        if (response.success) {
          await fetchAllProducts();
          toast.success(response.message || 'Product updated successfully');
          setIsProductModalOpen(false);
        } else {
          throw new Error(response.message);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product');
      throw error; // Re-throw to be handled by the modal if it has internal error state
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!productToDelete?._id) return;
    try {
      const response = await productApi.delete(productToDelete._id);
      if (response.success) {
        setProducts(prev => prev.filter(p => p._id !== productToDelete._id));
        toast.success('Product deleted successfully');
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[linear-gradient(165deg,#faf9f7_0%,#f7f5ff_45%,#f0f7ff_100%)] dark:bg-[linear-gradient(165deg,#09090b_0%,#0c0a12_50%,#09090b_100%)]">
        <div className="h-10 w-10 border-[3px] border-indigo-400/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (user && !canAccessInventoryEditor(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#faf9f7_0%,#f5f3ff_38%,#f3f8ff_72%,#faf8f5_100%)] dark:bg-[linear-gradient(165deg,#09090b_0%,#0c0a12_50%,#09090b_100%)]">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(199,210,254,0.35)_0%,transparent_65%)] blur-2xl dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_60%)]" />
        <div className="absolute top-1/3 left-[-8%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle_at_center,rgba(253,230,224,0.45)_0%,transparent_62%)] blur-2xl dark:opacity-40" />
        <div className="absolute bottom-[-15%] right-[20%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(219,234,254,0.5)_0%,transparent_58%)] blur-2xl dark:bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0%,transparent_55%)]" />
      </div>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InventorySkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="space-y-8 sm:space-y-10"
            >
              {/* Header */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md dark:border-indigo-500/25 dark:bg-indigo-950/35 dark:text-indigo-200">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
                        <LayoutGrid className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                      Stock Management
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                    Inventory Management
                  </h1>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={fetchAllProducts}

                    className="h-11 rounded-2xl border-violet-200/80 bg-white/80 px-4 text-sm font-semibold text-violet-900 shadow-[0_2px_8px_-2px_rgba(109,40,217,0.12)] backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white hover:shadow-[0_8px_24px_-8px_rgba(109,40,217,0.2)] dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-950/55"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="ml-2 hidden text-sm font-semibold sm:inline">Refresh</span>
                  </Button>
                  {allowAdd && (
                    <Button
                      onClick={() => {
                        setProductModalMode('add');
                        setSelectedProduct(null);
                        setIsProductModalOpen(true);
                      }}
                      className="h-11 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-[0_4px_20px_-4px_rgba(79,70,229,0.45)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(79,70,229,0.55)] active:translate-y-0"
                    >
                      <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
                      Add Product
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <InventoryStats items={inventoryItems} />

              {isClientRole(role) && user?.clientId && (
                <div className="space-y-6">
                  <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                          Employees
                          <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                            ({staffEmployees.length})
                          </span>
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Employees, staff, and SEO managers under your client account.
                        </p>
                      </div>
                    </div>
                    {employeesLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-violet-400/30 border-t-violet-600" />
                      </div>
                    ) : staffEmployees.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 py-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                        No employees yet. Use{' '}
                        <span className="font-semibold text-violet-700 dark:text-violet-300">Add employee</span> above.
                      </p>
                    ) : (
                      <>
                        <ul className="divide-y divide-slate-100 dark:divide-white/10">
                          {paginatedStaffEmployees.map((emp) => (
                            <li
                              key={emp._id}
                              className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-900 dark:text-white">{emp.name}</p>
                                  {emp.status ? (
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${emp.status === 'active'
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                      {emp.status}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {[emp.email || emp.phone, formatEmployeeRoleLabel(emp.role)].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              <p className="max-w-xl text-sm text-slate-600 dark:text-slate-400 sm:text-right">
                                {emp.address}
                              </p>
                            </li>
                          ))}
                        </ul>
                        {staffEmployeesTotalPages > 1 ? (
                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 px-3 text-xs"
                              onClick={() => setStaffEmployeesPage((prev) => Math.max(1, prev - 1))}
                              disabled={staffEmployeesPage <= 1}
                            >
                              Previous
                            </Button>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Page {staffEmployeesPage} of {staffEmployeesTotalPages}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 px-3 text-xs"
                              onClick={() =>
                                setStaffEmployeesPage((prev) => Math.min(staffEmployeesTotalPages, prev + 1))
                              }
                              disabled={staffEmployeesPage >= staffEmployeesTotalPages}
                            >
                              Next
                            </Button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </section>
                </div>
              )}

              {/* Filters */}
              <InventoryFilters
                search={search}
                onSearchChange={setSearch}
                stockStatus={stockStatus as any}
                onStockStatusChange={setStockStatus as any}
                category={category}
                onCategoryChange={setCategory}
              />

              {/* Table */}
              <InventoryTable
                items={paginatedItems}
                sortConfig={sortConfig}
                onSort={handleSort}
                showProductEdit={allowEditModal}
                showStockAdjust={allowStockShortcut}
                showProductDelete={allowDelete}
                onView={(item) => {
                  setSelectedProduct(products.find(p => p._id === item.id) || null);
                  setIsDetailModalOpen(true);
                }}
                onEdit={(item) => {
                  if (!allowEditModal) return;
                  setProductModalMode('edit');
                  setSelectedProduct(products.find(p => p._id === item.id) || null);
                  setIsProductModalOpen(true);
                }}
                onUpdateStock={(item) => {
                  if (!allowStockShortcut) return;
                  setProductModalMode('edit');
                  setSelectedProduct(products.find(p => p._id === item.id) || null);
                  setIsProductModalOpen(true);
                }}
                onDelete={(item) => {
                  if (!allowDelete) return;
                  setProductToDelete(products.find(p => p._id === item.id) || null);
                  setIsDeleteModalOpen(true);
                }}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        mode={productModalMode}
        product={selectedProduct}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        inventoryEditMode={productModalMode === 'add' ? 'admin' : inventoryEditorRole!}
        viewerRole={role}
        assignableClients={assignableClients}
      />

      <ProductDetailModal
        isOpen={isDetailModalOpen}
        product={selectedProduct}
        onClose={() => setIsDetailModalOpen(false)}
      />

      <DeleteConfirmModal
        open={isDeleteModalOpen}
        productName={productToDelete?.name || ''}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setIsDeleteModalOpen(false)}
      />



      <EmployeeModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        onCreated={() => {
          toast.success('Employee added successfully');
          setStaffEmployeesPage(1);
          void loadStaffEmployees();
        }}
      />

      <EmployeeModal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        role="staff"
        title="Add staff"
        subtitle="Create a staff login linked to this client account"
        submitLabel="Save staff"
        onCreated={() => {
          toast.success('Staff added successfully');
          setStaffEmployeesPage(1);
          void loadStaffEmployees();
        }}
      />

      <EmployeeModal
        isOpen={seoManagerModalOpen}
        onClose={() => setSeoManagerModalOpen(false)}
        role="seo_manager"
        title="Add SEO manager"
        subtitle="Create an SEO manager login linked to this client account"
        submitLabel="Save SEO manager"
        onCreated={() => {
          toast.success('SEO manager added successfully');
          setStaffEmployeesPage(1);
          void loadStaffEmployees();
        }}
      />
    </div>
  );
}
