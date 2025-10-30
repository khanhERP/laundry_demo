import {
  useState,
  useEffect,
  useMemo,
  Component,
  ErrorInfo,
  ReactNode,
} from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardOverview } from "@/components/reports/dashboard-overview";
import { SalesReport } from "@/components/reports/sales-report";
import { MenuReport } from "@/components/reports/menu-report";
import { TableReport } from "@/components/reports/table-report";
import { SalesChartReport } from "@/components/reports/sales-chart-report";
import { SpendingReport } from "@/components/reports/spending-report";
import { PriceListManagement } from "@/components/settings/price-list-management";
import { useTranslation } from "@/lib/i18n";
import {
  BarChart3,
  PieChart,
  ChevronDown,
  Package,
  ShoppingCart,
  UserCheck,
  Users,
  DollarSign,
  Settings as SettingsIcon,
  Printer,
  CreditCard,
  Tag,
  Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SalesOrders from "@/pages/sales-orders";
import PurchasesPage from "@/pages/purchases";
import CashBookPage from "@/pages/cash-book";

// Import existing page components - remove header/sidebar to embed
import CustomersPageContent from "@/components/embedded/customers-content";
import SuppliersPageContent from "@/components/embedded/suppliers-content";
import EmployeesPageContent from "@/components/embedded/employees-content";
import TablesPageContent from "@/components/embedded/tables-content";
import CategoryManagementContent from "@/components/category/category-management-content";
import ProductManagementContent from "@/components/product/product-management-content";
import { StoreSettingsContent } from "@/components/settings/store-settings-content";
import { UserManagementContent } from "@/components/settings/user-management-content";
import { EInvoiceSettingsContent } from "@/components/settings/einvoice-settings-content";
import { PrinterSettingsContent } from "@/components/settings/printer-settings-content";
import { PaymentMethodsSettingsContent } from "@/components/settings/payment-methods-settings-content";
import { GeneralSettingsContent } from "@/components/settings/general-settings-content";

interface ReportsPageProps {
  onLogout?: () => void;
}

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Report Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-600 text-lg mb-4">
            Đã xảy ra lỗi khi tải báo cáo
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper function to format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ReportsPage({ onLogout }: ReportsPageProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [salesSubTab, setSalesSubTab] = useState<
    "sales-orders" | "price-settings"
  >("sales-orders");
  const [categorySubTab, setCategorySubTab] = useState<
    | "products"
    | "customers"
    | "suppliers"
    | "employees"
    | "tables"
    | "price-lists"
  >("products");
  const [productSubTab, setProductSubTab] = useState<"products" | "categories">(
    "products",
  );
  const [settingsSubTab, setSettingsSubTab] = useState<
    "store" | "users" | "einvoice" | "printer" | "payment" | "general"
  >("store");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [quickRange, setQuickRange] = useState<string>("");

  // Date range state
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Fetch store settings to get user info
  const { data: storeSettings } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings"],
    queryFn: async () => {
      const response = await fetch("https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings");
      if (!response.ok) throw new Error("Failed to fetch store settings");
      return response.json();
    },
  });

  // Fetch stores list for filter dropdown
  const { data: storesData = [] } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings/list"],
    queryFn: async () => {
      try {
        const response = await fetch("https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings/list");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data)
          ? data.filter((store: any) => store.typeUser !== 1)
          : [];
      } catch (error) {
        console.error("Error fetching stores:", error);
        return [];
      }
    },
  });

  // Fetch orders with authentication-based filtering for overview tab
  const { data: ordersData } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/orders/list", startDate, endDate, storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        status: "all",
      });

      // Add store filter based on selection and user permission
      if (storeFilter === "all") {
        // When "all" is selected, pass "all" to let server handle permission logic
        params.append("storeFilter", "all");
      } else {
        // Specific store selected
        params.append("storeFilter", storeFilter);
      }

      console.log("🔍 Overview tab - Fetching orders with params:", {
        startDate,
        endDate,
        storeFilter,
        isAdmin: storeSettings?.isAdmin,
        url: `https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/orders/list?${params}`,
      });

      const response = await fetch(`https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/orders/list?${params}`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();

      console.log("✅ Overview tab - Orders fetched:", {
        total: data.orders?.length || 0,
        storeFilter,
        firstOrder: data.orders?.[0],
      });

      return data;
    },
    enabled: !!storeSettings,
    refetchOnMount: true,
  });

  // Calculate today's stats from orders data
  const todayStats = useMemo(() => {
    if (!ordersData?.orders)
      return { todaySales: 0, orders: 0, totalRevenue: 0, netRevenue: 0 };

    const orders = ordersData.orders.filter(
      (order: any) => order.status === "paid" || order.status === "completed",
    );
    const todaySales = orders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total || 0),
      0,
    );
    const totalRevenue = todaySales;
    const netRevenue = orders.reduce((sum: number, order: any) => {
      const subtotal = parseFloat(order.subtotal || 0);
      const discount = parseFloat(order.discount || 0);
      if (order.priceIncludeTax === true) {
        return sum + subtotal;
      }
      return sum + (subtotal - discount);
    }, 0);

    return {
      todaySales,
      orders: orders.length,
      totalRevenue,
      netRevenue,
    };
  }, [ordersData]);

  // Calculate daily revenue for chart based on current month
  const dailyRevenue = useMemo(() => {
    if (!ordersData?.orders || ordersData.orders.length === 0) {
      return [];
    }

    // Get current month's date range
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const dayRevenue = ordersData.orders
        .filter((order: any) => {
          if (!order.updatedAt) return false;
          const orderDate = order.updatedAt.split("T")[0];
          return orderDate === dateStr;
        })
        .reduce(
          (sum: number, order: any) => sum + parseFloat(order.total || 0),
          0,
        );

      // Only add days that have revenue data
      if (dayRevenue > 0) {
        result.push({
          revenue: dayRevenue,
          date: dateStr,
          day: day,
        });
      }
    }
    return result;
  }, [ordersData]);

  // Calculate top selling products from order items
  const topProducts = useMemo(() => {
    if (!ordersData?.orders) return [];

    const productMap = new Map();
    ordersData.orders.forEach((order: any) => {
      if (order.items) {
        order.items.forEach((item: any) => {
          const key = item.productId;
          if (!productMap.has(key)) {
            productMap.set(key, {
              name: item.productName,
              quantity: 0,
              revenue: 0,
            });
          }
          const product = productMap.get(key);
          product.quantity += parseInt(item.quantity || 0);
          product.revenue += parseFloat(item.total || 0);
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [ordersData]);

  // Calculate top customers
  const topCustomers = useMemo(() => {
    if (!ordersData?.orders) return [];

    const customerMap = new Map();
    ordersData.orders.forEach((order: any) => {
      const key = order.customerName || "Khách lẻ";
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: key,
          orders: 0,
        });
      }
      const customer = customerMap.get(key);
      customer.orders += parseFloat(order.total || 0);
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);
  }, [ordersData]);

  // Force refresh data when tab changes
  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
  }, [activeTab]);

  // Calculate pie chart colors
  const pieColors = ["#4A90E2", "#F5A623", "#7ED321", "#D0021B", "#BD10E0"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <POSHeader onLogout={onLogout} />
      <div className="pt-14">
        <div className="w-full bg-green-500">
          <div className="max-w-7xl mx-auto">
            {/* Top Navigation Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="bg-transparent h-14 w-full justify-center rounded-none p-0 gap-3 border-0">
                <TabsTrigger
                  value="overview"
                  className="text-white text-base font-medium px-6 py-4 rounded-md border-0 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-none hover:bg-green-600 transition-colors"
                >
                  {t("reports.dashboard")}
                </TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-2 text-white text-base font-medium px-6 py-4 rounded-md border-0 hover:bg-green-600 transition-colors ${
                        activeTab === "sales" ? "bg-green-600" : ""
                      }`}
                    >
                      {t("reports.sales")}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white">
                    <DropdownMenuItem
                      onClick={() => {
                        setActiveTab("sales");
                        setSalesSubTab("sales-orders");
                      }}
                      className="cursor-pointer hover:bg-green-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      {t("reports.salesOrderList")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setActiveTab("sales");
                        setSalesSubTab("price-settings");
                      }}
                      className="cursor-pointer hover:bg-green-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      {t("reports.priceSettings")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TabsTrigger
                  value="purchase"
                  className="text-white text-base font-medium px-6 py-4 rounded-md border-0 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-none hover:bg-green-600 transition-colors"
                >
                  {t("purchases.purchases")}
                </TabsTrigger>
                <TabsTrigger
                  value="cashbook"
                  className="text-white text-base font-medium px-6 py-4 rounded-md border-0 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-none hover:bg-green-600 transition-colors"
                >
                  {t("common.cashManagement")}
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="text-white text-base font-medium px-6 py-4 rounded-md border-0 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-none hover:bg-green-600 transition-colors"
                >
                  {t("reports.title")}
                </TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-2 text-white text-base font-medium px-6 py-4 rounded-md border-0 hover:bg-green-600 transition-colors ${
                        activeTab === "category" ? "bg-green-600" : ""
                      }`}
                    >
                      {t("settings.categories")}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white">
                    <DropdownMenuItem
                      onClick={() => {
                        setActiveTab("category");
                        setCategorySubTab("products");
                      }}
                      className="cursor-pointer hover:bg-green-100"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      {t("settings.productCategories")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setActiveTab("category");
                        setCategorySubTab("customers");
                      }}
                      className="cursor-pointer hover:bg-green-100"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {t("settings.customers")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setActiveTab("category");
                        setCategorySubTab("suppliers");
                      }}
                      className="cursor-pointer hover:bg-green-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      {t("settings.suppliers")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setActiveTab("category");
                        setCategorySubTab("employees");
                      }}
                      className="cursor-pointer hover:bg-green-100"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {t("settings.employees")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TabsTrigger
                  value="settings"
                  className="text-white text-base font-medium px-6 py-4 rounded-md border-0 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-none hover:bg-green-600 transition-colors"
                >
                  {t("settings.title")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsContent value="overview" className="space-y-6">
              {/* Store Filter and Date Range */}
              <Card className="bg-white shadow-sm">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        {t("reports.storeFilter")}
                      </label>
                      <select
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                      >
                        {storesData.filter((store: any) => store.typeUser !== 1)
                          .length > 1 && (
                          <option value="all">{t("common.all")}</option>
                        )}
                        {storesData
                          .filter((store: any) => store.typeUser !== 1)
                          .map((store: any) => (
                            <option key={store.id} value={store.storeCode}>
                              {store.storeName}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Khoảng thời gian
                      </label>
                      <Select
                        value={quickRange}
                        onValueChange={(value) => {
                          setQuickRange(value);
                          const today = new Date();
                          let start = new Date();
                          let end = new Date();

                          if (value === "today") {
                            start = today;
                            end = today;
                          } else if (value === "thisWeek") {
                            const dayOfWeek = today.getDay();
                            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                            start = new Date(today);
                            start.setDate(today.getDate() + diff);
                            end = today;
                          } else if (value === "lastWeek") {
                            const dayOfWeek = today.getDay();
                            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                            start = new Date(today);
                            start.setDate(today.getDate() + diff - 7);
                            end = new Date(start);
                            end.setDate(start.getDate() + 6);
                          } else if (value === "lastMonth") {
                            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                            end = new Date(today.getFullYear(), today.getMonth(), 0);
                          }

                          if (value) {
                            const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
                            const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
                            setStartDate(startStr);
                            setEndDate(endStr);
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 border-gray-300 hover:border-green-400 focus:border-green-500 focus:ring-green-500">
                          <SelectValue placeholder="Chọn nhanh" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Hôm nay</SelectItem>
                          <SelectItem value="thisWeek">Tuần này</SelectItem>
                          <SelectItem value="lastWeek">Tuần trước</SelectItem>
                          <SelectItem value="lastMonth">Tháng trước</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        {String(t("reports.startDate"))}
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        {String(t("reports.endDate"))}
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Card - Merged */}
              <Card className="bg-white shadow-sm border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    {t("reports.todaySalesResults")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Doanh số bán hàng */}
                    <div className="space-y-1 border-2 border-blue-200 rounded-lg p-4 text-center">
                      <p className="text-sm font-medium text-gray-600">
                        {t("reports.salesAmount")}
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {todayStats?.todaySales?.toLocaleString("vi-VN") || "0"}{" "}
                        ₫
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {startDate} ~ {endDate}
                      </p>
                    </div>

                    {/* Tổng đơn hàng */}
                    <div className="space-y-1 border-2 border-purple-200 rounded-lg p-4 text-center">
                      <p className="text-sm font-medium text-gray-600">
                        {t("reports.totalOrders")}
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {todayStats?.orders?.toLocaleString("vi-VN") || "0"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("reports.count")}
                      </p>
                    </div>

                    {/* Doanh thu thuần */}
                    <div className="space-y-1 border-2 border-green-200 rounded-lg p-4 text-center">
                      <p className="text-sm font-medium text-gray-600">
                        {t("reports.netRevenue")}
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {todayStats?.netRevenue?.toLocaleString("vi-VN") || "0"}{" "}
                        ₫
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("reports.afterDiscount")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Chart */}
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    {t("reports.dailySalesChart")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Bar Chart with proper X/Y axes */}
                  <TooltipProvider>
                  <div className="relative h-96 bg-gray-50 rounded-lg p-6">
                    {(() => {
                      // Generate all dates in the selected range
                      const start = new Date(startDate);
                      const end = new Date(endDate);
                      const dateArray: any[] = [];

                      // Loop through each day in the range
                      for (
                        let dt = new Date(start);
                        dt <= end;
                        dt.setDate(dt.getDate() + 1)
                      ) {
                        const dateStr = dt.toISOString().split("T")[0];

                        // Find revenue and order count for this date from ordersData - CHECK BY updatedAt
                        const dayOrders = ordersData?.orders?.filter((order: any) => {
                          if (!order.updatedAt) return false;
                          const orderDate = order.updatedAt.split("T")[0];
                          return orderDate === dateStr && (order.status === "paid" || order.status === "completed");
                        }) || [];

                        const dayRevenue = dayOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0);

                        // Always add ALL dates to array, even if revenue is 0
                        dateArray.push({
                          date: dateStr,
                          revenue: dayRevenue,
                          orderCount: dayOrders.length,
                          day: dt.getDate(),
                          month: dt.getMonth() + 1,
                          year: dt.getFullYear(),
                        });
                      }

                      if (dateArray.length === 0) {
                        return (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            {t("reports.noDataInDateRange")}
                          </div>
                        );
                      }

                      const maxRevenue = Math.max(
                        ...dateArray.map((d: any) => d.revenue),
                        100000, // Minimum scale
                      );

                      // Calculate Y-axis labels (5 levels)
                      const yAxisSteps = 5;
                      const yAxisLabels = [];
                      for (let i = 0; i <= yAxisSteps; i++) {
                        const value = (maxRevenue / yAxisSteps) * i;
                        yAxisLabels.push(value);
                      }

                      return (
                        <div className="flex h-full">
                          {/* Y-axis */}
                          <div className="flex flex-col justify-between pr-3 border-r border-gray-300 w-32">
                            {yAxisLabels.reverse().map((label, i) => (
                              <div key={i} className="text-xs text-gray-600 text-right">
                                {label.toLocaleString("vi-VN")}
                              </div>
                            ))}
                          </div>

                          {/* Chart area */}
                          <div className="flex-1 pl-4 flex items-end justify-start gap-2 overflow-x-auto pb-8 border-b border-gray-300">
                            {dateArray.map((day: any, index: number) => {
                              const heightPercent = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                              const hasData = day.revenue > 0;

                              return (
                                <Tooltip key={index}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex flex-col items-center group relative cursor-pointer"
                                      style={{
                                        minWidth: dateArray.length > 31 ? "28px" : dateArray.length > 14 ? "40px" : "56px",
                                        flex: dateArray.length <= 7 ? "1" : "0 0 auto",
                                        height: "100%",
                                      }}
                                    >
                                      {/* Bar container */}
                                      <div className="flex-1 w-full flex flex-col justify-end">
                                        {/* Revenue amount on top */}
                                        {hasData && (
                                          <div className="mb-1 text-center">
                                            <span className="text-xs font-semibold text-emerald-600">
                                              {day.revenue.toLocaleString("vi-VN")}
                                            </span>
                                          </div>
                                        )}

                                        {/* Bar */}
                                        <div
                                          className={`w-full rounded-t transition-all duration-300 ${
                                            hasData
                                              ? "bg-emerald-500 group-hover:bg-emerald-600"
                                              : "bg-gray-300"
                                          }`}
                                          style={{
                                            height: hasData ? `${Math.max(heightPercent, 5)}%` : "4px",
                                          }}
                                        />
                                      </div>

                                      {/* Date label (X-axis) */}
                                      <div className="mt-2 text-center">
                                        <span className={`text-xs font-medium ${
                                          hasData ? "text-gray-700" : "text-gray-400"
                                        }`}>
                                          {day.day}/{day.month}
                                        </span>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border-gray-200 shadow-xl">
                                    <div className="space-y-2">
                                      <div className="font-semibold text-sm border-b pb-1">
                                        {day.day}/{day.month}/{day.year}
                                      </div>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between gap-4">
                                          <span className="text-gray-600">{t("reports.revenueLabel")}:</span>
                                          <span className="font-bold text-emerald-600">
                                            {day.revenue.toLocaleString("vi-VN")} ₫
                                          </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                          <span className="text-gray-600">{t("reports.ordersLabel")}:</span>
                                          <span className="font-semibold text-gray-900">
                                            {day.orderCount}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  </TooltipProvider>

                  {/* Legend with stats */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                        <span className="text-sm text-gray-600">
                          {t("reports.salesRevenue")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                        <span className="text-sm text-gray-600">
                          {t("reports.noSalesData")}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {t("reports.total")}:{" "}
                      <span className="font-bold text-emerald-600">
                        {(() => {
                          const start = new Date(startDate);
                          const end = new Date(endDate);
                          let totalRevenue = 0;

                          for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                            const dateStr = dt.toISOString().split("T")[0];
                            const dayRevenue = ordersData?.orders
                              ?.filter((order: any) => {
                                if (!order.updatedAt && !order.createdAt) return false;
                                const orderDate = (order.updatedAt || order.createdAt).split("T")[0];
                                return orderDate === dateStr && (order.status === "paid" || order.status === "completed");
                              })
                              .reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0) || 0;
                            totalRevenue += dayRevenue;
                          }

                          return totalRevenue.toLocaleString("vi-VN");
                        })()}{" "}
                        ₫
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products and Top Customers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top 10 Best Selling Products */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {t("reports.topSellingItems")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-6">
                    {/* Product List */}
                    <div className="flex-1 space-y-3">
                      {topProducts
                        ?.slice(0, 5)
                        .map((product: any, index: number) => (
                          <div key={index} className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-semibold ${
                                index === 0
                                  ? "bg-yellow-100 text-yellow-600"
                                  : index === 1
                                    ? "bg-gray-100 text-gray-600"
                                    : index === 2
                                      ? "bg-orange-100 text-orange-600"
                                      : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {product.name}
                              </p>
                              <p className="text-xs text-blue-600">
                                ₫ {product.quantity?.toLocaleString("vi-VN")}{" "}
                                lần
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {product.revenue?.toLocaleString("vi-VN")} ₫
                            </p>
                          </div>
                        )) ||
                        [
                          {
                            name: "Giải 303 sờ rồi",
                            quantity: 64,
                            revenue: 231470,
                          },
                          {
                            name: "170. 복숭아 / Peach",
                            quantity: 61,
                            revenue: 307424,
                          },
                          {
                            name: "1 양갈비 꼬치. Xiên Sườn Cừu",
                            quantity: 28,
                            revenue: 47394,
                          },
                          {
                            name: "10 닭다리살 소금 꼬치. Xiên đùi gà nướng muối",
                            quantity: 27,
                            revenue: 27792,
                          },
                          {
                            name: "Phí ship/ 배송비",
                            quantity: 18,
                            revenue: 90909,
                          },
                        ].map((product, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-semibold ${
                                index === 0
                                  ? "bg-yellow-100 text-yellow-600"
                                  : index === 1
                                    ? "bg-gray-100 text-gray-600"
                                    : index === 2
                                      ? "bg-orange-100 text-orange-600"
                                      : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {product.name}
                              </p>
                              <p className="text-xs text-blue-600">
                                ₫ {product.quantity} lần
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {product.revenue.toLocaleString("vi-VN")} ₫
                            </p>
                          </div>
                        ))}
                    </div>

                    {/* Pie Chart */}
                    <div className="w-48 h-48 relative">
                      <svg
                        viewBox="0 0 100 100"
                        className="transform -rotate-90"
                      >
                        {topProducts
                          ?.slice(0, 5)
                          .reduce((acc: any[], product: any, index: number) => {
                            const total = topProducts
                              .slice(0, 5)
                              .reduce(
                                (sum: number, p: any) => sum + (p.revenue || 0),
                                0,
                              );
                            const percentage = (product.revenue / total) * 100;
                            const previousPercentage =
                              acc.length > 0 ? acc[acc.length - 1].endAngle : 0;

                            acc.push({
                              percentage,
                              color: pieColors[index % pieColors.length],
                              startAngle: previousPercentage,
                              endAngle: previousPercentage + percentage * 3.6,
                            });

                            return acc;
                          }, [])
                          .map((slice: any, index: number) => {
                            const startAngle = slice.startAngle;
                            const endAngle = slice.endAngle;
                            const largeArc =
                              endAngle - startAngle > 180 ? 1 : 0;

                            const x1 =
                              50 + 40 * Math.cos((Math.PI * startAngle) / 180);
                            const y1 =
                              50 + 40 * Math.sin((Math.PI * startAngle) / 180);
                            const x2 =
                              50 + 40 * Math.cos((Math.PI * endAngle) / 180);
                            const y2 =
                              50 + 40 * Math.sin((Math.PI * endAngle) / 180);

                            return (
                              <path
                                key={index}
                                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={slice.color}
                                stroke="white"
                                strokeWidth="1"
                              />
                            );
                          }) || (
                          <>
                            <path
                              d="M 50 50 L 50 10 A 40 40 0 0 1 86.4 36.4 Z"
                              fill="#4A90E2"
                              stroke="white"
                              strokeWidth="1"
                            />
                            <path
                              d="M 50 50 L 86.4 36.4 A 40 40 0 0 1 78 82 Z"
                              fill="#F5A623"
                              stroke="white"
                              strokeWidth="1"
                            />
                            <path
                              d="M 50 50 L 78 82 A 40 40 0 0 1 26 78 Z"
                              fill="#D0021B"
                              stroke="white"
                              strokeWidth="1"
                            />
                            <path
                              d="M 50 50 L 26 78 A 40 40 0 0 1 50 10 Z"
                              fill="#7ED321"
                              stroke="white"
                              strokeWidth="1"
                            />
                          </>
                        )}
                        <circle cx="50" cy="50" r="20" fill="white" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-xs text-gray-500">40%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top 10 Customers */}
                <Card className="bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                      {t("reports.topCustomers")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topCustomers
                      ?.slice(0, 10)
                      .map((customer: any, index: number) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {customer.name}
                            </span>
                            <span className="font-medium text-gray-900">
                              {customer.orders} đ
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${(customer.orders / (topCustomers[0]?.orders || 1)) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )) ||
                      [
                        { name: "Nguyễn Văn Hải", orders: 86 },
                        { name: "Phạm Thu Hương", orders: 62 },
                        { name: "Trần - Hà Nội", orders: 50 },
                        { name: "Quất Hương - Kim Mã", orders: 47 },
                        { name: "Xuất Huỳnh - Hải Dinn", orders: 5 },
                      ].map((customer, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {customer.name}
                            </span>
                            <span className="font-medium text-gray-900">
                              {customer.orders} đ
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${(customer.orders / 86) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="mt-0">
              {salesSubTab === "sales-orders" && <SalesOrders />}
              {salesSubTab === "price-settings" && <PriceListManagement />}
            </TabsContent>

            <TabsContent value="menu">
              <MenuReport />
            </TabsContent>

            <TabsContent value="table">
              <TableReport />
            </TabsContent>

            <TabsContent value="saleschart">
              <SalesChartReport />
            </TabsContent>

            <TabsContent value="purchase" className="mt-0">
              <PurchasesPage onLogout={onLogout} />
            </TabsContent>

            <TabsContent value="cashbook" className="mt-0">
              <CashBookPage onLogout={onLogout} />
            </TabsContent>

            <TabsContent value="reports">
              <Tabs defaultValue="sales-chart" className="w-full">
                <TabsList className="mb-4 bg-white h-14 w-full justify-start rounded-lg p-2 gap-2 border border-gray-200">
                  <TabsTrigger
                    value="sales-chart"
                    className="flex items-center gap-2 text-gray-700 px-4 py-2.5 rounded-md data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-gray-100 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {t("reports.dashboardTab")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="sales-analysis"
                    className="flex items-center gap-2 text-gray-700 px-4 py-2.5 rounded-md data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-gray-100 transition-colors"
                  >
                    <PieChart className="w-4 h-4" />
                    {t("reports.salesAnalysisTab")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="menu"
                    className="flex items-center gap-2 text-gray-700 px-4 py-2.5 rounded-md data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    {t("reports.productAnalysisTab")}
                  </TabsTrigger>

                  <TabsTrigger
                    value="spending"
                    className="flex items-center gap-2 text-gray-700 px-4 py-2.5 rounded-md data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-gray-100 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {t("reports.salesReportTab")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="expense"
                    className="flex items-center gap-2 text-gray-700 px-4 py-2.5 rounded-md data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    {t("reports.spendingReportTab")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sales-chart">
                  <DashboardOverview />
                </TabsContent>

                <TabsContent value="sales-analysis">
                  <SalesReport />
                </TabsContent>

                <TabsContent value="menu">
                  <MenuReport />
                </TabsContent>

                {storeSettings?.businessType !== "laundry" && (
                  <TabsContent value="table">
                    <TableReport />
                  </TabsContent>
                )}

                <TabsContent value="spending">
                  <ErrorBoundary>
                    <SalesChartReport />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="expense">
                  <SpendingReport />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="category">
              <div className="space-y-6">
                {categorySubTab === "products" && (
                  <Tabs
                    value={productSubTab}
                    onValueChange={(value) =>
                      setProductSubTab(value as "products" | "categories")
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-1">
                      <TabsTrigger
                        value="products"
                        className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {t("settings.productManagement")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="categories"
                        className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                      >
                        <Tag className="w-4 h-4 mr-2" />
                        {t("settings.categoryManagement")}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="products">
                      <ProductManagementContent />
                    </TabsContent>

                    <TabsContent value="categories">
                      <CategoryManagementContent />
                    </TabsContent>
                  </Tabs>
                )}
                {categorySubTab === "customers" && <CustomersPageContent />}
                {categorySubTab === "suppliers" && <SuppliersPageContent />}
                {categorySubTab === "employees" && <EmployeesPageContent />}
                {categorySubTab === "tables" && <TablesPageContent />}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="flex gap-6">
                {/* Left Sidebar Menu */}
                <div className="w-80 bg-white rounded-lg shadow-sm p-4 space-y-2 flex-shrink-0">
                  <button
                    onClick={() => setSettingsSubTab("store")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      settingsSubTab === "store"
                        ? "bg-green-100 text-green-700"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <SettingsIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">
                      {t("settings.storeManagement")}
                    </span>
                  </button>
                  {storeSettings?.isAdmin && (
                    <button
                      onClick={() => setSettingsSubTab("users")}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                        settingsSubTab === "users"
                          ? "bg-green-100 text-green-700"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <Users className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium whitespace-nowrap">
                        {t("settings.userManagement")}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => setSettingsSubTab("einvoice")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      settingsSubTab === "einvoice"
                        ? "bg-green-100 text-green-700"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="font-medium whitespace-nowrap">
                      {t("settings.einvoiceSetup")}
                    </span>
                  </button>

                  {storeSettings?.isAdmin && (
                    <button
                      onClick={() => setSettingsSubTab("general")}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                        settingsSubTab === "general"
                          ? "bg-green-100 text-green-700"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <SettingsIcon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium whitespace-nowrap">
                        {t("settings.generalSettings")}
                      </span>
                    </button>
                  )}
                </div>

                {/* Right Content Area */}
                <div className="flex-1">
                  {settingsSubTab === "store" && <StoreSettingsContent />}
                  {settingsSubTab === "users" && storeSettings?.isAdmin && (
                    <UserManagementContent />
                  )}
                  {settingsSubTab === "einvoice" && <EInvoiceSettingsContent />}
                  {settingsSubTab === "printer" && <PrinterSettingsContent />}
                  {settingsSubTab === "payment" && (
                    <PaymentMethodsSettingsContent />
                  )}
                  {settingsSubTab === "general" && <GeneralSettingsContent />}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}