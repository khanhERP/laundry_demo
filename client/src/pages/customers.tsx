
import { useState, useEffect } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Users, CreditCard, Plus, Edit, Trash2, Search, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { CustomerPointsModal } from "@/components/customers/customer-points-modal";
import { MembershipModal } from "@/components/membership/membership-modal";
import { PointsManagementModal } from "@/components/customers/points-management-modal";
import { Link } from "wouter";

interface CustomersPageProps {
  onLogout: () => void;
}

export default function CustomersPage({ onLogout }: CustomersPageProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showPointsManagementModal, setShowPointsManagementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch store settings to get user's store info
  const { data: userStore } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings"],
  });

  // Fetch store list for admin users
  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings/list"],
  });

  const isAdmin = userStore?.isAdmin || false;

  // Fetch customers with server-side pagination
  const { data: customersResponse, isLoading: customersLoading, refetch: refetchCustomers } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/customers", currentPage, pageSize, customerSearchTerm, storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: customerSearchTerm,
        storeFilter: storeFilter,
      });
      const response = await fetch(`https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/customers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
    staleTime: 30000,
    gcTime: 60000,
  });

  const customersData = customersResponse?.customers || [];
  const pagination = customersResponse?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleDeleteCustomer = async (customerId: number) => {
    if (!confirm(t("customers.confirmDelete"))) return;

    try {
      const response = await fetch(`https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await queryClient.refetchQueries({ queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/customers"] });

      toast({
        title: t("common.success"),
        description: t("settings.customerDeleteSuccess"),
      });
    } catch (error) {
      console.error("Customer delete error:", error);
      toast({
        title: t("common.error"),
        description: t("settings.customerDeleteError"),
        variant: "destructive",
      });
    }
  };

  const handleManagePoints = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowPointsModal(true);
  };

  const handleCloseCustomerForm = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  // Use server-side filtered and paginated data
  const filteredCustomers = customersData;
  const totalPages = pagination.totalPages;
  const allFilteredCustomers = customersData; // For total count display

  return (
    <div className="min-h-screen bg-green-50 grocery-bg">
      <POSHeader onLogout={onLogout} />
      <RightSidebar />
      
      <div className="main-content pt-16 px-6">
        <div className="max-w-7xl mx-auto py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t("customers.title")}</h1>
              <p className="mt-2 text-gray-600">{t("customers.description")}</p>
            </div>
            <div className="flex gap-4">
              <Link href="/sales-orders">
                <Button variant="outline">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {t('nav.pos')}
                </Button>
              </Link>
              <Button onClick={() => setShowCustomerForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("customers.addCustomer")}
              </Button>
            </div>
          </div>

          {/* Customer Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("customers.totalCustomers")}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {customersData ? customersData.length : 0}
                    </p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("customers.activeCustomers")}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {customersData
                        ? customersData.filter((c) => c.status === "active").length
                        : 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("customers.pointsIssued")}
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {customersData
                        ? customersData
                            .reduce((total, c) => total + (c.points || 0), 0)
                            .toLocaleString()
                        : 0}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("customers.averageSpent")}
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {customersData && customersData.length > 0
                        ? Math.round(
                            customersData.reduce(
                              (total, c) => total + parseFloat(c.totalSpent || "0"),
                              0,
                            ) / customersData.length,
                          ).toLocaleString()
                        : "0"}{" "}
                      ₫
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Management */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                {t("customers.customerManagement")}
              </CardTitle>
              <CardDescription>
                {t("customers.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <Input
                    placeholder={t("customers.searchPlaceholder")}
                    className="w-64"
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  />
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Chi nhánh:</Label>
                      <Select
                        value={storeFilter}
                        onValueChange={setStoreFilter}
                        disabled={storesLoading}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Tất cả chi nhánh" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả chi nhánh</SelectItem>
                          {storesData?.filter((store: any) => store.typeUser !== 1).map((store: any) => (
                            <SelectItem key={store.id} value={store.storeCode}>
                              {store.storeName || store.storeCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    {t("common.search")}
                  </Button>
                </div>
              </div>

              {customersLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t("customers.loadingCustomerData")}</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">{t("customers.noRegisteredCustomers")}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-8 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                    <div>{t("customers.customerId")}</div>
                    <div>{t("customers.name")}</div>
                    <div>{t("customers.phone")}</div>
                    <div>{t("customers.visitCount")}</div>
                    <div>{t("customers.totalSpent")}</div>
                    <div>{t("customers.points")}</div>
                    <div>{t("customers.membershipLevel")}</div>
                    <div className="text-center">{t("common.actions")}</div>
                  </div>

                  <div className="divide-y">
                    {filteredCustomers.map((customer) => (
                      <div key={customer.id} className="grid grid-cols-8 gap-4 p-4 items-center">
                        <div className="font-mono text-sm">{customer.customerId}</div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-600">{customer.phone || "-"}</div>
                        <div className="text-center">{customer.visitCount || 0}</div>
                        <div className="text-sm font-medium">
                          {parseFloat(customer.totalSpent || "0").toLocaleString()} ₫
                        </div>
                        <div className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => handleManagePoints(customer)}
                          >
                            {customer.points || 0}P
                          </Button>
                        </div>
                        <div>
                          <Badge
                            variant="default"
                            className={`${
                              customer.membershipLevel === "VIP"
                                ? "bg-purple-500"
                                : customer.membershipLevel === "GOLD"
                                  ? "bg-yellow-500"
                                  : customer.membershipLevel === "SILVER"
                                    ? "bg-gray-300 text-black"
                                    : "bg-gray-400"
                            } text-white`}
                          >
                            {customer.membershipLevel === "VIP"
                              ? t("customers.vip")
                              : customer.membershipLevel === "GOLD"
                                ? t("customers.gold")
                                : customer.membershipLevel === "SILVER"
                                  ? t("customers.silver")
                                  : customer.membershipLevel}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => handleManagePoints(customer)}
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteCustomer(customer.id)}
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
                    {t("customers.total")} {pagination.totalCount}{" "}
                    {t("customers.totalCustomersRegistered")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t("common.show")}</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="top">
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm font-medium">{t("common.rows")}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {t("common.page")} {currentPage} / {totalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={!pagination.hasPrev}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        >
                          «
                        </button>
                        <button
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                          disabled={!pagination.hasPrev}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                          disabled={!pagination.hasNext}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={!pagination.hasNext}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMembershipModal(true)}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {t("customers.membershipManagement")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPointsManagementModal(true)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t("customers.pointsManagement")}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={showCustomerForm}
        onClose={handleCloseCustomerForm}
        customer={editingCustomer}
      />

      {/* Customer Points Modal */}
      {selectedCustomer && (
        <CustomerPointsModal
          open={showPointsModal}
          onOpenChange={setShowPointsModal}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
        />
      )}

      {/* Membership Management Modal */}
      <MembershipModal
        isOpen={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
      />

      {/* Points Management Modal */}
      <PointsManagementModal
        isOpen={showPointsManagementModal}
        onClose={() => setShowPointsManagementModal(false)}
      />
    </div>
  );
}
