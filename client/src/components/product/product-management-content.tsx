import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, Plus, Edit, Trash2, Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import type { Product, Category } from "@shared/schema";
import { ProductManagerModal } from "@/components/pos/product-manager-modal";
import Cookies from "js-cookie";

export default function ProductManagementContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showProductManager, setShowProductManager] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const authToken = Cookies.get("authToken");
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        setIsAdmin(payload.isAdmin === true);
        console.log("🔑 Admin status checked:", payload.isAdmin);
      } catch (error) {
        console.error("Failed to parse auth token:", error);
      }
    }
  }, []);

  const { data: productsData, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["https://laundry-be-admin-demo.onrender.com/api/products"],
  });

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["https://laundry-be-admin-demo.onrender.com/api/categories"],
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`https://laundry-be-admin-demo.onrender.com/api/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.code || "Failed to delete product");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://laundry-be-admin-demo.onrender.com/api/products"] });
      toast({
        title: t("common.success"),
        description: t("common.productDeleteSuccess"),
      });
      setDeletingProduct(null);
    },
    onError: (error: Error) => {
      let errorMessage = t("common.productDeleteError");

      // Check for specific error codes
      if (error.message.includes("PRODUCT_IN_ORDER_ITEMS") || 
          error.message.includes("PRODUCT_IN_PURCHASE_ITEMS") ||
          error.message.includes("đơn hàng") ||
          error.message.includes("phiếu nhập kho")) {
        errorMessage = t("common.productDeleteInUseError");
      } else if (error.message.includes("ADMIN_REQUIRED")) {
        errorMessage = "Chỉ admin mới có quyền xóa sản phẩm";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: t("common.error"),
        description: errorMessage,
      });
      setDeletingProduct(null);
    },
  });

  const filteredProducts = productsData?.filter((product: Product) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
  ) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setProductSearchTerm(value);
    setCurrentPage(1);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categoriesData?.find((c) => c.id === categoryId);
    return category?.name || t("common.uncategorized");
  };

  return (
    <div className="space-y-6">
      {/* Product Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("settings.totalProducts")}</p>
                <p className="text-2xl font-bold text-green-600">{productsData?.length || 0}</p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("common.active")}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {productsData?.filter((p) => p.stock > 0).length || 0}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("settings.categories")}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {categoriesData?.length || 0}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("inventory.totalValue")}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {productsData
                    ? Math.round(
                        productsData.reduce(
                          (total, p) => total + parseFloat(p.price || "0") * (p.stock || 0),
                          0
                        )
                      ).toLocaleString()
                    : "0"}{" "}
                  ₫
                </p>
              </div>
              <Package className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                {t("settings.productManagementDesc")}
              </CardTitle>
            </div>
            <Button onClick={() => { setEditingProduct(null); setShowProductManager(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              {t("settings.addProduct")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Input
                placeholder={t("inventory.searchProducts")}
                className="w-64"
                value={productSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4 mr-2" />
                {t("common.search")}
              </Button>
            </div>
          </div>

          {productsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t("common.loading")}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{t("inventory.noProducts")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-8 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                <div>{t("common.sku")}</div>
                <div>{t("inventory.productName")}</div>
                <div>{t("common.category")}</div>
                <div>{t("common.price")}</div>
                <div>{t("common.stock")}</div>
                <div>{t("settings.unit")}</div>
                <div>{t("common.status")}</div>
                <div className="text-center">{t("common.actions")}</div>
              </div>

              <div className="divide-y">
                {paginatedProducts.map((product) => (
                  <div key={product.id} className="grid grid-cols-8 gap-4 p-4 items-center">
                    <div className="font-mono text-sm">{product.sku || "-"}</div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">{getCategoryName(product.categoryId)}</div>
                    <div className="text-sm font-medium">
                      {parseFloat(product.price || "0").toLocaleString()} ₫
                    </div>
                    <div className="text-center">{product.stock || 0}</div>
                    <div className="text-sm text-gray-600">{product.unit || "-"}</div>
                    <div>
                      {product.trackInventory !== false ? (
                        <Badge
                          variant="default"
                          className={`${
                            product.stock > 0
                              ? "bg-green-500"
                              : "bg-red-500"
                          } text-white`}
                        >
                          {product.stock > 0 ? t("common.active") : t("common.outOfStock")}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-blue-500 text-white">
                          {t("common.active")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(product); setShowProductManager(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setDeletingProduct(product)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {t("common.total")} {filteredProducts.length} {t("common.product")}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t("common.show")}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="15">15</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm font-medium">{t("common.rows")}</span>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {currentPage} / {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Manager Modal */}
      <ProductManagerModal
        isOpen={showProductManager}
        onClose={() => { setShowProductManager(false); setEditingProduct(null); }}
        product={editingProduct}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  {t("settings.confirmDeleteProductTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-left">
                  <div className="space-y-3">
                    <p>
                      {t("settings.confirmDeleteProductDesc")}{" "}
                      <span className="font-semibold text-gray-900">
                        "{deletingProduct?.name}"
                      </span>
                      ?
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-1 h-full bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-red-700">
                          <strong>{t("common.warning")}:</strong>{" "}
                          {t("settings.deleteProductWarning")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t("settings.deleteProductDetails")}
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel
                  onClick={() => setDeletingProduct(null)}
                  className="hover:bg-gray-100"
                >
                  {t("common.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingProduct && deleteProductMutation.mutate(deletingProduct.id)}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  disabled={deleteProductMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteProductMutation.isPending ? t("common.deleting") : t("settings.deleteProductAction")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}