import React, { useState, useEffect, useMemo, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  FileText,
  Calendar,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  BarChart3,
  Search,
  Download, // Import Download icon
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as XLSX from "xlsx"; // Import xlsx for Excel export
import { Button } from "@/components/ui/button";

// Import the ProductManagerModal component
import { ProductManagerModal } from "../pos/product-manager-modal"; // Assuming the path

export function SalesChartReport({ isAdmin }: { isAdmin?: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [analysisType, setAnalysisType] = useState("time");
  const [concernType, setConcernType] = useState("time");

  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endTime, setEndTime] = useState<string>("23:59");
  const [salesMethod, setSalesMethod] = useState("all");
  const [salesChannel, setSalesChannel] = useState("all");

  // State for store filter
  const [storeFilter, setStoreFilter] = useState<string>("all");

  // Additional filters from legacy reports
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [productType, setProductType] = useState("all");
  const [customerStatus, setCustomerStatus] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [selectedFloor, setSelectedFloor] = useState<string>("all"); // State for floor filter
  const [selectedShop, setSelectedShop] = useState<string>("all"); // State for floor filter

  // Pagination state for product report
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(15);

  // Customer Report with Pagination State
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(15);

  // Employee Report with Pagination State
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(15);

  // State for Product Manager Modal
  const [showProductManager, setShowProductManager] = useState(false);
  const [searchSKU, setSearchSKU] = useState("");

  // Query store settings for priceIncludesTax
  const { data: storeSettings, isLoading: storesLoading } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings"],
    queryFn: async () => {
      const response = await fetch("https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings");
      if (!response.ok) {
        throw new Error("Failed to fetch store settings");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query orders by date range - using proper order data with datetime
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: [
      "https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/orders/date-range",
      startDate,
      endDate,
      startTime,
      endTime,
      selectedFloor, // Include floor filter in query key
      orderStatusFilter, // Include status filter in query key
      storeFilter, // Include store filter in query key - this will trigger refetch when changed
      storeSettings?.isAdmin, // Include admin status in query key
      storeSettings?.parent, // Include parent stores in query key
    ],
    queryFn: async () => {
      try {
        // Create full datetime strings with proper timezone handling
        const startDateTime = `${startDate}T${startTime}:00`;
        const endDateTime = `${endDate}T${endTime}:59`;

        // Create Date objects directly without timezone adjustment
        const startDateTimeLocal = new Date(startDateTime);
        const endDateTimeLocal = new Date(endDateTime);

        // Format to ISO string to ensure consistent format
        const startDateTimeISO = startDateTimeLocal.toISOString();
        const endDateTimeISO = endDateTimeLocal.toISOString();

        // Construct URL with floor filter if it's not 'all'
        const floorFilter =
          selectedFloor !== "all" ? `/${selectedFloor}` : "/all";

        // Add storeFilter query parameter - ALWAYS include it
        const params = new URLSearchParams();
        params.append("storeFilter", storeFilter || "all");

        const queryString = params.toString();
        const url = `https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/orders/date-range/${startDateTimeISO}/${endDateTimeISO}${floorFilter}?${queryString}`;

        console.log("Sales Chart - Fetching orders with date range:", {
          startDate,
          endDate,
          startTime,
          endTime,
          startDateTime,
          endDateTime,
          startDateTimeISO,
          endDateTimeISO,
          localTimezoneOffset: startDateTimeLocal.getTimezoneOffset(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          selectedFloor,
          orderStatusFilter,
          storeFilter,
          isAdmin: storeSettings?.isAdmin,
          parentStores: storeSettings?.parent,
          floorFilter,
          finalURL: url,
        });

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Filter orders by status on client side
        let filteredData = Array.isArray(data) ? data : [];
        if (orderStatusFilter && orderStatusFilter !== "all") {
          filteredData = filteredData.filter((order: any) => {
            if (orderStatusFilter === "paid") {
              return order.status === "completed" || order.status === "paid";
            } else if (orderStatusFilter === "pending") {
              return (
                order.status === "pending" ||
                order.status === "in_progress" ||
                order.status === "confirmed" ||
                order.status === "preparing" ||
                order.status === "ready" ||
                order.status === "served"
              );
            } else if (orderStatusFilter === "cancelled") {
              return order.status === "cancelled";
            }
            return true;
          });
        }

        // Apply store filter logic based on admin status and selection
        console.log("Sales Chart - Store filter logic:", {
          storeFilter,
          isAdmin: storeSettings?.isAdmin,
          parentStores: storeSettings?.parent,
          beforeFilterCount: filteredData.length,
        });

        if (storeFilter === "all") {
          // Case: "Tất cả" (All) selected
          if (storeSettings?.isAdmin === true) {
            // Case 1: isAdmin = true + "all" selected => Load ALL orders
            console.log("Sales Chart - Admin 'All' filter: Loading all orders");
            // No filtering needed - use all data
          } else {
            // Case 2: isAdmin = false + "all" selected => Load orders from parent stores only
            const parentStores =
              storeSettings?.parent?.split(",").map((s: string) => s.trim()) ||
              [];
            if (parentStores.length > 0) {
              filteredData = filteredData.filter((order: any) =>
                parentStores.includes(order.storeCode),
              );
              console.log(
                "Sales Chart - Non-admin 'All' filter: Loading parent store orders only:",
                {
                  parentStores,
                  filteredCount: filteredData.length,
                },
              );
            } else {
              console.log(
                "Sales Chart - Non-admin 'All' filter: No parent stores defined, returning empty",
              );
              filteredData = [];
            }
          }
        } else if (storeFilter && storeFilter !== "all") {
          // Case 3: Specific store selected => Load orders for that store only
          filteredData = filteredData.filter(
            (order: any) => order.storeCode === storeFilter,
          );
          console.log("Sales Chart - Specific store filter applied:", {
            storeFilter,
            beforeCount: data?.length || 0,
            afterCount: filteredData.length,
            sampleStoreCode: filteredData[0]?.storeCode,
          });
        }

        console.log("Sales Chart - Orders loaded with datetime:", {
          count: filteredData?.length || 0,
          totalCount: data?.length || 0,
          startDateTimeISO,
          endDateTimeISO,
          orderStatusFilter,
          storeFilter,
          isAdmin: storeSettings?.isAdmin,
          afterServerFilter: true,
          sampleOrder: filteredData?.[0]
            ? {
                id: filteredData[0].id,
                orderNumber: filteredData[0].orderNumber,
                orderedAt: filteredData[0].orderedAt,
                status: filteredData[0].status,
                storeCode: filteredData[0].storeCode,
              }
            : null,
        });
        return filteredData;
      } catch (error: any) {
        console.error("Sales Chart - Error fetching orders:", error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 500,
    staleTime: 0, // Disable cache to ensure fresh data on filter change
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Query store list for filter
  const { data: storesFilterData = [] } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings/list"],
    queryFn: async () => {
      try {
        const response = await fetch("https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/store-settings/list");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        let data = await response.json();
        // Filter out admin accounts (userType = 1)
        data = data.filter((store: any) => store.typeUser !== 1);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching stores:", error);
        return [];
      }
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Query order items for all orders
  const { data: orderItems = [], isLoading: orderItemsLoading } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/order-items"],
    queryFn: async () => {
      try {
        const response = await fetch("https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/order-items");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // console.log("Sales Chart - Order items loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Sales Chart - Error fetching order items:", error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 500,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: analysisType === "product", // Only fetch when needed
  });

  // Refetch orders when analysisType or storeFilter changes
  useEffect(() => {
    if (refetchOrders) {
      console.log("🔄 Refetching orders due to filter change:", {
        analysisType,
        storeFilter,
      });
      refetchOrders();
    }
  }, [analysisType, storeFilter, refetchOrders]);

  // Query tables for floor data
  const {
    data: tables,
    isLoading: tablesLoading,
    error: tablesError,
  } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/tables"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Combined loading state
  const isLoading = ordersLoading || orderItemsLoading || storesLoading;

  const { data: employees } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: products } = useQuery({
    queryKey: [
      "https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/products",
      selectedCategory,
      productType,
      productSearch,
      startDate,
      endDate,
      storeFilter, // Include store filter in query key
    ],
    queryFn: async () => {
      const storeParam =
        storeFilter && storeFilter !== "all" ? `?storeCode=${storeFilter}` : "";
      const response = await fetch(`https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/products${storeParam}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    staleTime: 0, // Disable cache to ensure fresh data
    enabled: analysisType === "product", // Only fetch when needed
  });

  const { data: categories } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/categories", storeFilter],
    queryFn: async () => {
      const storeParam =
        storeFilter && storeFilter !== "all" ? `?storeCode=${storeFilter}` : "";
      const response = await fetch(`https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/categories${storeParam}`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/customers", customerSearch, customerStatus],
    queryFn: async () => {
      const response = await fetch(
        `https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/customers/${customerSearch || "all"}/${customerStatus}`,
      );
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Product Analysis Data from new API
  const {
    data: productAnalysisData,
    isLoading: productAnalysisLoading,
    error: productAnalysisError,
  } = useQuery({
    queryKey: [
      "https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/product-analysis",
      startDate,
      endDate,
      startTime,
      endTime,
      selectedCategory,
      productType,
      selectedFloor, // Include floor filter in query key
      productSearch,
      storeFilter, // Include store filter in query key
    ],
    queryFn: async () => {
      try {
        // Use YYYY-MM-DD format with time to avoid timezone conversion issues
        const startDateTimeLocal = `${startDate} ${startTime}:00`;
        const endDateTimeLocal = `${endDate} ${endTime}:59`;

        const params = new URLSearchParams({
          categoryId: selectedCategory || "all",
          productType: productType || "all",
          productSearch: productSearch || "",
        });

        // Construct URL with floor filter if it's not 'all'
        const floorFilter =
          selectedFloor !== "all" ? `/${selectedFloor}` : "/all";

        // Construct URL with store filter if it's not 'all'
        const storeCodeFilter =
          storeFilter !== "all" ? `/${storeFilter}` : "/all";

        console.log("📊 Fetching product analysis data:", {
          startDateTimeLocal,
          endDateTimeLocal,
          floorFilter,
          storeCodeFilter,
          params: params.toString(),
        });

        const response = await fetch(
          `https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/product-analysis/${encodeURIComponent(startDateTimeLocal)}/${encodeURIComponent(endDateTimeLocal)}${floorFilter}${storeCodeFilter}?${params}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "❌ Product analysis API error:",
            response.status,
            errorText,
          );
          // Return empty data structure instead of throwing
          return { productStats: [], totalRevenue: 0, totalQuantity: 0 };
        }

        const data = await response.json();
        console.log(
          "✅ Product analysis data received:",
          data?.productStats?.length || 0,
          "products",
        );
        return data || { productStats: [], totalRevenue: 0, totalQuantity: 0 };
      } catch (error) {
        console.error("❌ Product analysis query error:", error);
        // Return empty data structure instead of throwing
        return { productStats: [], totalRevenue: 0, totalQuantity: 0 };
      }
    },
    enabled: analysisType === "product",
    staleTime: 1 * 60 * 1000, // Reduced cache time for fresh data
    retry: 2,
    retryDelay: 1000,
  });

  const { data: transactions } = useQuery({
    queryKey: ["https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/transactions"],
    staleTime: 5 * 60 * 1000,
  });

  // Utility functions
  const formatCurrency = (amount: number | string | undefined | null) => {
    // Handle undefined, null, empty string, and NaN cases
    const numAmount = Number(amount);
    if (isNaN(numAmount) || amount === null || amount === undefined) {
      return "0 ₫";
    }
    // Remove decimal formatting and use floor to remove decimals
    return `${Math.floor(numAmount).toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: t("common.cash"),
      card: t("common.creditCard"),
      creditCard: t("common.creditCard"),
      credit_card: t("common.creditCard"),
      debitCard: t("common.debitCard"),
      debit_card: t("common.debitCard"),
      transfer: t("common.transfer"),
      einvoice: t("reports.einvoice"),
      momo: t("common.momo"),
      zalopay: t("common.zalopay"),
      vnpay: t("common.vnpay"),
      qrCode: t("common.qrCode"),
      shopeepay: t("common.shopeepay"),
      grabpay: t("common.grabpay"),
      mobile: "Mobile",
    };
    return labels[method as keyof typeof labels] || method;
  };

  // Function to format payment methods, handling JSON strings for multiple methods
  const formatPaymentMethodDisplay = (
    paymentMethod: string | undefined | null,
  ) => {
    if (!paymentMethod) return "-";

    try {
      const parsed = JSON.parse(paymentMethod);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Multiple payment methods
        return parsed
          .map(
            (pm: { method: string; amount: number }) =>
              `${getPaymentMethodLabel(pm.method)}: ${formatCurrency(pm.amount)}`,
          )
          .join("\n"); // Use newline for better readability in tooltips/cells
      } else {
        // Not a valid JSON array, or empty array, treat as single method
        return getPaymentMethodLabel(paymentMethod);
      }
    } catch (e) {
      // If parsing fails, treat as a single payment method
      return getPaymentMethodLabel(paymentMethod);
    }
  };

  // Function to get unique floors from tables data
  const getUniqueFloors = (): string[] => {
    if (!tables || !Array.isArray(tables)) {
      return [];
    }
    const floors = tables
      .map((table: any) => table.floor)
      .filter((floor: any) => floor !== null && floor !== undefined);
    return Array.from(new Set(floors)).sort();
  };

  // Function to get fixed floors
  const getFixedFloors = (): string[] => {
    // Provide 10 fixed floors as requested
    return Array.from({ length: 10 }, (_, i) => `Tầng ${i + 1}`);
  };

  const getStoresFilter = (): any[] => {
    return storesFilterData;
  };

  // Function to get available floors, considering both fixed and dynamic data
  const getAvailableFloors = (): string[] => {
    const uniqueFloors = getUniqueFloors();
    const fixedFloors = getFixedFloors();

    // Combine and ensure uniqueness, prioritizing uniqueFloors if they exist
    // If uniqueFloors are empty, use fixedFloors. Otherwise, combine them.
    const allFloors = uniqueFloors.length > 0 ? uniqueFloors : fixedFloors;

    // Further processing if needed, but for now, return unique ones
    return Array.from(new Set(allFloors)).sort();
  };

  const getReportTitle = () => {
    switch (analysisType) {
      case "time":
        const concernTypes = {
          time: t("reports.timeSalesReport"),
          profit: t("reports.profitByInvoiceReport"),
          discount: t("reports.invoiceDiscountReport"),
          return: t("reports.returnByInvoiceReport"),
          employee: t("reports.employeeSalesReport"),
          salesDetail: t("reports.salesDetailReport"),
        };
        return (
          concernTypes[concernType as keyof typeof concernTypes] ||
          t("reports.salesReport")
        );
      case "product":
        return t("reports.inventoryReport");
      case "employee":
        return t("reports.employeeSalesReport");
      case "customer":
        return t("reports.topCustomersByRevenue");
      case "salesMethod":
        return t("reports.salesMethodReport");
      default:
        return t("reports.salesReport");
    }
  };

  // State for expandable rows
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>(
    {},
  );

  // Pagination state for sales report
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Get dashboard stats from orders data
  const getDashboardStats = () => {
    try {
      // Add proper loading and error checks
      if (ordersLoading || orderItemsLoading) {
        return {
          periodRevenue: 0,
          periodSubtotalRevenue: 0,
          periodOrderCount: 0,
          periodCustomerCount: 0,
          dailyAverageRevenue: 0,
          activeOrders: 0,
          occupiedTables: 0,
          monthRevenue: 0,
          monthSubtotalRevenue: 0,
          averageOrderValue: 0,
          peakHour: 12,
          totalTables: Array.isArray(tables) ? tables.length : 0,
          filteredCompletedOrders: [],
        };
      }

      // Ensure we have valid arrays - add null checks
      let validOrders = Array.isArray(orders) ? orders : [];
      const validOrderItems = Array.isArray(orderItems) ? orderItems : [];
      const validTables = Array.isArray(tables) && tables ? tables : [];

      // Filter completed/paid orders for time analysis (exclude cancelled orders)
      const completedOrders = validOrders.filter(
        (order: any) => order.status === "paid" || order.status === "completed",
      );

      console.log("Sales Chart - Orders loaded:", {
        totalOrders: validOrders.length,
        completedOrders: completedOrders.length,
        totalOrderItems: validOrderItems.length,
        dateRange: `${startDate} to ${endDate}`,
        sampleCompletedOrder: completedOrders[0]
          ? {
              id: completedOrders[0].id,
              total: completedOrders[0].total,
              subtotal: completedOrders[0].subtotal,
              status: completedOrders[0].status,
              date:
                completedOrders[0].orderedAt || completedOrders[0].createdAt,
            }
          : null,
      });

      // Calculate total sales revenue using dashboard formula
      let periodRevenue = 0;
      let periodSubtotalRevenue = 0;

      completedOrders.forEach((order: any) => {
        const orderSubtotal = Number(order.subtotal || 0);
        const orderDiscount = Number(order.discount || 0);
        const orderTax = Number(order.tax || 0);
        const orderPriceIncludeTax = order.priceIncludeTax === true;

        // Calculate revenue based on priceIncludeTax setting (same as dashboard)
        let doanhThu;
        if (orderPriceIncludeTax) {
          // When priceIncludeTax = true: doanh thu = subtotal - tax
          doanhThu = orderSubtotal - orderTax;
        } else {
          // When priceIncludeTax = false: doanh thu = subtotal - discount
          doanhThu = Math.max(0, orderSubtotal - orderDiscount);
        }

        periodRevenue += doanhThu;
        periodSubtotalRevenue += orderSubtotal;
      });

      // Total count from completed orders only
      const periodOrderCount = completedOrders.length;

      // Count unique customers from completed orders
      const uniqueCustomers = new Set();

      completedOrders.forEach((order: any) => {
        if (order.customerId) {
          uniqueCustomers.add(order.customerId);
        } else if (
          order.customerName &&
          order.customerName !== "Khách hàng lẻ"
        ) {
          uniqueCustomers.add(order.customerName);
        } else {
          uniqueCustomers.add(`order_${order.id}`);
        }
      });

      const periodCustomerCount = uniqueCustomers.size;

      // Calculate days difference for average
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1,
      );
      const dailyAverageRevenue = periodRevenue / daysDiff;

      // Active orders (pending/in-progress orders only from all current orders)
      const activeOrders = validOrders.filter(
        (order: any) =>
          order.status === "pending" ||
          order.status === "in_progress" ||
          order.status === "confirmed" ||
          order.status === "preparing" ||
          order.status === "ready" ||
          order.status === "served",
      ).length;

      const occupiedTables = validTables.filter(
        (table: any) => table.status === "occupied",
      );

      // Month revenue: same as period revenue for the selected date range
      const monthRevenue = periodRevenue;
      const monthSubtotalRevenue = periodSubtotalRevenue;

      // Average order value
      const averageOrderValue =
        periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

      // Peak hours analysis from completed orders only
      const hourlyOrders: { [key: number]: number } = {};

      completedOrders.forEach((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        if (!isNaN(orderDate.getTime())) {
          const hour = orderDate.getHours();
          hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
        }
      });

      const peakHour = Object.keys(hourlyOrders).reduce(
        (peak, hour) =>
          hourlyOrders[parseInt(hour)] > (hourlyOrders[parseInt(peak)] || 0)
            ? hour
            : peak,
        "12",
      );

      const finalStats = {
        periodRevenue,
        periodSubtotalRevenue,
        periodOrderCount,
        periodCustomerCount,
        dailyAverageRevenue,
        activeOrders,
        occupiedTables: occupiedTables.length,
        monthRevenue,
        monthSubtotalRevenue,
        averageOrderValue,
        peakHour: parseInt(peakHour),
        totalTables: validTables.length,
        filteredCompletedOrders: completedOrders,
      };

      console.log("Sales Chart Debug - Final Stats:", {
        periodRevenue,
        periodOrderCount,
        periodCustomerCount,
        dateRange: `${startDate} to ${endDate}`,
      });

      return finalStats;
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      return {
        periodRevenue: 0,
        periodOrderCount: 0,
        periodCustomerCount: 0,
        dailyAverageRevenue: 0,
        activeOrders: 0,
        occupiedTables: 0,
        monthRevenue: 0,
        averageOrderValue: 0,
        peakHour: 12,
        totalTables: 0,
        filteredCompletedOrders: [],
      };
    }
  };

  // Function to export data to Excel
  const exportToExcel = (dataToExport: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  // Sales Report Component Logic using dashboard stats
  const renderSalesReport = () => {
    if (ordersLoading || orderItemsLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const dashboardStats = getDashboardStats();

    if (!dashboardStats) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Không có dữ liệu</div>
        </div>
      );
    }

    const { filteredCompletedOrders } = dashboardStats;

    // Convert orders to transaction-like format for compatibility
    const filteredTransactions = filteredCompletedOrders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber, // Ensure orderNumber is included if available
      transactionId: order.orderNumber,
      total: order.total,
      subtotal: order.priceIncludeTax
        ? Number(order.subtotal || 0) + Number(order.tax || 0)
        : order.subtotal,
      discount: order.discount || 0,
      paymentMethod: order.paymentMethod || "",
      createdAt: order.updatedAt,
      created_at: order.updatedAt,
      customerName: order.customerName,
      tax: order.tax || 0,
      customerId: order.customerId,
      cashierName: order.employeeName || order.cashierName,
      employeeId: order.employeeId,
      items: order.items || [],
      status: order.status,
      priceIncludeTax: order.priceIncludeTax, // Include priceIncludeTax
    }));

    // Calculate daily sales from filtered completed orders
    let dailySales: {
      [date: string]: {
        orders: number;
        revenue: number;
        customers: number;
        discount: number;
        tax: number;
        subtotal: number;
      };
    } = {};

    console.log("Processing filtered completed orders:", {
      count: filteredCompletedOrders.length,
      sampleOrder: filteredCompletedOrders[0],
    });

    filteredCompletedOrders.forEach((order: any) => {
      try {
        // Use correct date field from order - prioritize createdAt for consistency with API filter
        const orderDate = new Date(
          order.updatedAt ||
            order.created_at ||
            order.orderedAt ||
            order.paidAt ||
            order.date,
        );

        if (isNaN(orderDate.getTime())) {
          console.warn("Invalid date for order:", order.id);
          return;
        }

        const dateStr = orderDate.toISOString().split("T")[0];

        if (!dailySales[dateStr]) {
          dailySales[dateStr] = {
            orders: 0,
            revenue: 0,
            customers: 0,
            discount: 0,
            tax: 0,
            subtotal: 0,
          };
        }

        // Check priceIncludeTax setting from order
        const orderPriceIncludeTax = order.priceIncludeTax === true;
        const orderSubtotal = Number(order.subtotal || 0);
        let orderDiscount = Number(order.discount || 0);
        const orderTax = Number(order.tax || 0);
        const orderTotal = Number(order.total || 0);

        console.log(`📊 [Order ${order.orderNumber || order.id}] - BEFORE PROCESSING:`, {
          orderNumber: order.orderNumber,
          orderId: order.id,
          date: dateStr,
          rawDate: order.updatedAt,
          priceIncludeTax: orderPriceIncludeTax,
          subtotal: orderSubtotal,
          discount: orderDiscount,
          tax: orderTax,
          total: orderTotal,
          itemsCount: order.items?.length || 0,
        });

        if (orderDiscount == 0) {
          const filteredOrderItems = order.items.filter(
            (item: any) => Number(item.discount || "0") > 0,
          );
          orderDiscount = filteredOrderItems.reduce(
            (sum: number, item: any) => sum + Number(item.discount || "0"),
            0,
          );
          console.log(`📊 [Order ${order.orderNumber || order.id}] - Discount from items:`, {
            itemsWithDiscount: filteredOrderItems.length,
            calculatedDiscount: orderDiscount,
          });
        }

        // Calculate revenue based on priceIncludeTax setting
        let doanhThu;
        if (orderPriceIncludeTax) {
          // When priceIncludeTax = true: doanh thu = subtotal - tax
          doanhThu = orderSubtotal - orderTax;
          console.log(`📊 [Order ${order.orderNumber || order.id}] - Revenue calc (priceIncludeTax=true):`, {
            formula: 'subtotal - tax',
            subtotal: orderSubtotal,
            tax: orderTax,
            revenue: doanhThu,
          });
        } else {
          // When priceIncludeTax = false: doanh thu = subtotal - discount
          doanhThu = orderSubtotal - orderDiscount;
          console.log(`📊 [Order ${order.orderNumber || order.id}] - Revenue calc (priceIncludeTax=false):`, {
            formula: 'subtotal - discount',
            subtotal: orderSubtotal,
            discount: orderDiscount,
            revenue: doanhThu,
          });
        }

        dailySales[dateStr].orders += 1;
        dailySales[dateStr].revenue += doanhThu; // Doanh thu (net after discount)
        dailySales[dateStr].customers += Number(order.customerCount || 1);
        dailySales[dateStr].discount += orderDiscount; // Giảm giá từ DB
        dailySales[dateStr].tax += orderTax; // Thuế
        dailySales[dateStr].subtotal += orderSubtotal; // Subtotal from API

        console.log(`📊 [Order ${order.orderNumber || order.id}] - AFTER ADDING TO DAILY SALES:`, {
          date: dateStr,
          addedRevenue: doanhThu,
          cumulativeRevenue: dailySales[dateStr].revenue,
          cumulativeOrders: dailySales[dateStr].orders,
          cumulativeSubtotal: dailySales[dateStr].subtotal,
          cumulativeDiscount: dailySales[dateStr].discount,
          cumulativeTax: dailySales[dateStr].tax,
        });
      } catch (error) {
        console.warn("❌ Error processing order for daily sales:", error, order);
      }
    });

    console.log("📊 ========== DAILY SALES SUMMARY ==========");
    console.log("Daily sales calculated:", dailySales);
    console.log("📊 Total days with sales:", Object.keys(dailySales).length);
    Object.entries(dailySales).forEach(([date, data]) => {
      console.log(`📊 [${date}] Summary:`, {
        orders: data.orders,
        revenue: data.revenue,
        subtotal: data.subtotal,
        discount: data.discount,
        tax: data.tax,
        customers: data.customers,
        avgRevenuePerOrder: data.orders > 0 ? (data.revenue / data.orders).toFixed(2) : 0,
      });
    });
    console.log("📊 ==========================================");

    const paymentMethods: {
      [method: string]: { count: number; revenue: number };
    } = {};

    filteredCompletedOrders.forEach((order: any) => {
      const method = order.paymentMethod || "";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, revenue: 0 };
      }
      paymentMethods[method].count += 1;

      // Use correct revenue formula: Doanh thu = Thành tiền - Giảm giá
      const orderSubtotal = Number(order.subtotal || 0); // Thành tiền
      let discount = Number(order.discount || 0); // Giảm giá
      if (discount == 0) {
        const filteredOrderItems = order.items.filter(
          (item: any) => Number(item.discount || "0") > 0,
        );
        discount = filteredOrderItems.reduce(
          (sum: number, item: any) => sum + Number(item.discount || "0"),
          0,
        );
      }
      const orderRevenue = Math.max(0, orderSubtotal - discount);
      paymentMethods[method].revenue += orderRevenue;
      
      console.log(`💳 [Payment Method: ${method}] Order ${order.orderNumber || order.id}:`, {
        subtotal: orderSubtotal,
        discount: discount,
        revenue: orderRevenue,
        cumulativeRevenue: paymentMethods[method].revenue,
      });
    });

    console.log("📊 ========== PAYMENT METHODS SUMMARY ==========");
    console.log("Payment methods calculated:", paymentMethods);
    Object.entries(paymentMethods).forEach(([method, data]) => {
      console.log(`💳 [${method}]:`, {
        count: data.count,
        totalRevenue: data.revenue,
        avgPerTransaction: data.count > 0 ? (data.revenue / data.count).toFixed(2) : 0,
      });
    });
    console.log("📊 ===============================================");

    // Use dashboard stats directly for consistency
    const totalRevenue = dashboardStats.periodRevenue || 0; // Tổng thu từ bán hàng (sum of total)
    const subtotalRevenue = dashboardStats.periodSubtotalRevenue || 0; // Tổng doanh thu (sum of subtotal)
    const totalOrders = dashboardStats.periodOrderCount || 0;
    const totalCustomers = dashboardStats.periodCustomerCount || 0;
    const averageOrderValue = dashboardStats.averageOrderValue || 0;

    return (
      <>
        {/* Daily Sales */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.dailySales")}</CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>{t("reports.salesChartDescription")}</span>
              <Button
                onClick={() => {
                  const dataWithSummary = [
                    ...Object.entries(dailySales).map(([date, data]) => ({
                      Ngày: formatDate(date),
                      "Tổng số đơn hàng": data.orders,
                      "Doanh thu": formatCurrency(data.revenue),
                      Thuế: `${
                        data.revenue > 0
                          ? ((data.tax / data.revenue) * 100).toFixed(1)
                          : 0
                      }%`,
                      "Thành tiền": formatCurrency(data.subtotal),
                      "Khách hàng": data.customers,
                    })),
                    // Add summary row
                    {
                      Ngày: "TỔNG CỘNG",
                      "Tổng số đơn hàng": Object.values(dailySales).reduce(
                        (sum, data) => sum + data.orders,
                        0,
                      ),
                      "Doanh thu": formatCurrency(
                        Object.values(dailySales).reduce(
                          (sum, data) => sum + data.revenue,
                          0,
                        ),
                      ),
                      Thuế: `${(() => {
                        const totalTaxAmount = Object.values(dailySales).reduce(
                          (sum, data) => sum + data.tax,
                          0,
                        );
                        const totalRevenueAmount = Object.values(
                          dailySales,
                        ).reduce((sum, data) => sum + data.revenue, 0);
                        return totalRevenueAmount > 0
                          ? (
                              (totalTaxAmount / totalRevenueAmount) *
                              100
                            ).toFixed(1)
                          : "0";
                      })()}%`,
                      "Thành tiền": formatCurrency(
                        Object.values(dailySales).reduce(
                          (sum, data) => sum + data.subtotal,
                          0,
                        ),
                      ),
                      "Khách hàng": Object.values(dailySales).reduce(
                        (sum, data) => sum + data.customers,
                        0,
                      ),
                    },
                  ];
                  exportToExcel(
                    dataWithSummary,
                    `DailySales_${startDate}_to_${endDate}`,
                  );
                }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t("common.exportExcel")}
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <div className="overflow-x-auto xl:overflow-x-visible">
                <Table className="w-full min-w-[1400px] xl:min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="text-center border-r bg-green-50 w-12 font-bold"
                        rowSpan={2}
                      ></TableHead>
                      <TableHead
                        className="text-center border-r bg-green-50 min-w-[120px] font-bold"
                        rowSpan={2}
                      >
                        {t("reports.date")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[100px] font-bold"
                        rowSpan={2}
                      >
                        {t("reports.orders")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[140px] font-bold"
                        rowSpan={2}
                      >
                        {t("reports.thanhTien")}
                      </TableHead>
                      {analysisType !== "employee" && (
                        <TableHead
                          className="text-center border-r min-w-[120px] font-bold"
                          rowSpan={2}
                        >
                          {t("reports.discount")}
                        </TableHead>
                      )}
                      <TableHead
                        className="text-center border-r min-w-[140px] font-bold"
                        rowSpan={2}
                      >
                        {t("reports.revenue")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[120px] font-bold"
                        rowSpan={2}
                      >
                        {t("common.tax")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[140px] font-bold"
                        rowSpan={2}
                      >
                        {t("reports.totalMoney")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r bg-blue-50 min-w-[200px] font-bold"
                        colSpan={(() => {
                          // Get all unique payment methods from completed orders (including from JSON)
                          const allPaymentMethods = new Set();
                          if (
                            filteredCompletedOrders &&
                            Array.isArray(filteredCompletedOrders)
                          ) {
                            filteredCompletedOrders.forEach((order: any) => {
                              const paymentMethod =
                                order.paymentMethod || "cash";

                              // Try to parse as JSON for multi-payment
                              try {
                                const parsed = JSON.parse(paymentMethod);
                                if (
                                  Array.isArray(parsed) &&
                                  parsed.length > 0
                                ) {
                                  // Multi-payment: add all methods from JSON
                                  parsed.forEach((pm: any) => {
                                    if (pm.method) {
                                      allPaymentMethods.add(pm.method);
                                    }
                                  });
                                } else {
                                  // Single payment method
                                  allPaymentMethods.add(paymentMethod);
                                }
                              } catch (e) {
                                // Not JSON, treat as single payment method
                                allPaymentMethods.add(paymentMethod);
                              }
                            });
                          }
                          return allPaymentMethods.size;
                        })()}
                      >
                        {t("reports.totalCustomerPayment")}
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      {(() => {
                        // Get all unique payment methods from completed orders (including from JSON)
                        const allPaymentMethods = new Set();
                        if (
                          filteredCompletedOrders &&
                          Array.isArray(filteredCompletedOrders)
                        ) {
                          filteredCompletedOrders.forEach((order: any) => {
                            const paymentMethod = order.paymentMethod || "cash";

                            // Try to parse as JSON for multi-payment
                            try {
                              const parsed = JSON.parse(paymentMethod);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                // Multi-payment: add all methods from JSON
                                parsed.forEach((pm: any) => {
                                  if (pm.method) {
                                    allPaymentMethods.add(pm.method);
                                  }
                                });
                              } else {
                                // Single payment method
                                allPaymentMethods.add(paymentMethod);
                              }
                            } catch (e) {
                              // Not JSON, treat as single payment method
                              allPaymentMethods.add(paymentMethod);
                            }
                          });
                        }

                        const paymentMethodsArray =
                          Array.from(allPaymentMethods).sort();

                        return (
                          <>
                            {paymentMethodsArray.map(
                              (method: any, index: number) => (
                                <TableHead
                                  key={`payment-header-${index}-${method}`}
                                  className="text-center border-r bg-blue-50 min-w-[130px] font-bold"
                                >
                                  {getPaymentMethodLabel(method)}
                                </TableHead>
                              ),
                            )}
                          </>
                        );
                      })()}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(dailySales).length > 0 ? (
                      (() => {
                        const sortedEntries = Object.entries(dailySales).sort(
                          ([a], [b]) =>
                            new Date(b).getTime() - new Date(a).getTime(),
                        );
                        const totalPages = Math.ceil(
                          sortedEntries.length / pageSize,
                        );
                        const startIndex = (currentPage - 1) * pageSize;
                        const endIndex = startIndex + pageSize;
                        const paginatedEntries = sortedEntries.slice(
                          startIndex,
                          endIndex,
                        );

                        return paginatedEntries.map(([date, data]) => {
                          // Recalculate based on priceIncludeTax for this row
                          let rowPaymentAmount = 0; // Thành tiền
                          let rowActualRevenue = 0; // Doanh thu
                          let rowTax = 0; // Thuế
                          let rowCustomerPayment = 0; // Khách thanh toán

                          const dateTransactions = filteredTransactions.filter(
                            (transaction: any) => {
                              const transactionDate = new Date(
                                transaction.createdAt || transaction.created_at,
                              );
                              const year = transactionDate.getFullYear();
                              const month = (transactionDate.getMonth() + 1)
                                .toString()
                                .padStart(2, "0");
                              const day = transactionDate
                                .getDate()
                                .toString()
                                .padStart(2, "0");
                              const transactionDateStr = `${year}-${month}-${day}`;
                              return transactionDateStr === date;
                            },
                          );

                          dateTransactions.forEach((transaction: any) => {
                            const orderPriceIncludeTax =
                              transaction.priceIncludeTax === true;
                            const transactionSubtotal = Number(
                              transaction.subtotal || 0,
                            );
                            const transactionDiscount = Number(
                              transaction.discount || 0,
                            );
                            const transactionTax = Number(transaction.tax || 0);
                            const transactionTotal = Number(
                              transaction.total || 0,
                            );

                            // Fix calculation based on priceIncludeTax
                            let thanhTien, doanhThu;

                            if (orderPriceIncludeTax) {
                              // When priceIncludeTax = true: thành tiền = subtotal + discount
                              thanhTien =
                                transactionSubtotal +
                                transactionDiscount +
                                transactionTax;
                              doanhThu = transactionSubtotal - transactionTax; // Doanh thu = subtotal (already net of discount)
                            } else {
                              // When priceIncludeTax = false: thành tiền = subtotal
                              thanhTien = transactionSubtotal;
                              doanhThu =
                                transactionSubtotal - transactionDiscount; // Doanh thu = subtotal - discount
                            }

                            rowPaymentAmount += thanhTien;
                            rowActualRevenue += doanhThu;
                            rowTax += transactionTax;
                            rowCustomerPayment += transactionTotal;
                          });

                          const isExpanded = expandedRows[date] || false;

                          return (
                            <>
                              <TableRow key={date} className="hover:bg-gray-50">
                                <TableCell className="text-center border-r w-12">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setExpandedRows((prev) => ({
                                        ...prev,
                                        [date]: !prev[date],
                                      }));
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    type="button"
                                    aria-label={
                                      isExpanded ? "Thu gọn" : "Mở rộng"
                                    }
                                  >
                                    {isExpanded ? "−" : "+"}
                                  </button>
                                </TableCell>
                                <TableCell className="font-medium text-center border-r bg-green-50 min-w-[120px] px-4">
                                  {formatDate(date)}
                                </TableCell>
                                <TableCell className="text-center border-r min-w-[100px] px-4">
                                  {data.orders.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right border-r min-w-[140px] px-4">
                                  {(() => {
                                    // Calculate thành tiền according to correct logic with priceIncludeTax from orders
                                    let totalThanhTien = 0;
                                    dateTransactions.forEach(
                                      (transaction: any) => {
                                        const orderPriceIncludeTax =
                                          transaction.priceIncludeTax === true;
                                        const transactionSubtotal = Number(
                                          transaction.subtotal || 0,
                                        );
                                        const transactionDiscount = Number(
                                          transaction.discount || 0,
                                        );

                                        let thanhTien;
                                        if (orderPriceIncludeTax) {
                                          // priceIncludeTax = true: thành tiền = subtotal + discount
                                          thanhTien =
                                            transactionSubtotal +
                                            transactionDiscount;
                                        } else {
                                          // priceIncludeTax = false: thành tiền = subtotal
                                          thanhTien = transactionSubtotal;
                                        }
                                        totalThanhTien += thanhTien;
                                      },
                                    );

                                    return formatCurrency(totalThanhTien);
                                  })()}
                                </TableCell>
                                {analysisType !== "employee" && (
                                  <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                                    {formatCurrency(data.discount)}
                                  </TableCell>
                                )}
                                <TableCell className="text-right border-r text-green-600 font-medium min-w-[140px] px-4">
                                  {(() => {
                                    // Calculate correct revenue based on each order's priceIncludeTax setting
                                    let totalRevenue = 0;
                                    dateTransactions.forEach(
                                      (transaction: any) => {
                                        const orderPriceIncludeTax =
                                          transaction.priceIncludeTax === true;
                                        const transactionSubtotal = Number(
                                          transaction.subtotal || 0,
                                        );
                                        const transactionDiscount = Number(
                                          transaction.discount || 0,
                                        );

                                        const transactionTax = Number(
                                          transaction.tax || 0,
                                        );

                                        let doanhThu;
                                        if (orderPriceIncludeTax) {
                                          // priceIncludeTax = true: doanh thu = subtotal
                                          doanhThu =
                                            transactionSubtotal -
                                            transactionTax;
                                        } else {
                                          // priceIncludeTax = false: doanh thu = subtotal - discount
                                          doanhThu = Math.max(
                                            0,
                                            transactionSubtotal -
                                              transactionDiscount,
                                          );
                                        }
                                        totalRevenue += doanhThu;
                                      },
                                    );

                                    return formatCurrency(totalRevenue);
                                  })()}
                                </TableCell>
                                <TableCell className="text-right border-r min-w-[120px] px-4">
                                  {formatCurrency(rowTax)}
                                </TableCell>
                                <TableCell className="text-right border-r font-bold text-blue-600 min-w-[140px] px-4">
                                  {(() => {
                                    // Calculate total money customer paid based on correct logic
                                    let totalCustomerPayment = 0;
                                    dateTransactions.forEach(
                                      (transaction: any) => {
                                        const orderPriceIncludeTax =
                                          transaction.priceIncludeTax === true;
                                        const transactionSubtotal = Number(
                                          transaction.subtotal || 0,
                                        );
                                        const transactionDiscount = Number(
                                          transaction.discount || 0,
                                        );
                                        const transactionTax = Number(
                                          transaction.tax || 0,
                                        );
                                        const transactionTotal = Number(
                                          transaction.total || 0,
                                        );

                                        let customerPayment;
                                        if (orderPriceIncludeTax) {
                                          // priceIncludeTax = true: customer payment = total from DB
                                          customerPayment =
                                            transactionTotal - transactionTax;
                                        } else {
                                          // priceIncludeTax = false: customer payment = revenue + tax
                                          const revenue = Math.max(
                                            0,
                                            transactionSubtotal -
                                              transactionDiscount,
                                          );
                                          customerPayment =
                                            revenue + transactionTax;
                                        }
                                        totalCustomerPayment += customerPayment;
                                      },
                                    );
                                    return formatCurrency(totalCustomerPayment);
                                  })()}
                                </TableCell>
                                {(() => {
                                  // Group orders by payment method for this date
                                  const paymentMethodsForDate: {
                                    [method: string]: number;
                                  } = {};

                                  dateTransactions.forEach(
                                    (transaction: any) => {
                                      const paymentMethodStr =
                                        transaction.paymentMethod || "cash";

                                      // Parse payment method - check if it's multi-payment (JSON array)
                                      try {
                                        const parsed =
                                          JSON.parse(paymentMethodStr);
                                        if (
                                          Array.isArray(parsed) &&
                                          parsed.length > 0
                                        ) {
                                          // Multi-payment: use amounts directly from JSON
                                          parsed.forEach((pm: any) => {
                                            const method = pm.method || "cash";
                                            const amount = Number(
                                              pm.amount || 0,
                                            );
                                            paymentMethodsForDate[method] =
                                              (paymentMethodsForDate[method] ||
                                                0) + amount;
                                          });
                                        } else {
                                          // Not a valid array, treat as single payment method
                                          const transSubtotal = Number(
                                            transaction.subtotal || 0,
                                          );
                                          const transDiscount = Number(
                                            transaction.discount || 0,
                                          );
                                          const transTax = Number(
                                            transaction.tax || 0,
                                          );
                                          const transTotal = Number(
                                            transaction.total || 0,
                                          );

                                          const transCustomerPayment =
                                            transaction.priceIncludeTax === true
                                              ? transTotal
                                              : transSubtotal -
                                                transDiscount +
                                                transTax;

                                          paymentMethodsForDate[
                                            paymentMethodStr
                                          ] =
                                            (paymentMethodsForDate[
                                              paymentMethodStr
                                            ] || 0) + transCustomerPayment;
                                        }
                                      } catch (e) {
                                        // Not JSON, single payment method
                                        const transSubtotal = Number(
                                          transaction.subtotal || 0,
                                        );
                                        const transDiscount = Number(
                                          transaction.discount || 0,
                                        );
                                        const transTax = Number(
                                          transaction.tax || 0,
                                        );
                                        const transTotal = Number(
                                          transaction.total || 0,
                                        );

                                        const transCustomerPayment =
                                          transaction.priceIncludeTax === true
                                            ? transTotal
                                            : transSubtotal -
                                              transDiscount +
                                              transTax;

                                        paymentMethodsForDate[
                                          paymentMethodStr
                                        ] =
                                          (paymentMethodsForDate[
                                            paymentMethodStr
                                          ] || 0) + transCustomerPayment;
                                      }
                                    },
                                  );

                                  // Get all unique payment methods from all transactions
                                  const allPaymentMethods = new Set<string>();
                                  filteredTransactions.forEach(
                                    (transaction: any) => {
                                      const paymentMethodStr =
                                        transaction.paymentMethod || "cash";
                                      try {
                                        const parsed =
                                          JSON.parse(paymentMethodStr);
                                        if (
                                          Array.isArray(parsed) &&
                                          parsed.length > 0
                                        ) {
                                          parsed.forEach((pm: any) => {
                                            if (pm.method) {
                                              allPaymentMethods.add(pm.method);
                                            }
                                          });
                                        } else {
                                          allPaymentMethods.add(
                                            paymentMethodStr,
                                          );
                                        }
                                      } catch (e) {
                                        allPaymentMethods.add(paymentMethodStr);
                                      }
                                    },
                                  );

                                  const paymentMethodsArray =
                                    Array.from(allPaymentMethods).sort();

                                  return (
                                    <>
                                      {paymentMethodsArray.map(
                                        (method: any, methodIndex: number) => {
                                          const amount =
                                            paymentMethodsForDate[method] || 0;
                                          return (
                                            <TableCell
                                              key={`payment-${date}-${methodIndex}-${method}`}
                                              className="text-right border-r font-medium min-w-[130px] px-4"
                                            >
                                              {amount > 0
                                                ? formatCurrency(amount)
                                                : "-"}
                                            </TableCell>
                                          );
                                        },
                                      )}
                                    </>
                                  );
                                })()}
                              </TableRow>

                              {/* Expanded order details */}
                              {isExpanded &&
                                dateTransactions.length > 0 &&
                                dateTransactions.map(
                                  (transaction: any, txIndex: number) => (
                                    <TableRow
                                      key={`${date}-transaction-${transaction.id || txIndex}`}
                                      className="bg-blue-50/50 border-l-4 border-l-blue-400"
                                    >
                                      <TableCell className="text-center border-r bg-blue-50 w-12">
                                        <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                          └
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium text-center border-r bg-blue-50 text-blue-600 text-sm min-w-[120px] px-4">
                                        <div>
                                          {new Date(
                                            transaction.createdAt ||
                                              transaction.created_at,
                                          ).toLocaleDateString("vi-VN")}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {new Date(
                                            transaction.createdAt ||
                                              transaction.created_at,
                                          ).toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                          })}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                        <button
                                          onClick={() => {
                                            // Navigate to sales orders with order filter
                                            const orderNumber =
                                              transaction.orderNumber ||
                                              `ORD-${transaction.id}`;
                                            window.location.href = `/sales-orders?order=${orderNumber}`;
                                          }}
                                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
                                          title="Click to view order details"
                                        >
                                          {transaction.orderNumber ||
                                            transaction.transactionId ||
                                            `ORD-${transaction.id}` ||
                                            `TXN-${txIndex + 1}`}
                                        </button>
                                      </TableCell>
                                      <TableCell className="text-right border-r text-sm min-w-[140px] px-4">
                                        {(() => {
                                          // Calculate thành tiền for each transaction based on order's priceIncludeTax
                                          const orderPriceIncludeTax =
                                            transaction.priceIncludeTax ===
                                            true;
                                          const transactionSubtotal = Number(
                                            transaction.subtotal || 0,
                                          );
                                          const transactionDiscount = Number(
                                            transaction.discount || 0,
                                          );

                                          let thanhTien;
                                          if (orderPriceIncludeTax) {
                                            // priceIncludeTax = true: thành tiền = subtotal + discount
                                            thanhTien =
                                              transactionSubtotal +
                                              transactionDiscount;
                                          } else {
                                            // priceIncludeTax = false: thành tiền = subtotal
                                            thanhTien = transactionSubtotal;
                                          }

                                          return formatCurrency(thanhTien);
                                        })()}
                                      </TableCell>
                                      {analysisType !== "employee" && (
                                        <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                                          {formatCurrency(
                                            Number(transaction.discount || 0),
                                          )}
                                        </TableCell>
                                      )}
                                      <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[140px] px-4">
                                        {(() => {
                                          const transactionSubtotal = Number(
                                            transaction.subtotal || 0,
                                          );
                                          const transactionDiscount = Number(
                                            transaction.discount || 0,
                                          );

                                          const transactionTax = Number(
                                            transaction.tax || 0,
                                          );

                                          // Check priceIncludeTax from specific order
                                          const orderPriceIncludeTax =
                                            transaction.priceIncludeTax ===
                                            true;

                                          let doanhThu;
                                          if (orderPriceIncludeTax) {
                                            // priceIncludeTax = true: doanh thu = subtotal
                                            doanhThu =
                                              transactionSubtotal -
                                              transactionTax;
                                          } else {
                                            // priceIncludeTax = false: doanh thu = subtotal - discount
                                            doanhThu = Math.max(
                                              0,
                                              transactionSubtotal -
                                                transactionDiscount,
                                            );
                                          }

                                          return formatCurrency(doanhThu);
                                        })()}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                        {formatCurrency(
                                          Number(transaction.tax || 0),
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[140px] px-4">
                                        {(() => {
                                          const transactionSubtotal = Number(
                                            transaction.subtotal || 0,
                                          );
                                          const transactionDiscount = Number(
                                            transaction.discount || 0,
                                          );
                                          const transactionTax = Number(
                                            transaction.tax || 0,
                                          );
                                          const transactionTotal = Number(
                                            transaction.total || 0,
                                          );

                                          // Check priceIncludeTax from transaction or order
                                          const orderPriceIncludeTax =
                                            transaction.priceIncludeTax ===
                                            true;

                                          if (orderPriceIncludeTax) {
                                            // priceIncludeTax = true: customer payment = total from DB
                                            return formatCurrency(
                                              transactionTotal,
                                            );
                                          } else {
                                            // priceIncludeTax = false: customer payment = revenue + tax
                                            const revenue = Math.max(
                                              0,
                                              transactionSubtotal -
                                                transactionDiscount,
                                            );
                                            return formatCurrency(
                                              revenue + transactionTax,
                                            );
                                          }
                                        })()}
                                      </TableCell>
                                      {(() => {
                                        // Get all unique payment methods from all transactions
                                        const allPaymentMethods = new Set();
                                        if (
                                          filteredTransactions &&
                                          Array.isArray(filteredTransactions)
                                        ) {
                                          filteredTransactions.forEach(
                                            (trans: any) => {
                                              try {
                                                const parsed = JSON.parse(
                                                  trans.paymentMethod || "[]",
                                                );
                                                if (
                                                  Array.isArray(parsed) &&
                                                  parsed.length > 0
                                                ) {
                                                  parsed.forEach((pm: any) =>
                                                    allPaymentMethods.add(
                                                      pm.method,
                                                    ),
                                                  );
                                                } else {
                                                  allPaymentMethods.add(
                                                    trans.paymentMethod ||
                                                      "cash",
                                                  );
                                                }
                                              } catch (e) {
                                                allPaymentMethods.add(
                                                  trans.paymentMethod || "cash",
                                                );
                                              }
                                            },
                                          );
                                        }

                                        const paymentMethodsArray =
                                          Array.from(allPaymentMethods).sort();
                                        return (
                                          <>
                                            {paymentMethodsArray.map(
                                              (method: any) => {
                                                // Parse this transaction's payment method
                                                const transPaymentMethod =
                                                  transaction.paymentMethod ||
                                                  "cash";
                                                let transactionAmount = 0;

                                                try {
                                                  const parsed =
                                                    JSON.parse(
                                                      transPaymentMethod,
                                                    );
                                                  if (
                                                    Array.isArray(parsed) &&
                                                    parsed.length > 0
                                                  ) {
                                                    // Multi-payment: find amount for this method from JSON
                                                    const paymentItem =
                                                      parsed.find(
                                                        (pm: any) =>
                                                          pm.method === method,
                                                      );
                                                    if (paymentItem) {
                                                      transactionAmount =
                                                        Number(
                                                          paymentItem.amount ||
                                                            0,
                                                        );
                                                    }
                                                  } else {
                                                    // Not a valid array, treat as single payment
                                                    if (
                                                      transPaymentMethod ===
                                                      method
                                                    ) {
                                                      const transSubtotal =
                                                        Number(
                                                          transaction.subtotal ||
                                                            0,
                                                        );
                                                      const transDiscount =
                                                        Number(
                                                          transaction.discount ||
                                                            0,
                                                        );
                                                      const transTax = Number(
                                                        transaction.tax || 0,
                                                      );
                                                      const transTotal = Number(
                                                        transaction.total || 0,
                                                      );

                                                      transactionAmount =
                                                        transaction.priceIncludeTax ===
                                                        true
                                                          ? transTotal
                                                          : transSubtotal -
                                                            transDiscount +
                                                            transTax;
                                                    }
                                                  }
                                                } catch (e) {
                                                  // Not JSON, single payment method
                                                  if (
                                                    transPaymentMethod ===
                                                    method
                                                  ) {
                                                    const transSubtotal =
                                                      Number(
                                                        transaction.subtotal ||
                                                          0,
                                                      );
                                                    const transDiscount =
                                                      Number(
                                                        transaction.discount ||
                                                          0,
                                                      );
                                                    const transTax = Number(
                                                      transaction.tax || 0,
                                                    );
                                                    const transTotal = Number(
                                                      transaction.total || 0,
                                                    );

                                                    transactionAmount =
                                                      transaction.priceIncludeTax ===
                                                      true
                                                        ? transTotal
                                                        : transSubtotal -
                                                          transDiscount +
                                                          transTax;
                                                  }
                                                }

                                                return (
                                                  <TableCell
                                                    key={method}
                                                    className="text-right border-r text-sm min-w-[130px] px-4"
                                                  >
                                                    {transactionAmount > 0
                                                      ? formatCurrency(
                                                          transactionAmount,
                                                        )
                                                      : "-"}
                                                  </TableCell>
                                                );
                                              },
                                            )}
                                          </>
                                        );
                                      })()}
                                    </TableRow>
                                  ),
                                )}
                            </>
                          );
                        });
                      })()
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={(() => {
                            // Calculate dynamic colspan based on payment methods
                            const baseColumns =
                              analysisType !== "employee" ? 9 : 8;
                            const allPaymentMethods = new Set();
                            if (
                              filteredCompletedOrders &&
                              Array.isArray(filteredCompletedOrders)
                            ) {
                              filteredCompletedOrders.forEach((order: any) => {
                                const paymentMethod =
                                  order.paymentMethod || "cash";
                                try {
                                  const parsed = JSON.parse(paymentMethod);
                                  if (
                                    Array.isArray(parsed) &&
                                    parsed.length > 0
                                  ) {
                                    parsed.forEach((pm: any) => {
                                      if (pm.method) {
                                        allPaymentMethods.add(pm.method);
                                      }
                                    });
                                  } else {
                                    allPaymentMethods.add(paymentMethod);
                                  }
                                } catch (e) {
                                  allPaymentMethods.add(paymentMethod);
                                }
                              });
                            }
                            return baseColumns + allPaymentMethods.size;
                          })()}
                          className="text-center py-12"
                        >
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="text-6xl">📊</div>
                            <div className="text-lg font-medium text-gray-700">
                              {t("reports.noDataInDateRange")}
                            </div>
                            <div className="text-sm text-gray-500">
                              ({formatDate(startDate)} - {formatDate(endDate)})
                            </div>
                            <div className="text-sm text-gray-500 max-w-md">
                              {t("reports.tryDifferentDateRange")}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Summary Row */}
                    {Object.entries(dailySales).length > 0 && (
                      <TableRow className="bg-gray-100 font-bold border-t-2">
                        <TableCell className="text-center border-r w-12"></TableCell>
                        <TableCell className="text-center border-r bg-green-50 min-w-[120px] px-4">
                          {t("common.total")}
                        </TableCell>
                        <TableCell className="text-center border-r min-w-[100px] px-4">
                          {Object.values(dailySales).reduce(
                            (sum, data) => sum + data.orders,
                            0,
                          )}
                        </TableCell>
                        <TableCell className="text-right border-r min-w-[140px] px-4">
                          {(() => {
                            // Calculate total thành tiền for all transactions based on order's priceIncludeTax
                            let totalThanhTien = 0;
                            filteredTransactions.forEach((transaction: any) => {
                              const orderPriceIncludeTax =
                                transaction.priceIncludeTax === true;
                              const transactionSubtotal = Number(
                                transaction.subtotal || 0,
                              );
                              const transactionDiscount = Number(
                                transaction.discount || 0,
                              );

                              let thanhTien;
                              if (orderPriceIncludeTax) {
                                // priceIncludeTax = true: thành tiền = subtotal + discount
                                thanhTien =
                                  transactionSubtotal + transactionDiscount;
                              } else {
                                // priceIncludeTax = false: thành tiền = subtotal
                                thanhTien = transactionSubtotal;
                              }
                              totalThanhTien += thanhTien;
                            });

                            return formatCurrency(totalThanhTien);
                          })()}
                        </TableCell>
                        {analysisType !== "employee" && (
                          <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                            {formatCurrency(
                              Object.values(dailySales).reduce(
                                (sum, data) => sum + data.discount,
                                0,
                              ),
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right border-r text-green-600 min-w-[120px] px-4">
                          {(() => {
                            // Calculate total revenue based on each order's priceIncludeTax setting
                            let totalRevenue = 0;
                            filteredTransactions.forEach((transaction: any) => {
                              const orderPriceIncludeTax =
                                transaction.priceIncludeTax === true;
                              const transactionSubtotal = Number(
                                transaction.subtotal || 0,
                              );
                              const transactionDiscount = Number(
                                transaction.discount || 0,
                              );

                              const transactionTax = Number(
                                transaction.tax || 0,
                              );

                              let doanhThu;
                              if (orderPriceIncludeTax) {
                                // priceIncludeTax = true: doanh thu = subtotal
                                doanhThu = transactionSubtotal - transactionTax;
                              } else {
                                // priceIncludeTax = false: doanh thu = subtotal - discount
                                doanhThu = Math.max(
                                  0,
                                  transactionSubtotal - transactionDiscount,
                                );
                              }
                              totalRevenue += doanhThu;
                            });

                            return formatCurrency(totalRevenue);
                          })()}
                        </TableCell>
                        <TableCell className="text-right border-r min-w-[120px] px-4">
                          {formatCurrency(
                            Object.values(dailySales).reduce(
                              (sum, data) => sum + (data.tax || 0),
                              0,
                            ),
                          )}
                        </TableCell>
                        <TableCell className="text-right border-r text-blue-600 font-bold min-w-[140px] px-4">
                          {(() => {
                            // Calculate total customer payment from all transactions
                            let totalCustomerPayment = 0;
                            filteredTransactions.forEach((transaction: any) => {
                              const orderPriceIncludeTax =
                                transaction.priceIncludeTax === true;
                              const transactionSubtotal = Number(
                                transaction.subtotal || 0,
                              );
                              const transactionDiscount = Number(
                                transaction.discount || 0,
                              );
                              const transactionTax = Number(
                                transaction.tax || 0,
                              );
                              const transactionTotal = Number(
                                transaction.total || 0,
                              );

                              let customerPayment;
                              if (orderPriceIncludeTax) {
                                // priceIncludeTax = true: customer payment = total from DB
                                customerPayment = transactionTotal;
                              } else {
                                // priceIncludeTax = false: customer payment = revenue + tax
                                const revenue = Math.max(
                                  0,
                                  transactionSubtotal - transactionDiscount,
                                );
                                customerPayment = revenue + transactionTax;
                              }
                              totalCustomerPayment += customerPayment;
                            });
                            return formatCurrency(totalCustomerPayment);
                          })()}
                        </TableCell>
                        {(() => {
                          // Calculate total payment methods across all dates with proper multi-payment handling
                          const totalPaymentMethods: {
                            [method: string]: number;
                          } = {};

                          filteredTransactions.forEach((transaction: any) => {
                            const paymentMethodStr =
                              transaction.paymentMethod || "cash";

                            const transactionSubtotal = Number(
                              transaction.subtotal || 0,
                            );
                            const transactionDiscount = Number(
                              transaction.discount || 0,
                            );
                            const transactionTax = Number(transaction.tax || 0);
                            const transactionTotal = Number(
                              transaction.total || 0,
                            );

                            const customerPayment =
                              transaction.priceIncludeTax === true
                                ? transactionTotal
                                : transactionSubtotal -
                                  transactionDiscount +
                                  transactionTax;

                            // Try to parse as JSON for multi-payment
                            try {
                              const parsed = JSON.parse(paymentMethodStr);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                // Multi-payment: use amounts directly from JSON
                                parsed.forEach((pm: any) => {
                                  const method = pm.method || "cash";
                                  const amount = Number(pm.amount || 0);
                                  totalPaymentMethods[method] =
                                    (totalPaymentMethods[method] || 0) + amount;
                                });
                              } else {
                                // Not a valid JSON array, treat as single payment
                                totalPaymentMethods[paymentMethodStr] =
                                  (totalPaymentMethods[paymentMethodStr] || 0) +
                                  customerPayment;
                              }
                            } catch (e) {
                              // Not JSON, single payment method
                              totalPaymentMethods[paymentMethodStr] =
                                (totalPaymentMethods[paymentMethodStr] || 0) +
                                customerPayment;
                            }
                          });

                          // Get all unique payment methods from all completed orders
                          const allPaymentMethods = new Set();
                          if (
                            filteredCompletedOrders &&
                            Array.isArray(filteredCompletedOrders)
                          ) {
                            filteredCompletedOrders.forEach((order: any) => {
                              const paymentMethodStr =
                                order.paymentMethod || "cash";

                              // Parse to find all methods including multi-payment
                              try {
                                const parsed = JSON.parse(paymentMethodStr);
                                if (
                                  Array.isArray(parsed) &&
                                  parsed.length > 0
                                ) {
                                  parsed.forEach((pm: any) => {
                                    if (pm.method) {
                                      allPaymentMethods.add(pm.method);
                                    }
                                  });
                                } else {
                                  allPaymentMethods.add(paymentMethodStr);
                                }
                              } catch (e) {
                                allPaymentMethods.add(paymentMethodStr);
                              }
                            });
                          }

                          const paymentMethodsArray =
                            Array.from(allPaymentMethods).sort();

                          return (
                            <>
                              {paymentMethodsArray.map((method: any) => {
                                const total = totalPaymentMethods[method] || 0;
                                return (
                                  <TableCell
                                    key={method}
                                    className="text-right border-r font-bold text-green-600 min-w-[130px] px-4"
                                  >
                                    {total > 0 ? formatCurrency(total) : "-"}
                                  </TableCell>
                                );
                              })}
                            </>
                          );
                        })()}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination Controls for Daily Sales */}
            {Object.entries(dailySales).length > 0 && (
              <div className="flex items-center justify-between space-x-6 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{t("common.show")} </p>
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
                  <p className="text-sm font-medium"> {t("common.rows")}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">
                    {t("common.page")} {currentPage} /{" "}
                    {Math.ceil(Object.entries(dailySales).length / pageSize)}
                  </p>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      «
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            prev + 1,
                            Math.ceil(
                              Object.entries(dailySales).length / pageSize,
                            ),
                          ),
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(Object.entries(dailySales).length / pageSize)
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ›
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.ceil(
                            Object.entries(dailySales).length / pageSize,
                          ),
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(Object.entries(dailySales).length / pageSize)
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  // Sales Detail Report Component
  const renderSalesDetailReport = () => {
    if (ordersLoading || orderItemsLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    if (
      !orders ||
      !Array.isArray(orders) ||
      !orderItems ||
      !Array.isArray(orderItems)
    ) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Không có dữ liệu</div>
        </div>
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filter completed orders with all search criteria
    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);

      if (isNaN(orderDate.getTime())) {
        console.warn("Skipping order with invalid createdAt date:", order.id);
        return false;
      }

      // Apply floor filter
      const floorMatch =
        selectedFloor === "all" ||
        !order.tableId ||
        !tables ||
        !Array.isArray(tables) ||
        tables.find((table: any) => table.id === order.tableId)?.floor ===
          selectedFloor;

      const dateMatch = orderDate >= start && orderDate <= end;
      let statusMatch =
        order.status === "paid" ||
        order.status === "completed" ||
        order.status === "cancelled";
      if (orderStatusFilter !== "all") {
        if (orderStatusFilter == "completed") {
          statusMatch = order.status === "paid" || order.status === "completed";
        } else {
          order.status === orderStatusFilter;
        }
      }
      const employeeMatch = (() => {
        try {
          // No filter selected
          if (
            !selectedEmployee ||
            selectedEmployee === "all" ||
            selectedEmployee === ""
          ) {
            return true;
          }

          // Exact matches
          const safeSelectedEmployee =
            selectedEmployee && typeof selectedEmployee === "string"
              ? selectedEmployee.trim()
              : "";
          if (!safeSelectedEmployee) return true; // If filter is empty after trim

          const employeeNameMatch =
            order.employeeName && typeof order.employeeName === "string"
              ? order.employeeName.trim().toLowerCase() ===
                safeSelectedEmployee.toLowerCase()
              : false;
          const cashierNameMatch =
            order.cashierName && typeof order.cashierName === "string"
              ? order.cashierName.trim().toLowerCase() ===
                safeSelectedEmployee.toLowerCase()
              : false;
          const employeeIdMatch = order.employeeId
            ? order.employeeId.toString().toLowerCase() ===
              safeSelectedEmployee.toLowerCase()
            : false;

          // Partial matches for non-exact searches
          const nameIncludesSearch =
            order.employeeName &&
            typeof order.employeeName === "string" &&
            order.employeeName
              .toLowerCase()
              .includes(safeSelectedEmployee.toLowerCase());
          const cashierIncludesSearch =
            order.cashierName &&
            typeof order.cashierName === "string" &&
            order.cashierName
              .toLowerCase()
              .includes(safeSelectedEmployee.toLowerCase());

          return (
            employeeNameMatch ||
            cashierNameMatch ||
            employeeIdMatch ||
            nameIncludesSearch ||
            cashierIncludesSearch
          );
        } catch (error) {
          console.warn("Error in employee matching:", error);
          return true; // Include by default if there's an error
        }
      })();

      const customerMatch =
        !customerSearch ||
        (order.customerName &&
          order.customerName
            .toLowerCase()
            .includes(customerSearch.toLowerCase())) ||
        (order.customerId &&
          order.customerId
            .toString()
            .toLowerCase()
            .includes(customerSearch.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.includes(customerSearch));

      const orderMatch =
        !orderSearch ||
        (order.orderNumber &&
          order.orderNumber
            .toLowerCase()
            .includes(orderSearch.toLowerCase())) ||
        (order.id && order.id.toString().includes(orderSearch));

      return (
        dateMatch &&
        statusMatch &&
        employeeMatch &&
        customerMatch &&
        orderMatch &&
        floorMatch // Add floor match
      );
    });

    // Group orders with their items - using EXACT database values
    const groupedOrders: any[] = [];

    filteredOrders.forEach((order: any) => {
      // Get items for this order
      let orderItemsForOrder = orderItems.filter(
        (item: any) => item.orderId === order.id,
      );

      // Filter items by category if category filter is selected
      if (selectedCategory && selectedCategory !== "all") {
        orderItemsForOrder = orderItemsForOrder.filter((item: any) => {
          const product = products?.find((p: any) => p.id === item.productId);
          return product && product.categoryId?.toString() === selectedCategory;
        });
      }

      // Filter items by product search if search term exists
      if (productSearch && productSearch.trim() !== "") {
        orderItemsForOrder = orderItemsForOrder.filter(
          (item: any) =>
            item.productName
              ?.toLowerCase()
              .includes(productSearch.toLowerCase()) ||
            item.productSku
              ?.toLowerCase()
              .includes(productSearch.toLowerCase()),
        );
      }

      // Skip order if no items match the filters
      if (orderItemsForOrder.length === 0) {
        return;
      }

      // Use EXACT values from database
      let orderSubtotal = Number(order.subtotal || 0); // Thành tiền từ DB
      let orderDiscount = Number(order.discount || 0); // Giảm giá từ DB
      let orderTax =
        Number(order.tax || 0) ||
        Number(order.total || 0) - Number(order.subtotal || 0); // Thuế từ DB hoặc tính từ total-subtotal
      let orderTotal = Number(order.total || 0); // Tổng tiền từ DB
      let orderRevenue = orderSubtotal - orderDiscount; // Doanh thu = thành tiền - giêm giá

      if (order.priceIncludeTax === true) {
        orderSubtotal = orderSubtotal + orderDiscount + orderTax; // Thành tiền = subtotal + discount + tax
        orderRevenue = orderSubtotal - orderDiscount - orderTax; // Doanh thu = subtotal + tax
        orderTotal = orderRevenue + orderTax;
      } else {
        orderTotal = orderRevenue + orderTax;
      }

      const orderSummary = {
        orderDate: order.orderedAt || order.createdAt || order.created_at,
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        customerId: order.customerId || "",
        customerName: order.customerName || "",
        totalAmount: orderSubtotal, // Thành tiền từ DB
        discount: orderDiscount, // Giảm giá từ DB
        revenue: orderRevenue, // Doanh thu = thành tiền - giêm giá
        tax: orderTax, // Thuế từ DB
        vat: orderTax, // VAT = thuế
        totalMoney: orderTotal, // Tổng tiền từ DB
        notes: order.notes || "",
        salesChannel: order.tableId ? "Ăn tại chỗ" : "Mang về",
        tableName: order.tableId ? `Bàn ${order.tableId}` : "",
        employeeName: order.employeeName || order.cashierName || "Unknown",
        status:
          order.status === "paid"
            ? `${t("common.paid")}`
            : order.status === "completed"
              ? `${t("common.completed")}`
              : order.status === "cancelled"
                ? `${t("common.cancelled")}`
                : order.status,
        items:
          orderItemsForOrder.length === 0
            ? [
                {
                  productCode: "-",
                  productName: "Đơn hàng trống",
                  unit: "-",
                  quantity: 0,
                  unitPrice: 0,
                  totalAmount: orderSubtotal, // Sử dụng thành tiền từ order
                  discount: orderDiscount, // Giảm giá từ order
                  revenue: orderRevenue, // Doanh thu từ order
                  tax: orderTax, // Thuế từ order
                  vat: orderTax, // VAT = thuế
                  totalMoney: orderTotal, // Tổng tiền từ order
                  productGroup: "-",
                  taxRate: 0, // Default tax rate for items
                },
              ]
            : orderItemsForOrder.map((item: any) => {
                // Sử dụng giá trị CHÍNH XÁC từ order_items và order
                const itemQuantity = Number(item.quantity || 1);
                let itemUnitPrice = Number(item.unitPrice || 0); // Đơn giá từ order_items
                let itemTotal = itemUnitPrice * itemQuantity; // Thành tiền = đơn giá * số lượng (trước thuế)

                // Phân bổ giảm giá và thuế theo tỷ lệ của item trong tổng order
                const itemDiscountRatio =
                  orderSubtotal > 0 ? itemTotal / orderSubtotal : 0; // Avoid division by zero
                const itemDiscount = orderDiscount * itemDiscountRatio; // Giảm giá theo tỷ lệ
                let itemTax = orderTax * itemDiscountRatio; // Thuế theo tỷ lệ
                let itemRevenue = itemTotal - itemDiscount; // Doanh thu = thành tiền - giảm giá
                let itemTotalMoney = itemRevenue + itemTax; // Tổng tiền = doanh thu + thuế

                if (order.priceIncludeTax === true) {
                  itemRevenue = itemTotal - itemDiscount - itemTax;
                  itemTotalMoney = itemRevenue + itemTax;
                }

                // Get tax rate from product database, default to 0 if not available
                const product = Array.isArray(products)
                  ? products.find((p: any) => p.id === item.productId)
                  : null;
                const itemTaxRate = product?.taxRate
                  ? parseFloat(product.taxRate)
                  : 0;

                return {
                  productCode: item.productSku || `SP${item.productId}`,
                  productName: item.productName || "Unknown Product",
                  unit: "Món",
                  quantity: itemQuantity,
                  unitPrice: itemUnitPrice, // Đơn giá từ order_items
                  totalAmount: itemTotal, // Thành tiền từ order_items
                  discount: itemDiscount, // Giảm giá phân bổ
                  revenue: itemRevenue, // Doanh thu = thành tiền - giảm giá
                  tax: itemTax, // Thuế phân bổ
                  vat: itemTax, // VAT = thuế
                  totalMoney: itemTotalMoney, // Tổng tiền = doanh thu + thuế
                  productGroup: item.categoryName || "Chưa phân loại",
                  taxRate: itemTaxRate,
                };
              }),
      };

      // Filter order based on product search if needed
      let shouldIncludeOrder = true;
      if (productSearch) {
        const hasMatchingProduct = orderSummary.items.some(
          (item: any) =>
            item.productName
              .toLowerCase()
              .includes(productSearch.toLowerCase()) ||
            item.productCode
              .toLowerCase()
              .includes(productSearch.toLowerCase()),
        );
        shouldIncludeOrder = hasMatchingProduct;
      }

      if (shouldIncludeOrder) {
        groupedOrders.push(orderSummary);
      }
    });

    // Sort by date descending
    groupedOrders.sort(
      (a, b) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    );

    // Pagination
    const totalPages = Math.ceil(groupedOrders.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = groupedOrders.slice(startIndex, endIndex);

    // Calculate totals correctly from order-level data (not item-level to avoid double counting)
    let totalQuantity = 0;
    let totalAmount = 0;
    let totalDiscount = 0;
    let totalRevenue = 0;
    let totalTax = 0;
    let totalMoney = 0;

    // Sum from order-level data to get correct totals
    groupedOrders.forEach((order) => {
      // For quantity, sum from items
      order.items.forEach((item) => {
        totalQuantity += item.quantity;
      });

      // For financial data, use order-level values to avoid double counting
      totalAmount += order.totalAmount; // Order's subtotal
      totalDiscount += order.discount; // Order's discount
      totalRevenue += order.revenue; // Order's revenue
      totalTax += order.tax; // Order's tax
      totalMoney += order.totalMoney; // Order's total money
    });

    const totalVat = totalTax; // VAT = Tax in this context

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("reports.salesDetailReport")}
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>
              Từ ngày: {formatDate(startDate)} - Đến ngày: {formatDate(endDate)}
            </span>
            <Button
              onClick={() => {
                const exportData = [];

                // Export order headers and all their items
                groupedOrders.forEach((order) => {
                  // Add order header row
                  exportData.push({
                    Loại: "Tổng đơn hàng",
                    Ngày: formatDate(order.orderDate || ""),
                    "Số đơn bán": order.orderNumber || "",
                    "Mã khách hàng": order.customerId || "",
                    "Tên khách hàng": order.customerName || "",
                    "Mã hàng": "-",
                    "Tên hàng": "Tổng đơn hàng",
                    ĐVT: "-",
                    "Số lượng bán": order.items.length,
                    "Đơn giá": "-", // Hide unit price for parent row
                    "Thành tiền": formatCurrency(order.totalAmount),
                    "Giảm giá": formatCurrency(order.discount),
                    "Doanh thu": formatCurrency(order.revenue),
                    "Thuế suất": (() => {
                      if (order.items && order.items.length > 0) {
                        const totalTaxRate = order.items.reduce(
                          (sum: number, item: any) => {
                            return sum + (item.taxRate || 0);
                          },
                          0,
                        );
                        return totalTaxRate > 0
                          ? `${Math.floor(totalTaxRate)}%`
                          : "0%";
                      }
                      return "0%";
                    })(),
                    "Thuế GTGT": formatCurrency(order.tax),
                    "Tổng tiền": formatCurrency(order.totalMoney),
                    "Ghi chú": order.notes || "",
                    "Kênh bán": order.salesChannel || "",
                    Bàn: order.tableName || "",
                    "Tên nhân viên": order.employeeName || "",
                    "Nhóm hàng":
                      order.items.length > 0 && order.items[0].productGroup
                        ? order.items[0].productGroup
                        : "-",
                    "Trạng thái": order.status || "",
                  });

                  // Add all items for this order
                  order.items.forEach((item: any) => {
                    exportData.push({
                      Loại: "Chi tiết sản phẩm",
                      Ngày: formatDate(order.orderDate || ""),
                      "Số đơn bán": order.orderNumber || "",
                      "Mã khách hàng": order.customerId || "",
                      "Tên khách hàng": order.customerName || "",
                      "Mã hàng": item.productCode,
                      "Tên hàng": item.productName,
                      ĐVT: item.unit,
                      "Số lượng bán": item.quantity,
                      "Đơn giá": formatCurrency(item.unitPrice),
                      "Thành tiền": formatCurrency(item.totalAmount),
                      "Giảm giá": formatCurrency(item.discount),
                      "Doanh thu": formatCurrency(item.revenue),
                      "Thuế suất": `${item.taxRate || 0}%`,
                      "Thuế GTGT": formatCurrency(item.vat),
                      "Tổng tiền": formatCurrency(item.totalMoney),
                      "Ghi chú": order.notes || "",
                      "Kênh bán": order.salesChannel || "",
                      Bàn: order.tableName || "",
                      "Tên nhân viên": order.employeeName || "",
                      "Nhóm hàng": item.productGroup,
                      "Trạng thái": order.status || "",
                    });
                  });
                });

                // Add grand total summary
                exportData.push({
                  Loại: "TỔNG CỘNG",
                  "Mã đơn bán": `${groupedOrders.length} đơn hàng`,
                  "Mã hàng": "",
                  "Tên hàng": "",
                  ĐVT: "",
                  "Số lượng bán": totalQuantity,
                  "Đơn giá": "",
                  "Thành tiền": formatCurrency(totalAmount),
                  "Giảm giá": formatCurrency(totalDiscount),
                  "Doanh thu": formatCurrency(totalRevenue),
                  "Thuế suất": (() => {
                    if (totalTax > 0 && totalAmount > 0) {
                      const avgTaxRate = (totalTax / totalAmount) * 100;
                      return `${avgTaxRate.toFixed(1)}%`;
                    }
                    return "0%";
                  })(),
                  "Thuế GTGT": formatCurrency(totalTax),
                  "Tổng tiền": formatCurrency(totalMoney),
                  "Ghi chú": "",
                  "Kênh bán": "",
                  Bàn: "",
                  "Tên nhân viên": "",
                  "Nhóm hàng": "",
                  "Trạng thái": "",
                });

                exportToExcel(
                  exportData,
                  `BaoCaoChiTietBanHang_${startDate}_to_${endDate}`,
                );
              }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("common.exportExcel")}
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[2000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center bg-green-50 min-w-[100px] font-bold">
                      {t("reports.date")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 min-w-[120px] font-bold">
                      {t("reports.orderNumber")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 min-w-[120px] font-bold">
                      Mã khách hàng
                    </TableHead>
                    <TableHead className="text-center bg-green-50 min-w-[150px] font-bold">
                      Tên khách hàng
                    </TableHead>
                    <TableHead className="text-center bg-blue-50 min-w-[100px] font-bold">
                      Mã hàng
                    </TableHead>
                    <TableHead className="text-center bg-blue-50 min-w-[200px] font-bold">
                      Tên hàng
                    </TableHead>
                    <TableHead className="text-center bg-blue-50 min-w-[60px] font-bold">
                      ĐVT
                    </TableHead>
                    <TableHead className="text-center bg-blue-50 min-w-[100px] font-bold">
                      Số lượng bán
                    </TableHead>
                    <TableHead className="text-right bg-blue-50 min-w-[120px] font-bold">
                      Đơn giá
                    </TableHead>
                    <TableHead className="text-right bg-blue-50 min-w-[120px] font-bold">
                      Thành tiền
                    </TableHead>
                    <TableHead className="text-right bg-orange-50 min-w-[100px] font-bold">
                      Giảm giá
                    </TableHead>
                    <TableHead className="text-right bg-green-50 min-w-[120px] font-bold">
                      Doanh thu
                    </TableHead>
                    <TableHead className="text-right bg-yellow-50 min-w-[100px] font-bold">
                      {t("common.tax")}
                    </TableHead>
                    <TableHead className="text-right bg-yellow-50 min-w-[100px] font-bold">
                      Thuế GTGT
                    </TableHead>
                    <TableHead className="text-right bg-purple-50 min-w-[120px] font-bold">
                      Tổng tiền
                    </TableHead>
                    <TableHead className="text-center min-w-[150px] font-bold">
                      Ghi chú
                    </TableHead>
                    <TableHead className="text-center min-w-[100px] font-bold">
                      Kênh bán
                    </TableHead>
                    <TableHead className="text-center min-w-[80px] font-bold">
                      Bàn
                    </TableHead>
                    <TableHead className="text-center min-w-[120px] font-bold">
                      Tên nhân viên
                    </TableHead>
                    {/* ADDED COLUMN FOR PRODUCT GROUP */}
                    <TableHead className="text-center min-w-[120px] font-bold">
                      Nhóm hàng
                    </TableHead>
                    <TableHead className="text-center min-w-[100px] font-bold">
                      Trạng thái
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((order, orderIndex) => {
                      const isExpanded =
                        expandedRows[`order-${order.orderNumber}`] || false;

                      return (
                        <>
                          {/* Order Header Row */}
                          <TableRow className="bg-blue-50/50 hover:bg-blue-100/50 border-l-4 border-l-blue-500">
                            <TableCell className="text-center font-medium min-w-[100px] px-2">
                              <div className="flex items-center gap-2 pl-0">
                                <button
                                  onClick={() =>
                                    setExpandedRows((prev) => ({
                                      ...prev,
                                      [`order-${order.orderNumber}`]:
                                        !prev[`order-${order.orderNumber}`],
                                    }))
                                  }
                                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-sm bg-white border flex-shrink-0"
                                >
                                  {isExpanded ? "−" : "+"}
                                </button>
                                <span className="flex-1 text-center">
                                  {formatDate(order.orderDate)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center min-w-[120px] px-2 font-semibold">
                              <button
                                onClick={() => {
                                  window.location.href = `/sales-orders?order=${order.orderNumber}`;
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
                                title="Click to view order details"
                              >
                                {order.orderNumber}
                              </button>
                            </TableCell>
                            <TableCell className="text-center min-w-[120px] px-2 font-semibold">
                              {order.customerId}
                            </TableCell>
                            <TableCell className="text-center min-w-[150px] px-2 font-semibold">
                              {order.customerName}
                            </TableCell>
                            <TableCell className="text-center min-w-[100px] px-2 text-gray-500">
                              -
                            </TableCell>
                            <TableCell className="text-left min-w-[200px] px-2 font-semibold text-blue-800">
                              Tổng đơn hàng
                            </TableCell>
                            <TableCell className="text-center min-w-[60px] px-2 text-gray-500">
                              -
                            </TableCell>
                            <TableCell className="text-center min-w-[100px] px-2 font-semibold">
                              {order.items.length}
                            </TableCell>
                            <TableCell className="text-right min-w-[120px] px-2 font-bold">
                              -
                            </TableCell>
                            <TableCell className="text-right min-w-[120px] px-2 font-bold">
                              {formatCurrency(order.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right text-red-600 min-w-[100px] px-2 font-bold">
                              {formatCurrency(order.discount)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-bold min-w-[120px] px-2">
                              {formatCurrency(order.revenue)}
                            </TableCell>
                            <TableCell className="text-right min-w-[100px] px-2">
                              -
                            </TableCell>
                            <TableCell className="text-right min-w-[100px] px-2">
                              {formatCurrency(order.tax)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-600 min-w-[120px] px-2">
                              {formatCurrency(order.totalMoney)}
                            </TableCell>
                            <TableCell className="text-center min-w-[150px] px-2">
                              {order.notes || "-"}
                            </TableCell>
                            <TableCell className="text-center min-w-[100px] px-2">
                              <Badge
                                variant={
                                  order.salesChannel === "Ăn tại chỗ"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {order.salesChannel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center min-w-[80px] px-2">
                              {order.tableName || "-"}
                            </TableCell>
                            <TableCell className="text-center min-w-[120px] px-2">
                              {order.employeeName}
                            </TableCell>
                            {/* ADDED CELL FOR PRODUCT GROUP */}
                            <TableCell className="text-center min-w-[120px] px-2">
                              {order.items.length > 0 &&
                              order.items[0].productGroup
                                ? order.items[0].productGroup
                                : "-"}
                            </TableCell>
                            <TableCell className="text-center min-w-[100px] px-2">
                              <Badge variant="outline" className="text-xs">
                                {order.status}
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {/* Order Items Rows */}
                          {isExpanded &&
                            order.items.map((item: any, itemIndex: number) => (
                              <TableRow
                                key={`${order.orderNumber}-item-${itemIndex}`}
                                className="bg-blue-50/50 border-l-4 border-l-blue-400"
                              >
                                <TableCell className="text-center border-r bg-blue-50 w-12">
                                  <div className="flex items-center gap-2 pl-6 text-center">
                                    <span className="text-gray-400 text-xs flex-shrink-0 w-6 text-center">
                                      └
                                    </span>
                                    <span className="text-gray-600 text-sm flex-1 text-center">
                                      {formatDate(order.orderDate)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center min-w-[120px] px-2 text-gray-600 text-sm">
                                  <div className="pl-6 text-center">
                                    {order.orderNumber}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center min-w-[120px] px-2 text-gray-600 text-sm">
                                  {order.customerId}
                                </TableCell>
                                <TableCell className="text-center min-w-[150px] px-2 text-gray-600 text-sm">
                                  {order.customerName}
                                </TableCell>
                                <TableCell className="text-center min-w-[100px] px-2">
                                  {item.productCode}
                                </TableCell>
                                <TableCell className="text-center min-w-[200px] px-2">
                                  <div className="pl-6">{item.productName}</div>
                                </TableCell>
                                <TableCell className="text-center min-w-[60px] px-2">
                                  {item.unit}
                                </TableCell>
                                <TableCell className="text-center min-w-[100px] px-2">
                                  {item.quantity}
                                </TableCell>
                                <TableCell className="text-right min-w-[120px] px-2">
                                  {formatCurrency(item.unitPrice)}
                                </TableCell>
                                <TableCell className="text-right min-w-[120px] px-2">
                                  {formatCurrency(item.totalAmount)}
                                </TableCell>
                                <TableCell className="text-right text-red-600 min-w-[100px] px-2">
                                  {formatCurrency(item.discount)}
                                </TableCell>
                                <TableCell className="text-right text-green-600 font-medium text-sm min-w-[140px] px-2">
                                  {(() => {
                                    const transactionSubtotal = Number(
                                      item.totalAmount || 0,
                                    );
                                    const transactionDiscount = Number(
                                      item.discount || 0,
                                    );

                                    // Check priceIncludeTax from transaction or order
                                    const orderPriceIncludeTax =
                                      order.priceIncludeTax === true;

                                    let doanhThu;
                                    if (orderPriceIncludeTax) {
                                      // priceIncludeTax = true: doanh thu = subtotal (already net of discount)
                                      doanhThu =
                                        transactionSubtotal -
                                        Number(item.tax || 0);
                                    } else {
                                      // priceIncludeTax = false: doanh thu = subtotal - discount
                                      doanhThu = Math.max(
                                        0,
                                        transactionSubtotal -
                                          transactionDiscount,
                                      );
                                    }

                                    return formatCurrency(doanhThu);
                                  })()}
                                </TableCell>
                                <TableCell className="text-right min-w-[100px] px-2">
                                  {(() => {
                                    // Get taxRate from the actual product data
                                    const product = Array.isArray(products)
                                      ? products.find(
                                          (p: any) => p.id === item.productId,
                                        )
                                      : null;
                                    const taxRate = product?.taxRate
                                      ? parseFloat(product.taxRate)
                                      : item.taxRate || 0;
                                    return `${taxRate}%`;
                                  })()}
                                </TableCell>
                                <TableCell className="text-right min-w-[100px] px-2">
                                  {formatCurrency(item.vat)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-blue-600 min-w-[120px] px-2">
                                  {(() => {
                                    const transactionSubtotal = Number(
                                      item.totalAmount || 0,
                                    );
                                    const transactionDiscount = Number(
                                      item.discount || 0,
                                    );
                                    const transactionTax = Number(
                                      item.vat || 0,
                                    );
                                    const transactionTotal = Number(
                                      item.totalMoney || 0,
                                    );

                                    // Check priceIncludeTax from transaction or order
                                    const orderPriceIncludeTax =
                                      order.priceIncludeTax === true;

                                    if (orderPriceIncludeTax) {
                                      // priceIncludeTax = true: tổng tiền = total
                                      return formatCurrency(transactionTotal);
                                    } else {
                                      // priceIncludeTax = false: tổng tiền = subtotal - discount + tax
                                      const doanhThu = Math.max(
                                        0,
                                        transactionSubtotal -
                                          transactionDiscount,
                                      );
                                      return formatCurrency(
                                        doanhThu + transactionTax,
                                      );
                                    }
                                  })()}
                                </TableCell>
                                <TableCell className="text-center min-w-[150px] px-2 text-gray-600 text-sm">
                                  {order.notes || "-"}
                                </TableCell>
                                <TableCell className="text-center min-w-[100px] px-2">
                                  <Badge
                                    variant={
                                      order.salesChannel === "Ăn tại chỗ"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {order.salesChannel}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center min-w-[80px] px-2">
                                  {order.tableName || "-"}
                                </TableCell>
                                <TableCell className="text-center min-w-[120px] px-2">
                                  {order.employeeName}
                                </TableCell>
                                {/* ADDED CELL FOR PRODUCT GROUP */}
                                <TableCell className="text-center min-w-[120px] px-2">
                                  {item.productGroup}
                                </TableCell>
                                <TableCell className="text-center min-w-[100px] px-2">
                                  <Badge variant="outline" className="text-xs">
                                    {order.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                        </>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={21}
                        className="text-center text-gray-500 py-8"
                      >
                        {t("reports.noDataDescription")}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Summary Row */}
                  {groupedOrders.length > 0 && (
                    <TableRow className="bg-gray-100 font-bold border-t-2">
                      <TableCell className="text-center border-r w-12"></TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[120px] px-4">
                        TỔNG CỘNG
                      </TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[150px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[120px] px-4">
                        {groupedOrders.length} đơn
                      </TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[150px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center border-r bg-blue-100 min-w-[100px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center border-r bg-blue-100 min-w-[200px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center border-r bg-blue-100 min-w-[100px] px-4">
                        {totalQuantity}
                      </TableCell>
                      <TableCell className="text-right border-r bg-blue-100 min-w-[120px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-right border-r bg-blue-100 min-w-[120px] px-4">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell className="text-right border-r bg-orange-100 min-w-[100px] px-4">
                        {formatCurrency(totalDiscount)}
                      </TableCell>
                      <TableCell className="text-right border-r bg-green-100 min-w-[120px] px-4">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                      <TableCell className="text-center border-r bg-yellow-100 min-w-[100px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-right border-r bg-yellow-100 min-w-[100px] px-4">
                        {formatCurrency(totalTax)}
                      </TableCell>
                      <TableCell className="text-right border-r bg-purple-100 min-w-[120px] px-4">
                        {formatCurrency(totalMoney)}
                      </TableCell>
                      <TableCell className="text-center min-w-[150px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center min-w-[100px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center min-w-[80px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center min-w-[120px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center min-w-[120px] px-4">
                        -
                      </TableCell>
                      <TableCell className="text-center min-w-[100px] px-4">
                        -
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          {paginatedData.length > 0 && (
            <div className="flex items-center justify-between space-x-6 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("common.show")} </p>
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
                <p className="text-sm font-medium"> {t("common.rows")}</p>
              </div>

              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {currentPage} / {totalPages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
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
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Employee Report Component Logic - Enhanced with expandable rows and proper data handling
  const renderEmployeeReport = () => {
    if (ordersLoading || orderItemsLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const dashboardStats = getDashboardStats();
    const { filteredCompletedOrders } = dashboardStats;

    // Employee sales data
    const employeeSales: {
      [employeeId: string]: {
        employeeName: string;
        totalRevenue: number;
        totalOrders: number;
        totalCustomers: number;
        totalDiscount: number;
        totalTax: number;
        totalMoney: number;
        totalSubtotal: number; // Add subtotal tracking
        paymentMethods: { [method: string]: number };
        orders: any[]; // Add orders array to track individual orders
        employeeCode: string; // Add employee code
      };
    } = {};

    filteredCompletedOrders.forEach((order: any) => {
      const employeeId = order.employeeId?.toString() || "unknown";
      const employeeName = order.employeeName || order.cashierName || "Unknown";

      if (!employeeSales[employeeId]) {
        employeeSales[employeeId] = {
          employeeName,
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          totalDiscount: 0,
          totalTax: 0,
          totalMoney: 0,
          totalSubtotal: 0,
          paymentMethods: {},
          orders: [], // Add orders array to track individual orders
          employeeCode: employeeId, // Add employee code
        };
      }

      const orderSubtotal = Number(order.subtotal || 0);
      const orderDiscount = Number(order.discount || 0);
      const orderTax = Number(order.tax || 0);
      const orderTotal = Number(order.total || 0);

      // Validate numbers to prevent NaN
      if (
        isNaN(orderSubtotal) ||
        isNaN(orderDiscount) ||
        isNaN(orderTax) ||
        isNaN(orderTotal)
      ) {
        console.warn("Invalid order financial data:", {
          orderId: order.id,
          subtotal: order.subtotal,
          discount: order.discount,
          tax: order.tax,
          total: order.total,
        });
        return; // Skip this order if data is invalid
      }

      // Calculate based on priceIncludeTax consistently
      const orderPriceIncludeTax = order.priceIncludeTax === true;
      let thanhTien, doanhThu, tongTien;

      if (orderPriceIncludeTax) {
        // When priceIncludeTax = true:
        // - Thành tiền = subtotal + discount (before discount deduction)
        // - Doanh thu = subtotal (after discount, net revenue)
        // - Tổng tiền = total from DB
        thanhTien = orderSubtotal + orderDiscount + orderTax; // Thành tiền = subtotal + discount + tax
        doanhThu = thanhTien - orderDiscount - orderTax; // Doanh thu = subtotal + tax
        tongTien = orderTotal;
      } else {
        // When priceIncludeTax = false:
        // - Thành tiền = subtotal (before discount)
        // - Doanh thu = subtotal - discount (after discount)
        // - Tổng tiền = doanh thu + tax
        thanhTien = orderSubtotal;
        doanhThu = Math.max(0, orderSubtotal - orderDiscount);
        tongTien = doanhThu + orderTax;
      }

      employeeSales[employeeId].totalSubtotal += thanhTien;
      employeeSales[employeeId].totalRevenue += doanhThu;
      employeeSales[employeeId].totalOrders += 1;
      employeeSales[employeeId].totalCustomers += Number(
        order.customerCount || 1,
      );
      employeeSales[employeeId].totalDiscount += orderDiscount;
      employeeSales[employeeId].totalTax += orderTax;
      employeeSales[employeeId].totalMoney += tongTien;

      // Add order to orders array for detailed view
      employeeSales[employeeId].orders.push(order);

      // Payment methods
      const paymentMethod = order.paymentMethod || "cash";
      employeeSales[employeeId].paymentMethods[paymentMethod] =
        (employeeSales[employeeId].paymentMethods[paymentMethod] || 0) +
        tongTien;
    });

    const data = Object.values(employeeSales).sort(
      (a, b) => b.totalMoney - a.totalMoney, // Sort by totalMoney
    );

    // Pagination
    const totalPages = Math.ceil(data.length / employeePageSize);
    const startIndex = (employeeCurrentPage - 1) * employeePageSize;
    const endIndex = startIndex + employeePageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("reports.employeeSalesReport")}
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>
              {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
              {t("reports.toDate")}: {formatDate(endDate)}
            </span>
            <Button
              onClick={() => {
                const exportData = [];

                // Export employee summaries with their detailed orders
                data.forEach((item) => {
                  // Add employee summary row
                  exportData.push({
                    Loại: "Tổng nhân viên",
                    "Mã NV": item.employeeCode,
                    "Tên NV": item.employeeName,
                    "Số đơn": item.totalOrders,
                    "Thành tiền": formatCurrency(item.totalSubtotal),
                    "Giảm giá": formatCurrency(item.totalDiscount),
                    "Doanh thu": formatCurrency(item.totalRevenue),
                    Thuế: formatCurrency(item.totalTax),
                    "Tổng cộng": formatCurrency(item.totalMoney),
                    "Phương thức thanh toán": "Tất cả",
                  });

                  // Add detailed orders for this employee
                  item.orders.forEach((order: any) => {
                    exportData.push({
                      Loại: "Chi tiết đơn hàng",
                      "Mã NV": item.employeeCode,
                      "Tên NV": item.employeeName,
                      "Mã đơn h ng": order.orderNumber || `ORD-${order.id}`,
                      "Ngày giờ": new Date(
                        order.orderedAt || order.createdAt || order.created_at,
                      ).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      }),
                      "Khách hàng": order.customerName || "",
                      "Số đơn": 1,
                      "Doanh thu": formatCurrency(
                        Math.max(0, Number(order.subtotal || 0)),
                      ),
                      "Giảm giá": formatCurrency(Number(order.discount || 0)),
                      Thuế: formatCurrency(Number(order.tax || 0)),
                      "Tổng cộng": formatCurrency(Number(order.total || 0)),
                      "Phương thức thanh toán": formatPaymentMethodDisplay(
                        order.paymentMethod || "cash",
                      ),
                    });
                  });
                });

                // Add grand total summary
                exportData.push({
                  Loại: "TỔNG CỘNG",
                  "Mã NV": "",
                  "Tên NV": `${data.length} nhân viên`,
                  "Số đơn": data.reduce(
                    (sum, item) => sum + item.totalOrders,
                    0,
                  ),
                  "Thành tiền": formatCurrency(
                    data.reduce((sum, item) => sum + item.totalSubtotal, 0),
                  ),
                  "Giảm giá": formatCurrency(
                    data.reduce((sum, item) => sum + item.totalDiscount, 0),
                  ),
                  "Doanh thu": formatCurrency(
                    data.reduce((sum, item) => sum + item.totalRevenue, 0),
                  ),
                  Thuế: formatCurrency(
                    data.reduce((sum, item) => sum + item.totalTax, 0),
                  ),
                  "Tổng cộng": formatCurrency(
                    data.reduce((sum, item) => sum + item.totalMoney, 0),
                  ),
                  "Phương thức thanh toán": "Tất cả",
                });

                exportToExcel(
                  exportData,
                  `BaoCaoNhanVien_${startDate}_to_${endDate}`,
                );
              }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("common.exportExcel")}
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[1400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="text-center bg-green-50 w-12 font-bold"
                      rowSpan={2}
                    ></TableHead>
                    <TableHead
                      className="text-center border-r bg-green-50 min-w-[120px] font-bold"
                      rowSpan={2}
                    >
                      {t("reports.employeeId")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r bg-green-50 min-w-[150px] font-bold"
                      rowSpan={2}
                    >
                      {t("reports.employeeName")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r min-w-[100px] font-bold"
                      rowSpan={2}
                    >
                      {t("reports.orders")}
                    </TableHead>
                    <TableHead
                      className="text-right border-r min-w-[140px] font-bold"
                      rowSpan={2}
                    >
                      {t("reports.thanhTien")}
                    </TableHead>
                    <TableHead
                      className="text-right border-r min-w-[120px] font-bold"
                      rowSpan={2}
                    >
                      {t("reports.discount")}
                    </TableHead>
                    <TableHead
                      className="text-right border-r min-w-[120px] font-bold"
                      rowSpan={2}
                    >
                      {t("reports.revenue")}
                    </TableHead>
                    <TableHead
                      className="text-right border-r min-w-[120px] font-bold"
                      rowSpan={2}
                    >
                      {t("common.tax")}
                    </TableHead>
                    <TableHead
                      className="text-right border-r min-w-[140px] font-bold"
                      rowSpan={2}
                    >
                      {t("reports.totalMoney")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r bg-blue-50 min-w-[200px] font-bold"
                      colSpan={(() => {
                        // Get all unique payment methods from completed orders (including from JSON)
                        const allPaymentMethods = new Set();
                        if (data && Array.isArray(data)) {
                          data.forEach((employee: any) => {
                            if (
                              employee.orders &&
                              Array.isArray(employee.orders)
                            ) {
                              employee.orders.forEach((order: any) => {
                                const paymentMethodStr =
                                  order.paymentMethod || "cash";

                                // Try to parse as JSON for multi-payment
                                try {
                                  const parsed = JSON.parse(paymentMethodStr);
                                  if (
                                    Array.isArray(parsed) &&
                                    parsed.length > 0
                                  ) {
                                    // Multi-payment: add all methods from JSON
                                    parsed.forEach((pm: any) => {
                                      if (pm.method) {
                                        allPaymentMethods.add(pm.method);
                                      }
                                    });
                                  } else {
                                    // Single payment method
                                    allPaymentMethods.add(paymentMethodStr);
                                  }
                                } catch (e) {
                                  // Not JSON, treat as single payment method
                                  allPaymentMethods.add(paymentMethodStr);
                                }
                              });
                            }
                          });
                        }
                        return allPaymentMethods.size;
                      })()}
                    >
                      {t("reports.totalCustomerPayment")}
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    {(() => {
                      // Get all unique payment methods from employee orders (including from JSON)
                      const allPaymentMethods = new Set();
                      if (data && Array.isArray(data)) {
                        data.forEach((employee: any) => {
                          if (
                            employee.orders &&
                            Array.isArray(employee.orders)
                          ) {
                            employee.orders.forEach((order: any) => {
                              const paymentMethodStr =
                                order.paymentMethod || "cash";

                              // Try to parse as JSON for multi-payment
                              try {
                                const parsed = JSON.parse(paymentMethodStr);
                                if (
                                  Array.isArray(parsed) &&
                                  parsed.length > 0
                                ) {
                                  // Multi-payment: add all methods from JSON
                                  parsed.forEach((pm: any) => {
                                    if (pm.method) {
                                      allPaymentMethods.add(pm.method);
                                    }
                                  });
                                } else {
                                  // Single payment method
                                  allPaymentMethods.add(paymentMethodStr);
                                }
                              } catch (e) {
                                // Not JSON, treat as single payment method
                                allPaymentMethods.add(paymentMethodStr);
                              }
                            });
                          }
                        });
                      }

                      const paymentMethodsArray =
                        Array.from(allPaymentMethods).sort();

                      return (
                        <>
                          {paymentMethodsArray.map(
                            (method: any, index: number) => (
                              <TableHead
                                key={`payment-header-${index}-${method}`}
                                className="text-center border-r bg-blue-50 min-w-[130px] font-bold"
                              >
                                {getPaymentMethodLabel(method)}
                              </TableHead>
                            ),
                          )}
                        </>
                      );
                    })()}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const isExpanded =
                        expandedRows[item.employeeCode] || false;

                      return (
                        <>
                          <TableRow
                            key={`${item.employeeCode}-${index}`}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="text-center border-r w-12">
                              <button
                                onClick={() =>
                                  setExpandedRows((prev) => ({
                                    ...prev,
                                    [item.employeeCode]:
                                      !prev[item.employeeCode],
                                  }))
                                }
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                              >
                                {isExpanded ? "  �" : "+"}
                              </button>
                            </TableCell>
                            <TableCell className="text-center border-r bg-green-50 font-medium min-w-[120px] px-4">
                              {item.employeeCode}
                            </TableCell>
                            <TableCell className="text-center border-r bg-green-50 font-medium min-w-[150px] px-4">
                              {item.employeeName}
                            </TableCell>
                            <TableCell className="text-center border-r min-w-[100px] px-4">
                              {item.totalOrders.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right border-r min-w-[140px] px-4">
                              {formatCurrency(item.totalSubtotal)}
                            </TableCell>
                            <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                              {formatCurrency(item.totalDiscount)}
                            </TableCell>
                            <TableCell className="text-right border-r min-w-[120px] px-4">
                              {formatCurrency(item.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right border-r min-w-[120px] px-4">
                              {formatCurrency(item.totalTax)}
                            </TableCell>
                            <TableCell className="text-right border-r text-blue-600 font-bold min-w-[140px] px-4">
                              {formatCurrency(item.totalMoney)}
                            </TableCell>
                            {(() => {
                              // Get all unique payment methods from all employee data (including from JSON)
                              const allPaymentMethods = new Set();
                              if (data && Array.isArray(data)) {
                                data.forEach((employee: any) => {
                                  if (
                                    employee.orders &&
                                    Array.isArray(employee.orders)
                                  ) {
                                    employee.orders.forEach((order: any) => {
                                      const paymentMethodStr =
                                        order.paymentMethod || "cash";

                                      // Try to parse as JSON for multi-payment
                                      try {
                                        const parsed =
                                          JSON.parse(paymentMethodStr);
                                        if (
                                          Array.isArray(parsed) &&
                                          parsed.length > 0
                                        ) {
                                          // Multi-payment: add all methods from JSON
                                          parsed.forEach((pm: any) => {
                                            if (pm.method) {
                                              allPaymentMethods.add(pm.method);
                                            }
                                          });
                                        } else {
                                          // Single payment method
                                          allPaymentMethods.add(
                                            paymentMethodStr,
                                          );
                                        }
                                      } catch (e) {
                                        // Not JSON, treat as single payment method
                                        allPaymentMethods.add(paymentMethodStr);
                                      }
                                    });
                                  }
                                });
                              }

                              const paymentMethodsArray =
                                Array.from(allPaymentMethods).sort();

                              return (
                                <>
                                  {paymentMethodsArray.map((method: any) => {
                                    // Calculate customer payment for this payment method
                                    let customerPaymentForMethod = 0;
                                    if (
                                      item.orders &&
                                      Array.isArray(item.orders)
                                    ) {
                                      item.orders.forEach((order: any) => {
                                        const paymentMethodStr =
                                          order.paymentMethod || "cash";
                                        const orderSubtotal = Number(
                                          order.subtotal || 0,
                                        );
                                        const orderDiscount = Number(
                                          order.discount || 0,
                                        );
                                        const orderTax = Number(order.tax || 0);
                                        const orderTotal = Number(
                                          order.total || 0,
                                        );

                                        const customerPayment =
                                          order.priceIncludeTax === true
                                            ? orderTotal
                                            : orderSubtotal -
                                              orderDiscount +
                                              orderTax;

                                        // Try to parse as JSON for multi-payment
                                        try {
                                          const parsed =
                                            JSON.parse(paymentMethodStr);
                                          if (
                                            Array.isArray(parsed) &&
                                            parsed.length > 0
                                          ) {
                                            // Multi-payment: find amount for this method from JSON
                                            const paymentItem = parsed.find(
                                              (pm: any) => pm.method === method,
                                            );
                                            if (paymentItem) {
                                              customerPaymentForMethod +=
                                                Number(paymentItem.amount || 0);
                                            }
                                          } else {
                                            // Not a valid array, treat as single payment
                                            if (paymentMethodStr === method) {
                                              customerPaymentForMethod +=
                                                customerPayment;
                                            }
                                          }
                                        } catch (e) {
                                          // Not JSON, single payment method
                                          if (paymentMethodStr === method) {
                                            customerPaymentForMethod +=
                                              customerPayment;
                                          }
                                        }
                                      });
                                    }

                                    return (
                                      <TableCell
                                        key={method}
                                        className="text-right border-r font-medium min-w-[130px] px-4"
                                      >
                                        {customerPaymentForMethod > 0
                                          ? formatCurrency(
                                              customerPaymentForMethod,
                                            )
                                          : "-"}
                                      </TableCell>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </TableRow>

                          {/* Expanded Order Details */}
                          {isExpanded &&
                            item.orders.length > 0 &&
                            item.orders.map(
                              (order: any, orderIndex: number) => (
                                <TableRow
                                  key={`${item.employeeCode}-order-${
                                    order.id || orderIndex
                                  }`}
                                  className="bg-blue-50/50 border-l-4 border-l-blue-400"
                                >
                                  <TableCell className="text-center border-r bg-blue-50 w-12">
                                    <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                      └
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center border-r text-blue-600 text-sm min-w-[120px] px-4">
                                    <button
                                      onClick={() => {
                                        const orderNumber =
                                          order.orderNumber ||
                                          `ORD-${order.id}`;
                                        window.location.href = `/sales-orders?order=${orderNumber}`;
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
                                      title="Click to view order details"
                                    >
                                      {order.orderNumber || `ORD-${order.id}`}
                                    </button>
                                  </TableCell>
                                  <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                    <div>
                                      {new Date(
                                        order.orderedAt ||
                                          order.createdAt ||
                                          order.created_at,
                                      ).toLocaleDateString("vi-VN")}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(
                                        order.orderedAt ||
                                          order.createdAt ||
                                          order.created_at,
                                      ).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                      })}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {order.customerName}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right text-green-600 font-medium text-sm min-w-[140px] px-4">
                                    {(() => {
                                      const subtotal =
                                        Number(order.subtotal) || 0;
                                      const discount =
                                        Number(order.discount) || 0;
                                      const tax = Number(order.tax) || 0;
                                      if (order.priceIncludeTax === true) {
                                        return formatCurrency(
                                          subtotal + discount + tax,
                                        );
                                      } else {
                                        return formatCurrency(subtotal);
                                      }
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-right text-orange-600 text-sm min-w-[120px] px-4">
                                    {formatCurrency(
                                      Number(order.discount || 0),
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                    {(() => {
                                      const subtotal =
                                        Number(order.subtotal) || 0;
                                      const discount =
                                        Number(order.discount) || 0;
                                      const tax = Number(order.tax) || 0;
                                      if (order.priceIncludeTax === false) {
                                        return formatCurrency(subtotal - tax);
                                      } else {
                                        return formatCurrency(subtotal);
                                      }
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                    {formatCurrency(Number(order.tax || 0))}
                                  </TableCell>
                                  <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[140px] px-4">
                                    {(() => {
                                      const subtotal =
                                        Number(order.subtotal) || 0;
                                      const discount =
                                        Number(order.discount) || 0;
                                      const tax = Number(order.tax) || 0;
                                      const total = Number(order.total) || 0;
                                      if (order.priceIncludeTax === false) {
                                        return formatCurrency(
                                          subtotal - discount + tax,
                                        );
                                      } else {
                                        return formatCurrency(total);
                                      }
                                    })()}
                                  </TableCell>
                                  {(() => {
                                    // Get all unique payment methods from all employee data (including from JSON)
                                    const allPaymentMethods = new Set();
                                    if (data && Array.isArray(data)) {
                                      data.forEach((employee: any) => {
                                        if (
                                          employee.orders &&
                                          Array.isArray(employee.orders)
                                        ) {
                                          employee.orders.forEach(
                                            (order: any) => {
                                              const paymentMethodStr =
                                                order.paymentMethod || "cash";

                                              // Try to parse as JSON for multi-payment
                                              try {
                                                const parsed =
                                                  JSON.parse(paymentMethodStr);
                                                if (
                                                  Array.isArray(parsed) &&
                                                  parsed.length > 0
                                                ) {
                                                  // Multi-payment: add all methods from JSON
                                                  parsed.forEach((pm: any) => {
                                                    if (pm.method) {
                                                      allPaymentMethods.add(
                                                        pm.method,
                                                      );
                                                    }
                                                  });
                                                } else {
                                                  // Single payment method
                                                  allPaymentMethods.add(
                                                    paymentMethodStr,
                                                  );
                                                }
                                              } catch (e) {
                                                // Not JSON, treat as single payment method
                                                allPaymentMethods.add(
                                                  paymentMethodStr,
                                                );
                                              }
                                            },
                                          );
                                        }
                                      });
                                    }

                                    const paymentMethodsArray =
                                      Array.from(allPaymentMethods).sort();

                                    return (
                                      <>
                                        {paymentMethodsArray.map(
                                          (method: any) => {
                                            const orderPaymentMethodStr =
                                              order.paymentMethod || "cash";
                                            let orderPaymentForMethod = 0;

                                            const orderSubtotal = Number(
                                              order.subtotal || 0,
                                            );
                                            const orderDiscount = Number(
                                              order.discount || 0,
                                            );
                                            const orderTax = Number(
                                              order.tax || 0,
                                            );
                                            const orderTotal = Number(
                                              order.total || 0,
                                            );

                                            const customerPayment =
                                              order.priceIncludeTax === true
                                                ? orderTotal
                                                : orderSubtotal -
                                                  orderDiscount +
                                                  orderTax;

                                            // Try to parse as JSON for multi-payment
                                            try {
                                              const parsed = JSON.parse(
                                                orderPaymentMethodStr,
                                              );
                                              if (
                                                Array.isArray(parsed) &&
                                                parsed.length > 0
                                              ) {
                                                // Multi-payment: find amount for this method from JSON
                                                const paymentItem = parsed.find(
                                                  (pm: any) =>
                                                    pm.method === method,
                                                );
                                                if (paymentItem) {
                                                  orderPaymentForMethod =
                                                    Number(
                                                      paymentItem.amount || 0,
                                                    );
                                                }
                                              } else {
                                                // Not a valid array, treat as single payment
                                                if (
                                                  orderPaymentMethodStr ===
                                                  method
                                                ) {
                                                  orderPaymentForMethod =
                                                    customerPayment;
                                                }
                                              }
                                            } catch (e) {
                                              // Not JSON, single payment method
                                              if (
                                                orderPaymentMethodStr === method
                                              ) {
                                                orderPaymentForMethod =
                                                  customerPayment;
                                              }
                                            }

                                            return (
                                              <TableCell
                                                key={method}
                                                className="text-right border-r text-sm min-w-[130px] px-4"
                                              >
                                                {orderPaymentForMethod > 0
                                                  ? formatCurrency(
                                                      orderPaymentForMethod,
                                                    )
                                                  : "-"}
                                              </TableCell>
                                            );
                                          },
                                        )}
                                      </>
                                    );
                                  })()}
                                </TableRow>
                              ),
                            )}
                        </>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-gray-500 py-8"
                      >
                        {t("reports.noDataDescription")}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Summary Row */}
                  {data.length > 0 && (
                    <TableRow className="bg-gray-100 font-bold border-t-2">
                      <TableCell className="text-center border-r w-12"></TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[120px] px-4">
                        {t("common.total")}
                      </TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[150px] px-4">
                        {data.length} nhân viên
                      </TableCell>
                      <TableCell className="text-center border-r min-w-[100px] px-4">
                        {data
                          .reduce((sum, item) => sum + item.totalOrders, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right border-r min-w-[140px] px-4">
                        {formatCurrency(
                          data.reduce(
                            (sum, item) => sum + item.totalSubtotal,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                        {formatCurrency(
                          data.reduce(
                            (sum, item) => sum + item.totalDiscount,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r min-w-[120px] px-4">
                        {formatCurrency(
                          data.reduce(
                            (sum, item) => sum + item.totalRevenue,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r min-w-[120px] px-4">
                        {formatCurrency(
                          data.reduce((sum, item) => sum + item.totalTax, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r text-blue-600 font-bold min-w-[140px] px-4">
                        {formatCurrency(
                          data.reduce((sum, item) => sum + item.totalMoney, 0),
                        )}
                      </TableCell>
                      {(() => {
                        // Calculate total payment methods across all dates with proper multi-payment handling
                        const totalPaymentMethods: {
                          [method: string]: number;
                        } = {};

                        filteredCompletedOrders.forEach((transaction: any) => {
                          const paymentMethodStr =
                            transaction.paymentMethod || "cash";

                          const transactionSubtotal = Number(
                            transaction.subtotal || 0,
                          );
                          const transactionDiscount = Number(
                            transaction.discount || 0,
                          );
                          const transactionTax = Number(transaction.tax || 0);
                          const transactionTotal = Number(
                            transaction.total || 0,
                          );

                          const customerPayment =
                            transaction.priceIncludeTax === true
                              ? transactionTotal
                              : transactionSubtotal -
                                transactionDiscount +
                                transactionTax;

                          // Try to parse as JSON for multi-payment
                          try {
                            const parsed = JSON.parse(paymentMethodStr);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              // Multi-payment: use amounts directly from JSON
                              parsed.forEach((pm: any) => {
                                const method = pm.method || "cash";
                                const amount = Number(pm.amount || 0);
                                totalPaymentMethods[method] =
                                  (totalPaymentMethods[method] || 0) + amount;
                              });
                            } else {
                              // Not a valid JSON array, treat as single payment
                              totalPaymentMethods[paymentMethodStr] =
                                (totalPaymentMethods[paymentMethodStr] || 0) +
                                customerPayment;
                            }
                          } catch (e) {
                            // Not JSON, single payment method
                            totalPaymentMethods[paymentMethodStr] =
                              (totalPaymentMethods[paymentMethodStr] || 0) +
                              customerPayment;
                          }
                        });

                        // Get all unique payment methods from all completed orders (including from JSON)
                        const allPaymentMethods = new Set();
                        if (
                          filteredCompletedOrders &&
                          Array.isArray(filteredCompletedOrders)
                        ) {
                          filteredCompletedOrders.forEach((order: any) => {
                            const paymentMethodStr =
                              order.paymentMethod || "cash";

                            // Try to parse as JSON for multi-payment
                            try {
                              const parsed = JSON.parse(paymentMethodStr);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                // Multi-payment: add all methods from JSON
                                parsed.forEach((pm: any) => {
                                  if (pm.method) {
                                    allPaymentMethods.add(pm.method);
                                  }
                                });
                              } else {
                                // Single payment method
                                allPaymentMethods.add(paymentMethodStr);
                              }
                            } catch (e) {
                              // Not JSON, treat as single payment method
                              allPaymentMethods.add(paymentMethodStr);
                            }
                          });
                        }

                        const paymentMethodsArray =
                          Array.from(allPaymentMethods).sort();

                        return (
                          <>
                            {paymentMethodsArray.map((method: any) => {
                              const total = totalPaymentMethods[method] || 0;
                              return (
                                <TableCell
                                  key={method}
                                  className="text-right border-r font-bold text-green-600 min-w-[130px] px-4"
                                >
                                  {total > 0 ? formatCurrency(total) : "-"}
                                </TableCell>
                              );
                            })}
                          </>
                        );
                      })()}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls for Customer Report */}
          {data.length > 0 && (
            <div className="flex items-center justify-between space-x-6 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("common.show")} </p>
                <Select
                  value={employeePageSize.toString()}
                  onValueChange={(value) => {
                    setEmployeePageSize(Number(value));
                    setEmployeeCurrentPage(1);
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
                <p className="text-sm font-medium"> {t("common.rows")}</p>
              </div>

              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {employeeCurrentPage} / {totalPages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEmployeeCurrentPage(1)}
                    disabled={employeeCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() =>
                      setEmployeeCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={employeeCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() =>
                      setEmployeeCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages),
                      )
                    }
                    disabled={employeeCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setEmployeeCurrentPage(totalPages)}
                    disabled={employeeCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Customer Report with Pagination State
  // const [customerCurrentPage, setCustomerCurrentPage] = useState(1); // Moved up
  // const [customerPageSize, setCustomerPageSize] = useState(15); // Moved up

  // Legacy Customer Report Component Logic
  const renderCustomerReport = () => {
    if (ordersLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    if (!orders || !Array.isArray(orders)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Không có dữ liệu đơn hàng</div>
        </div>
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(
        order.orderedAt || order.created_at || order.createdAt,
      );

      if (isNaN(orderDate.getTime())) {
        return false;
      }

      // Apply floor filter
      const floorMatch =
        selectedFloor === "all" ||
        !order.tableId ||
        !tables ||
        !Array.isArray(tables) ||
        tables.find((table: any) => table.id === order.tableId)?.floor ===
          selectedFloor;

      const dateMatch = orderDate >= start && orderDate <= end;

      const customerMatch =
        !customerSearch ||
        (order.customerName &&
          order.customerName
            .toLowerCase()
            .includes(customerSearch.toLowerCase())) ||
        (order.customerId &&
          order.customerId
            .toString()
            .toLowerCase()
            .includes(customerSearch.toLowerCase()));

      // Status filter logic
      let statusMatch = true;
      if (customerStatus !== "all") {
        const orderTotal = Number(order.total || 0);
        const customerId = order.customerId;

        switch (customerStatus) {
          case "active":
            // Customer has recent orders (within last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            statusMatch = orderDate >= thirtyDaysAgo;
            break;
          case "inactive":
            // Customer hasn't ordered in last 30 days
            const thirtyDaysAgoInactive = new Date();
            thirtyDaysAgoInactive.setDate(thirtyDaysAgoInactive.getDate() - 30);
            statusMatch = orderDate < thirtyDaysAgoInactive;
            break;
          case "vip":
            // VIP customers with orders > 500,000 VND
            statusMatch = orderTotal >= 500000;
            break;
          case "new":
            // New customers (first order within date range)
            statusMatch = customerId && customerId !== "guest";
            break;
          default:
            statusMatch = true;
        }
      }

      // Include paid, completed, and cancelled orders
      const validOrderStatus =
        order.status === "paid" ||
        order.status === "completed" ||
        order.status === "cancelled";

      return (
        dateMatch &&
        customerMatch &&
        statusMatch &&
        validOrderStatus &&
        floorMatch
      ); // Add floor match
    });

    // Calculate customer sales
    const customerSales: {
      [customerId: string]: {
        customerId: string;
        customerName: string;
        customerGroup: string;
        orders: number;
        totalAmount: number;
        discount: number; // Default discount to 0
        revenue: number;
        status: string;
        customerGroup: string;
        orderDetails: any[]; // Added orderDetails
      };
    } = {};

    filteredOrders.forEach((order: any) => {
      const customerId = order.customerId || "";
      const customerName = order.customerName || "";

      if (!customerSales[customerId]) {
        customerSales[customerId] = {
          customerId: customerId === "guest" ? "KL-001" : customerId,
          customerName: customerName,
          customerGroup: t("common.regularCustomer"), // Default group
          orders: 0,
          totalAmount: 0,
          discount: 0, // Default discount to 0
          revenue: 0,
          status: t("reports.active"), // Default status
          customerGroup: t("common.regularCustomer"), // Default group
          orderDetails: [], // Initialize orderDetails array
        };
      }

      const orderSubtotal = Number(order.subtotal || 0); // Use subtotal from DB
      const orderDiscount = Number(order.discount || 0); // Default discount to 0
      const orderTax = Number(order.tax || 0); // Default discount to 0

      // Count all orders and add to orderDetails
      customerSales[customerId].orders += 1;
      customerSales[customerId].orderDetails.push(order);

      // Always add to totals (including cancelled orders for total amount calculation)
      customerSales[customerId].discount += orderDiscount;

      // Calculate revenue correctly based on priceIncludeTax setting (only for non-cancelled orders)
      const orderPriceIncludeTax = order.priceIncludeTax ?? false;
      let orderRevenue;
      if (orderPriceIncludeTax) {
        // When priceIncludeTax = true: doanh thu = subtotal (already net of discount)
        orderRevenue = orderSubtotal - orderTax;
        customerSales[customerId].totalAmount +=
          orderRevenue - orderDiscount - orderTax;
      } else {
        // When priceIncludeTax = false: doanh thu = subtotal - discount
        orderRevenue = Math.max(0, orderSubtotal - orderDiscount);
        customerSales[customerId].totalAmount += orderSubtotal - orderDiscount;
      }
      customerSales[customerId].revenue += orderRevenue;

      // Determine customer group based on total spending
      if (customerSales[customerId].revenue >= 1000000) {
        customerSales[customerId].customerGroup = t("reports.vip");
      } else if (customerSales[customerId].revenue >= 500000) {
        customerSales[customerId].customerGroup = t("common.goldCustomer");
      }
    });

    const data = Object.values(customerSales).sort(
      (a, b) => b.revenue - a.revenue,
    );

    // Pagination logic
    const totalPages = Math.ceil(data.length / customerPageSize);
    const startIndex = (customerCurrentPage - 1) * customerPageSize;
    const endIndex = startIndex + customerPageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("reports.customerSalesReport")}
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>
              {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
              {t("reports.toDate")}: {formatDate(endDate)}
            </span>
            <Button
              onClick={() => {
                let exportData = [];

                // Export customer summaries with their detailed orders
                data.forEach((customer) => {
                  // Add customer summary row
                  exportData.push({
                    Loại: "Tổng khách hàng",
                    "Mã KH": customer.customerId,
                    "Tên KH": customer.customerName,
                    "Nhóm KH": customer.customerGroup,
                    "Mã đơn hàng": "",
                    "Ngày giờ": "",
                    "Số đơn": customer.orders,
                    "Tổng tiền": formatCurrency(customer.totalAmount),
                    "Giảm giá": formatCurrency(customer.discount),
                    "Doanh thu": formatCurrency(customer.revenue),
                    "Trạng thái": customer.status,
                    "Phương thức thanh toán": "Tất cả",
                  });

                  // Add detailed orders for this customer
                  if (
                    customer.orderDetails &&
                    customer.orderDetails.length > 0
                  ) {
                    customer.orderDetails.forEach((order: any) => {
                      exportData.push({
                        Loại: "Chi tiết đơn hàng",
                        "Mã KH": customer.customerId,
                        "Tên KH": customer.customerName,
                        "Nhóm KH": customer.customerGroup,
                        "Mã đơn hàng": order.orderNumber || `ORD-${order.id}`,
                        "Ngày giờ": new Date(
                          order.orderedAt || order.created_at,
                        ).toLocaleString("vi-VN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        }),
                        "Số đ n": 1,
                        "Tổng tiền": formatCurrency(
                          Number(order.subtotal || 0),
                        ),
                        "Giảm giá": formatCurrency(Number(order.discount || 0)),
                        "Doanh thu": formatCurrency(
                          Math.max(
                            0,
                            Number(order.subtotal || 0) -
                              Number(order.discount || 0),
                          ),
                        ),
                        "Trạng thái":
                          order.status === "paid"
                            ? "Đã thanh toán"
                            : order.status === "cancelled"
                              ? "Đã hủy"
                              : order.status,
                        "Phương thức thanh toán": formatPaymentMethodDisplay(
                          order.paymentMethod || "cash",
                        ),
                      });
                    });
                  }
                });

                // Add grand total summary
                exportData.push({
                  Loại: "TỔNG CỘNG",
                  "Mã KH": "",
                  "Tên KH": `${data.length} khách hàng`,
                  "Nhóm KH": "",
                  "Mã đơn hàng": "",
                  "Ngày giờ": "",
                  "Số đơn": data.reduce(
                    (sum, customer) => sum + customer.orders,
                    0,
                  ),
                  "Tổng tiền": formatCurrency(
                    data.reduce(
                      (sum, customer) => sum + customer.totalAmount,
                      0,
                    ),
                  ),
                  "Giảm giá": formatCurrency(
                    data.reduce((sum, customer) => sum + customer.discount, 0),
                  ),
                  "Doanh thu": formatCurrency(
                    data.reduce((sum, customer) => sum + customer.revenue, 0),
                  ),
                  "Trạng thái": "",
                  "Phương thức thanh toán": "Tất cả",
                });

                exportToExcel(
                  exportData,
                  `BaoCaoKhachHang_${startDate}_to_${endDate}`,
                );
              }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("common.exportExcel")}
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="overflow-x-auto xl:overflow-x-visible">
              <Table className="w-full min-w-[1000px] xl:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="text-center bg-green-50 w-12 font-bold"
                      rowSpan={1}
                    ></TableHead>
                    <TableHead className="text-center border-r bg-green-50 min-w-[120px] font-bold">
                      {t("reports.customerId")}
                    </TableHead>
                    <TableHead className="text-center border-r bg-green-50 min-w-[150px] font-bold">
                      {t("reports.customerName")}
                    </TableHead>
                    <TableHead className="text-center border-r min-w-[100px] font-bold">
                      {t("reports.orders")}
                    </TableHead>
                    <TableHead className="text-center border-r min-w-[100px] font-bold">
                      {t("common.customerGroup")}
                    </TableHead>
                    <TableHead className="text-right border-r min-w-[140px] font-bold">
                      {t("reports.thanhTien")}
                    </TableHead>
                    {analysisType !== "employee" && (
                      <TableHead className="text-right border-r min-w-[120px] font-bold">
                        {t("reports.discount")}
                      </TableHead>
                    )}
                    <TableHead className="text-right border-r min-w-[140px] font-bold">
                      {t("reports.revenue")}
                    </TableHead>
                    <TableHead className="text-center min-w-[100px] font-bold">
                      {t("reports.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const isExpanded = expandedRows[item.customerId] || false;

                      return (
                        <>
                          <TableRow
                            key={`${item.customerId}-${index}`}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="text-center border-r w-12">
                              <button
                                onClick={() =>
                                  setExpandedRows((prev) => ({
                                    ...prev,
                                    [item.customerId]: !prev[item.customerId],
                                  }))
                                }
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                              >
                                {isExpanded ? "−" : "+"}
                              </button>
                            </TableCell>
                            <TableCell className="text-center border-r bg-green-50 min-w-[120px] px-4">
                              {item.customerId}
                            </TableCell>
                            <TableCell className="text-center border-r bg-green-50 min-w-[150px] px-4">
                              {item.customerName}
                            </TableCell>
                            <TableCell className="text-center border-r min-w-[100px] px-4">
                              {item.orders}
                            </TableCell>
                            <TableCell className="text-center border-r min-w-[130px] px-4">
                              <Badge
                                variant={
                                  item.customerGroup === t("reports.vip")
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {item.customerGroup}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right border-r min-w-[140px] px-4">
                              {formatCurrency(item.totalAmount)}
                            </TableCell>
                            {analysisType !== "employee" && (
                              <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                                {formatCurrency(item.discount)}
                              </TableCell>
                            )}
                            <TableCell className="text-right border-r text-green-600 font-medium min-w-[120px] px-4">
                              {(() => {
                                // Calculate revenue properly for each customer
                                if (
                                  item.orderDetails &&
                                  Array.isArray(item.orderDetails) &&
                                  item.orderDetails.length > 0
                                ) {
                                  let totalRevenue = 0;
                                  item.orderDetails.forEach((order: any) => {
                                    const orderSubtotal = Number(
                                      order.subtotal || 0,
                                    );
                                    const orderDiscount = Number(
                                      order.discount || 0,
                                    );
                                    const orderTax = Number(order.tax || 0);
                                    const orderPriceIncludeTax =
                                      order.priceIncludeTax === true;

                                    let orderRevenue;
                                    if (orderPriceIncludeTax) {
                                      // When priceIncludeTax = true: doanh thu = subtotal (already net of discount)
                                      orderRevenue = orderSubtotal - orderTax;
                                    } else {
                                      // When priceIncludeTax = false: doanh thu = subtotal - discount
                                      orderRevenue = Math.max(
                                        0,
                                        orderSubtotal - orderDiscount,
                                      );
                                    }
                                    totalRevenue += orderRevenue;
                                  });
                                  return formatCurrency(totalRevenue);
                                }
                                // Fallback to item.revenue if no order details
                                return formatCurrency(item.revenue || 0);
                              })()}
                            </TableCell>
                            <TableCell className="text-center min-w-[100px] px-4">
                              <Badge
                                variant={
                                  item.status === t("reports.active")
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {/* Expanded order details */}
                          {isExpanded &&
                            item.orderDetails.length > 0 &&
                            item.orderDetails.map(
                              (order: any, orderIndex: number) => (
                                <TableRow
                                  key={`${item.customerId}-order-${
                                    order.id || orderIndex
                                  }`}
                                  className="bg-blue-50/50 border-l-4 border-l-blue-400"
                                >
                                  <TableCell className="text-center border-r bg-blue-50 w-12">
                                    <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                      └
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center border-r text-blue-600 text-sm min-w-[120px] px-4">
                                    <button
                                      onClick={() => {
                                        // Navigate to sales orders with order filter
                                        const orderNumber =
                                          order.orderNumber ||
                                          `ORD-${order.id}`;
                                        window.location.href = `/sales-orders?order=${orderNumber}`;
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
                                      title="Click to view order details"
                                    >
                                      {order.orderNumber ||
                                        order.transactionId ||
                                        `ORD-${order.id}`}
                                    </button>
                                  </TableCell>
                                  <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                    {new Date(
                                      order.orderedAt || order.created_at,
                                    ).toLocaleString("vi-VN", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      hour12: false,
                                    })}
                                  </TableCell>
                                  <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                    1
                                  </TableCell>
                                  <TableCell className="text-center border-r text-sm min-w-[130px] px-4">
                                    <div className="text-xs whitespace-pre-wrap break-words">
                                      {formatPaymentMethodDisplay(
                                        order.paymentMethod,
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right border-r text-sm min-w-[140px] px-4">
                                    {(() => {
                                      const subtotal = Number(order.subtotal);
                                      const discount = Number(order.discount);
                                      if (order.priceIncludeTax === true) {
                                        return formatCurrency(
                                          subtotal + discount,
                                        );
                                      } else {
                                        return formatCurrency(subtotal);
                                      }
                                    })()}
                                  </TableCell>
                                  {analysisType !== "employee" && (
                                    <TableCell className="text-right border-r text-red-600 text-sm min-w-[120px] px-4">
                                      {formatCurrency(
                                        Number(order.discount || 0),
                                      )}
                                    </TableCell>
                                  )}
                                  <TableCell className="text-right border-r text-sm min-w-[140px] px-4">
                                    {(() => {
                                      const subtotal = Number(order.subtotal);
                                      const discount = Number(order.discount);
                                      const tax = Number(order.tax);
                                      if (order.priceIncludeTax === false) {
                                        return formatCurrency(subtotal - tax);
                                      } else {
                                        return formatCurrency(subtotal);
                                      }
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-center text-center text-sm min-w-[100px] px-4">
                                    <Badge
                                      variant={
                                        order.status === "paid"
                                          ? "default"
                                          : order.status === "cancelled"
                                            ? "destructive"
                                            : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {order.status === "paid"
                                        ? t("common.paid")
                                        : order.status === "cancelled"
                                          ? "Đã hủy"
                                          : order.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                        </>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-gray-500"
                      >
                        {t("reports.noDataDescription")}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Summary Row */}
                  {data.length > 0 && (
                    <TableRow className="bg-gray-100 font-bold border-t-2">
                      <TableCell className="text-center border-r w-12"></TableCell>
                      <TableCell className="text-center border-r bg-green-50 min-w-[120px] px-4">
                        {t("common.total")}
                      </TableCell>
                      <TableCell className="text-center border-r bg-green-50 min-w-[150px] px-4">
                        {data.length} kh ch hàng
                      </TableCell>
                      <TableCell className="text-center border-r min-w-[100px] px-4">
                        {(() => {
                          // Calculate total number of orders from all order details
                          let totalOrdersCount = 0;
                          data.forEach((customer) => {
                            if (
                              customer.orderDetails &&
                              Array.isArray(customer.orderDetails)
                            ) {
                              totalOrdersCount += customer.orderDetails.length;
                            }
                          });
                          return totalOrdersCount.toLocaleString();
                        })()}
                      </TableCell>
                      <TableCell className="text-center border-r min-w-[130px]"></TableCell>
                      <TableCell className="text-right border-r min-w-[140px] px-4">
                        {formatCurrency(
                          data.reduce(
                            (sum, customer) => sum + customer.totalAmount,
                            0,
                          ),
                        )}
                      </TableCell>
                      {analysisType !== "employee" && (
                        <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                          {formatCurrency(
                            data.reduce(
                              (sum, customer) => sum + customer.discount,
                              0,
                            ),
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right border-r text-green-600 font-medium min-w-[120px] px-4">
                        {formatCurrency(
                          data.reduce((sum, customer) => {
                            // Calculate revenue from order details for each customer with proper priceIncludeTax logic
                            if (
                              customer.orderDetails &&
                              Array.isArray(customer.orderDetails) &&
                              customer.orderDetails.length > 0
                            ) {
                              let customerRevenue = 0;
                              customer.orderDetails.forEach((order: any) => {
                                const orderSubtotal = Number(
                                  order.subtotal || 0,
                                );
                                const orderDiscount = Number(
                                  order.discount || 0,
                                );
                                const orderTax = Number(order.tax || 0);
                                const orderPriceIncludeTax =
                                  order.priceIncludeTax === true;

                                let orderRevenue;
                                if (orderPriceIncludeTax) {
                                  // When priceIncludeTax = true: doanh thu = subtotal (already net of discount)
                                  orderRevenue = orderSubtotal - orderTax;
                                } else {
                                  // When priceIncludeTax = false: doanh thu = subtotal - discount
                                  orderRevenue = Math.max(
                                    0,
                                    orderSubtotal - orderDiscount,
                                  );
                                }
                                customerRevenue += orderRevenue;
                              });
                              return sum + customerRevenue;
                            }
                            // Fallback to customer.revenue if no order details
                            return sum + (customer.revenue || 0);
                          }, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-center min-w-[100px] px-4"></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls for Customer Report */}
          {data.length > 0 && (
            <div className="flex items-center justify-between space-x-6 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("common.show")} </p>
                <Select
                  value={customerPageSize.toString()}
                  onValueChange={(value) => {
                    setCustomerPageSize(Number(value));
                    setCustomerCurrentPage(1);
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
                <p className="text-sm font-medium"> {t("common.rows")}</p>
              </div>

              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {customerCurrentPage} / {totalPages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCustomerCurrentPage(1)}
                    disabled={customerCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() =>
                      setCustomerCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={customerCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() =>
                      setCustomerCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages),
                      )
                    }
                    disabled={customerCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCustomerCurrentPage(totalPages)}
                    disabled={customerCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Sales Channel Report Component Logic
  const renderSalesChannelReport = () => {
    if (ordersLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    if (!orders || !Array.isArray(orders)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Không có dữ liệu đơn hàng</div>
        </div>
      );
    }

    const validOrders = Array.isArray(orders) ? orders : [];

    // Filter orders that are completed, paid, or cancelled
    const relevantOrders = validOrders.filter((order: any) => {
      // Apply floor filter
      const floorMatch =
        selectedFloor === "all" ||
        !order.tableId ||
        !tables ||
        !Array.isArray(tables) ||
        tables.find((table: any) => table.id === order.tableId)?.floor ===
          selectedFloor;

      return (
        (order.status === "paid" ||
          order.status === "completed" ||
          order.status === "cancelled") &&
        floorMatch
      );
    });

    console.log("Sales Channel Report Debug:", {
      totalOrders: validOrders.length,
      relevantOrders: relevantOrders.length,
      completedOrders: relevantOrders.filter(
        (o) => o.status === "paid" || o.status === "completed",
      ).length,
      cancelledOrders: relevantOrders.filter((o) => o.status === "cancelled")
        .length,
      dateRange: `${startDate} to ${endDate}`,
      sampleOrder: relevantOrders[0]
        ? {
            id: relevantOrders[0].id,
            tableId: relevantOrders[0].tableId,
            total: relevantOrders[0].total,
            status: relevantOrders[0].status,
            salesChannel: relevantOrders[0].salesChannel,
          }
        : null,
    });

    // Group data by sales method (Dine In vs Takeaway)
    const salesMethodData: {
      [method: string]: {
        completedOrders: number;
        cancelledOrders: number;
        totalOrders: number;
        completedRevenue: number;
        cancelledRevenue: number;
        totalRevenue: number;
      };
    } = {
      [t("reports.dineIn")]: {
        completedOrders: 0,
        cancelledOrders: 0,
        totalOrders: 0,
        completedRevenue: 0,
        cancelledRevenue: 0,
        totalRevenue: 0,
      },
      [t("reports.takeaway")]: {
        completedOrders: 0,
        cancelledOrders: 0,
        totalOrders: 0,
        completedRevenue: 0,
        cancelledRevenue: 0,
        totalRevenue: 0,
      },
    };

    // Process all relevant orders (completed, paid, and cancelled)
    relevantOrders.forEach((order: any) => {
      // Check tableId or salesChannel to determine method
      const isDineIn = order.tableId && order.tableId !== null;
      const method = isDineIn ? t("reports.dineIn") : t("reports.takeaway");

      if (salesMethodData[method]) {
        const orderRevenue = Number(order.subtotal || 0); // Doanh thu = subtotal (chưa thuế)

        if (order.status === "cancelled") {
          salesMethodData[method].cancelledOrders += 1;
          salesMethodData[method].cancelledRevenue += orderRevenue;
        } else {
          // completed or paid orders
          salesMethodData[method].completedOrders += 1;
          salesMethodData[method].completedRevenue += orderRevenue;
        }

        salesMethodData[method].totalOrders += 1;
        salesMethodData[method].totalRevenue += orderRevenue;
      }
    });

    console.log("Sales Method Data:", salesMethodData);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("reports.channelSalesReport")}
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>
              {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
              {t("reports.toDate")}: {formatDate(endDate)}
            </span>
            <Button
              onClick={() => {
                // Prepare data with summary row
                const dataWithSummary = [
                  ...Object.entries(salesMethodData).map(([method, data]) => ({
                    "Phương thức bán hàng": method,
                    "Đơn đã hoàn thành": data.completedOrders,
                    "Doanh thu đã hoàn thành": formatCurrency(
                      data.completedRevenue,
                    ),
                    "Tổng đơn": data.totalOrders,
                    "Tổng doanh thu": formatCurrency(data.totalRevenue),
                  })),
                  // Add summary row
                  {
                    "Phương thức bán hàng": "TỔNG CỘNG",
                    "Đơn đã hoàn thành": Object.values(salesMethodData).reduce(
                      (sum, data) => sum + data.completedOrders,
                      0,
                    ),
                    "Doanh thu đã hoàn thành": formatCurrency(
                      Object.values(salesMethodData).reduce(
                        (sum, data) => sum + data.completedRevenue,
                        0,
                      ),
                    ),
                    "Tổng đơn": Object.values(salesMethodData).reduce(
                      (sum, data) => sum + data.totalOrders,
                      0,
                    ),
                    "Tổng doanh thu": formatCurrency(
                      Object.values(salesMethodData).reduce(
                        (sum, data) => sum + data.totalRevenue,
                        0,
                      ),
                    ),
                  },
                ];
                exportToExcel(
                  dataWithSummary,
                  `SalesChannel_${startDate}_to_${endDate}`,
                );
              }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("common.exportExcel")}
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="overflow-x-visible">
              <Table className="w-full min-w-[800px] xl:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="text-center font-bold bg-green-100 border"
                      rowSpan={2}
                    >
                      {t("reports.salesMethod")}
                    </TableHead>
                    <TableHead
                      className="text-center font-bold bg-green-100 border"
                      colSpan={3}
                    >
                      {t("reports.totalOrders")}
                    </TableHead>
                    <TableHead
                      className="text-center font-bold bg-green-100 border"
                      colSpan={3}
                    >
                      {t("reports.totalSalesRevenue")}
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center bg-green-50 border">
                      {t("reports.completed")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("reports.cancelled")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("common.total")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("reports.completed")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("reports.cancelled")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("common.total")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(salesMethodData).map(([method, data]) => (
                    <TableRow key={method} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-center border bg-blue-50">
                        {method}
                      </TableCell>
                      <TableCell className="text-center border">
                        {data.completedOrders}
                      </TableCell>
                      <TableCell className="text-center border">
                        {data.cancelledOrders}
                      </TableCell>
                      <TableCell className="text-center border font-medium">
                        {data.totalOrders}
                      </TableCell>
                      <TableCell className="text-right border">
                        {formatCurrency(data.completedRevenue)}
                      </TableCell>
                      <TableCell className="text-right border">
                        {formatCurrency(data.cancelledRevenue)}
                      </TableCell>
                      <TableCell className="text-right border font-medium">
                        {formatCurrency(data.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Summary Row */}
                  <TableRow className="bg-green-100 font-bold border-t-2">
                    <TableCell className="text-center border font-bold">
                      {t("common.total")}
                    </TableCell>
                    <TableCell className="text-center border">
                      {Object.values(salesMethodData).reduce(
                        (sum, data) => sum + data.completedOrders,
                        0,
                      )}
                    </TableCell>
                    <TableCell className="text-center border">
                      {Object.values(salesMethodData).reduce(
                        (sum, data) => sum + data.cancelledOrders,
                        0,
                      )}
                    </TableCell>
                    <TableCell className="text-center border font-medium">
                      {Object.values(salesMethodData).reduce(
                        (sum, data) => sum + data.totalOrders,
                        0,
                      )}
                    </TableCell>
                    <TableCell className="text-right border">
                      {formatCurrency(
                        Object.values(salesMethodData).reduce(
                          (sum, data) => sum + data.completedRevenue,
                          0,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right border">
                      {formatCurrency(
                        Object.values(salesMethodData).reduce(
                          (sum, data) => sum + data.cancelledRevenue,
                          0,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right border font-medium">
                      {formatCurrency(
                        Object.values(salesMethodData).reduce(
                          (sum, data) => sum + data.totalRevenue,
                          0,
                        ),
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Chart configurations for each analysis type
  const chartConfig = {
    revenue: {
      label: t("reports.revenue"),
      color: "#10b981",
    },
    netRevenue: {
      label: t("reports.netRevenue"),
      color: "#3b82f6",
    },
    returnValue: {
      label: t("reports.returnValue"),
      color: "#ef4444",
    },
    quantity: {
      label: t("reports.quantity"),
      color: "#f59e0b",
    },
    profit: {
      label: t("reports.profit"),
      color: "#8b5cf6",
    },
  };

  // Colors for pie chart
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // Get chart data based on analysis type
  const getChartData = () => {
    try {
      switch (analysisType) {
        case "time":
          const timeStart = new Date(startDate);
          const timeEnd = new Date(endDate);
          timeEnd.setHours(23, 59, 59, 999);

          // Group orders by date using EXACT same logic as dashboard
          const dailyData: {
            [date: string]: { revenue: number; orders: number };
          } = {};

          console.log("Time Analysis Debug:", {
            startDate,
            endDate,
            timeStart: timeStart.toISOString(),
            timeEnd: timeEnd.toISOString(),
            ordersLength: orders?.length || 0,
          });

          if (orders && Array.isArray(orders) && orders.length > 0) {
            // Use EXACT same filtering logic as dashboard
            const filteredOrders = orders.filter((order: any) => {
              try {
                // EXACT same status check as dashboard - exclude cancelled orders
                if (order.status !== "paid" && order.status !== "completed") {
                  return false;
                }

                // Apply floor filter
                const floorMatch =
                  selectedFloor === "all" ||
                  !order.tableId ||
                  !tables ||
                  !Array.isArray(tables) ||
                  tables.find((table: any) => table.id === order.tableId)
                    ?.floor === selectedFloor;

                // Apply store filter
                const storeMatch =
                  storeFilter === "all" || order.storeCode === storeFilter;

                // EXACT same date parsing as dashboard
                const orderDate = new Date(order.updatedAt);

                if (isNaN(orderDate.getTime())) {
                  console.warn("Invalid date for order:", order.id);
                  return false;
                }

                const dateMatch =
                  orderDate >= timeStart && orderDate <= timeEnd;
                return dateMatch && floorMatch && storeMatch;
              } catch (error) {
                console.warn("Error filtering order:", order.id, error);
                return false;
              }
            });

            console.log(
              `Time analysis: ${filteredOrders.length} orders after filtering`,
            );

            filteredOrders.forEach((order: any) => {
              try {
                const orderDate = new Date(order.updatedAt);
                const dateKey = orderDate.toISOString().split("T")[0];

                if (!dailyData[dateKey]) {
                  dailyData[dateKey] = { revenue: 0, orders: 0 };
                }

                const orderSubtotal = Number(order.subtotal || 0);
                let discount = Number(order.discount || 0);
                const revenue = Math.max(0, orderSubtotal - discount); // Ensure non-negative
                if (discount == 0) {
                  const filteredOrderItems = order.items.filter(
                    (item: any) => Number(item.discount || "0") > 0,
                  );
                  discount = filteredOrderItems.reduce(
                    (sum: number, item: any) =>
                      sum + Number(item.discount || "0"),
                    0,
                  );
                }

                dailyData[dateKey].revenue += revenue;
                dailyData[dateKey].orders += 1;
              } catch (error) {
                console.warn(
                  "Error processing order for chart:",
                  order.id,
                  error,
                );
              }
            });
          }

          const chartData = Object.keys(dailyData)
            .map((date) => ({
              name: formatDate(date),
              revenue: Math.round(dailyData[date].revenue), // Round to avoid floating point issues
              orders: dailyData[date].orders,
            }))
            .sort(
              (a, b) =>
                new Date(a.name.split("/").reverse().join("-")).getTime() -
                new Date(b.name.split("/").reverse().join("-")).getTime(),
            )
            .slice(0, 10);

          return chartData;

        case "product":
          // Use the new productAnalysisData
          if (productAnalysisLoading) {
            console.log("Product analysis still loading...");
            return [];
          }

          if (!productAnalysisData || !productAnalysisData.productStats) {
            console.log("No product analysis data available");
            return [];
          }

          const productStats = productAnalysisData.productStats || [];
          console.log("Product stats received:", productStats.length, "items");

          const productChartData = productStats
            .filter((product: any) => {
              const isValid =
                product &&
                product.productName &&
                typeof product.totalRevenue === "number" &&
                typeof product.totalQuantity === "number" &&
                product.totalQuantity > 0;
              if (!isValid) {
                console.warn("Invalid product data:", product);
              }
              return isValid;
            })
            .map((product: any) => ({
              name:
                product.productName.length > 15
                  ? product.productName.substring(0, 15) + "..."
                  : product.productName,
              revenue: Math.round(Number(product.totalRevenue) || 0),
              quantity: Number(product.totalQuantity) || 0,
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

          console.log("Generated product chart data:", productChartData);
          return productChartData;

        case "employee":
          try {
            if (!orders || !Array.isArray(orders) || orders.length === 0) {
              console.warn("Employee chart: No orders data available");
              return [];
            }

            const empStart = new Date(startDate);
            const empEnd = new Date(endDate);
            empEnd.setHours(23, 59, 59, 999);

            // Use EXACT same filtering logic as dashboard
            const empFilteredOrders = orders.filter((order: any) => {
              try {
                // Check if order is completed/paid (EXACT same as dashboard)
                if (order.status !== "completed" && order.status !== "paid")
                  return false;

                // Apply floor filter
                const floorMatch =
                  selectedFloor === "all" ||
                  !order.tableId ||
                  !tables ||
                  !Array.isArray(tables) ||
                  tables.find((table: any) => table.id === order.tableId)
                    ?.floor === selectedFloor;

                // Apply store filter
                const storeMatch =
                  storeFilter === "all" || order.storeCode === storeFilter;

                // Try multiple possible date fields (EXACT same as dashboard)
                const orderDate = new Date(
                  order.orderedAt ||
                    order.createdAt ||
                    order.created_at ||
                    order.paidAt,
                );

                // Skip if date is invalid
                if (isNaN(orderDate.getTime())) {
                  console.warn("Invalid date for employee order:", order.id);
                  return false;
                }

                // Fix date comparison - ensure we're comparing dates correctly
                const startOfDay = new Date(empStart);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(empEnd);
                endOfDay.setHours(23, 59, 59, 999);

                const dateMatch =
                  orderDate >= startOfDay && orderDate <= endOfDay;

                // Safe employee matching with proper null/undefined checks
                const employeeMatch =
                  !selectedEmployee ||
                  selectedEmployee === "all" ||
                  selectedEmployee === "" ||
                  (order.employeeName &&
                    order.employeeName === selectedEmployee) ||
                  (order.cashierName &&
                    order.cashierName === selectedEmployee) ||
                  (order.employeeId &&
                    order.employeeId.toString() === selectedEmployee) ||
                  (order.employeeName &&
                    typeof order.employeeName === "string" &&
                    selectedEmployee &&
                    typeof selectedEmployee === "string" &&
                    selectedEmployee !== "all" &&
                    selectedEmployee.trim() !== "" &&
                    order.employeeName
                      .toLowerCase()
                      .includes(selectedEmployee.toLowerCase())) ||
                  (order.cashierName &&
                    typeof order.cashierName === "string" &&
                    selectedEmployee &&
                    typeof selectedEmployee === "string" &&
                    selectedEmployee !== "all" &&
                    selectedEmployee.trim() !== "" &&
                    order.cashierName
                      .toLowerCase()
                      .includes(selectedEmployee.toLowerCase()));

                return dateMatch && employeeMatch && floorMatch && storeMatch;
              } catch (error) {
                console.warn(
                  "Error filtering employee order:",
                  order.id,
                  error,
                );
                return false;
              }
            });

            const employeeData: {
              [cashier: string]: { revenue: number; orders: number };
            } = {};

            empFilteredOrders.forEach((order: any) => {
              try {
                const cashier =
                  order.cashierName || order.employeeName || "Unknown";
                if (!employeeData[cashier]) {
                  employeeData[cashier] = { revenue: 0, orders: 0 };
                }

                // Use subtotal as revenue (excludes tax): subtotal - discount
                const orderSubtotal = Number(order.subtotal || 0);
                const orderDiscount = Number(order.discount || 0);
                const revenue = Math.max(0, orderSubtotal - orderDiscount); // Ensure non-negative

                employeeData[cashier].revenue += revenue;
                employeeData[cashier].orders += 1;
              } catch (error) {
                console.warn(
                  "Error processing employee order:",
                  order.id,
                  error,
                );
              }
            });

            const result = Object.entries(employeeData)
              .filter(([name, data]) => data.revenue > 0 || data.orders > 0) // Filter before mapping
              .map(([name, data]) => ({
                name:
                  name && name.length > 10
                    ? name.substring(0, 10) + "..."
                    : name || "Unknown",
                revenue: Math.round(data.revenue || 0),
                orders: data.orders || 0,
              }))
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 10);

            console.log("Employee chart data generated:", {
              filteredOrdersCount: empFilteredOrders.length,
              employeeDataKeys: Object.keys(employeeData),
              result,
            });

            return result;
          } catch (error) {
            console.error("Error in employee chart data generation:", error);
            return [];
          }

        case "customer":
          try {
            if (!orders || !Array.isArray(orders) || orders.length === 0) {
              console.warn("Customer chart: No orders data available");
              return [];
            }

            const custStart = new Date(startDate);
            const custEnd = new Date(endDate);
            custEnd.setHours(23, 59, 59, 999);

            const custFilteredOrders = orders.filter((order: any) => {
              try {
                const orderDate = new Date(
                  order.orderedAt || order.created_at || order.createdAt,
                );

                if (isNaN(orderDate.getTime())) {
                  console.warn("Invalid date for customer order:", order.id);
                  return false;
                }

                // Apply floor filter
                const floorMatch =
                  selectedFloor === "all" ||
                  !order.tableId ||
                  !tables ||
                  !Array.isArray(tables) ||
                  tables.find((table: any) => table.id === order.tableId)
                    ?.floor === selectedFloor;

                // Apply store filter
                const storeMatch =
                  storeFilter === "all" || order.storeCode === storeFilter;

                return (
                  orderDate >= custStart &&
                  orderDate <= custEnd &&
                  order.status === "paid" &&
                  floorMatch &&
                  storeMatch
                );
              } catch (error) {
                console.warn(
                  "Error filtering customer order:",
                  order.id,
                  error,
                );
                return false;
              }
            });

            const customerData: {
              [customerId: string]: {
                customerName: string;
                orders: number;
                revenue: number;
              };
            } = {};

            custFilteredOrders.forEach((order: any) => {
              try {
                const customerId = order.customerId || "";
                const customerName = order.customerName || "";

                if (!customerData[customerId]) {
                  customerData[customerId] = {
                    customerName: customerName,
                    orders: 0,
                    revenue: 0,
                  };
                }

                const orderSubtotal = Number(order.subtotal || 0);
                const orderDiscount = Number(order.discount || 0);
                const revenue = Math.max(0, orderSubtotal - orderDiscount);

                customerData[customerId].orders += 1;
                customerData[customerId].revenue += revenue;
              } catch (error) {
                console.warn(
                  "Error processing customer order:",
                  order.id,
                  error,
                );
              }
            });

            return Object.entries(customerData)
              .filter(([_, data]) => data.revenue > 0 || data.orders > 0)
              .map(([customerId, data]) => ({
                name:
                  data.customerName.length > 10
                    ? data.customerName.substring(0, 10) + "..."
                    : data.customerName,
                revenue: Math.round(data.revenue),
                orders: data.orders,
              }))
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 10);
          } catch (error) {
            console.error("Error in customer chart data generation:", error);
            return [];
          }

        case "salesMethod":
          try {
            if (!orders || !Array.isArray(orders) || orders.length === 0) {
              console.warn("Sales method chart: No orders data available");
              return [];
            }

            const salesMethodStart = new Date(startDate);
            const salesMethodEnd = new Date(endDate);
            salesMethodEnd.setHours(23, 59, 59, 999);

            // Filter orders that are completed, paid, or cancelled
            const salesMethodFilteredOrders = orders.filter((order: any) => {
              try {
                if (
                  order.status !== "completed" &&
                  order.status !== "paid" &&
                  order.status !== "cancelled"
                )
                  return false;

                // Apply floor filter
                const floorMatch =
                  selectedFloor === "all" ||
                  !order.tableId ||
                  !tables ||
                  !Array.isArray(tables) ||
                  tables.find((table: any) => table.id === order.tableId)
                    ?.floor === selectedFloor;

                // Apply store filter
                const storeMatch =
                  storeFilter === "all" || order.storeCode === storeFilter;

                const orderDate = new Date(
                  order.orderedAt ||
                    order.createdAt ||
                    order.created_at ||
                    order.paidAt,
                );

                if (isNaN(orderDate.getTime())) {
                  console.warn(
                    "Invalid date for sales method order:",
                    order.id,
                  );
                  return false;
                }

                return (
                  orderDate >= salesMethodStart &&
                  orderDate <= salesMethodEnd &&
                  floorMatch &&
                  storeMatch
                );
              } catch (error) {
                console.warn(
                  "Error filtering sales method order:",
                  order.id,
                  error,
                );
                return false;
              }
            });

            // Group by sales method (Dine In vs Takeaway)
            const salesMethodData: {
              [method: string]: {
                count: number;
                revenue: number;
                cancelledCount: number;
                cancelledRevenue: number;
              };
            } = {
              "Ăn tại chỗ": {
                count: 0,
                revenue: 0,
                cancelledCount: 0,
                cancelledRevenue: 0,
              },
              "Mang về": {
                count: 0,
                revenue: 0,
                cancelledCount: 0,
                cancelledRevenue: 0,
              },
            };

            salesMethodFilteredOrders.forEach((order: any) => {
              try {
                // Check if order has tableId to determine if it's dine-in or takeaway
                const isDineIn = order.tableId && order.tableId !== null;
                const method = isDineIn ? "Ăn tại chỗ" : "Mang về";

                const orderRevenue = Number(order.subtotal || 0);
                const orderDiscount = Number(order.discount || 0);
                const revenue = Math.max(0, orderRevenue - orderDiscount);

                if (order.status === "cancelled") {
                  salesMethodData[method].cancelledCount += 1;
                  salesMethodData[method].cancelledRevenue += revenue;
                } else {
                  salesMethodData[method].count += 1;
                  salesMethodData[method].revenue += revenue;
                }
              } catch (error) {
                console.warn(
                  "Error processing sales method order:",
                  order.id,
                  error,
                );
              }
            });

            // Convert to chart data format - show total revenue (including cancelled)
            const salesMethodChartData = Object.entries(salesMethodData)
              .map(([method, data]) => ({
                name: method,
                value: Math.round(data.revenue + data.cancelledRevenue), // Total revenue including cancelled
                count: data.count + data.cancelledCount, // Total orders including cancelled
                completedRevenue: Math.round(data.revenue),
                cancelledRevenue: Math.round(data.cancelledRevenue),
              }))
              .filter((item) => item.value > 0 || item.count > 0); // Show methods with revenue or count

            console.log("Sales method chart data:", salesMethodChartData);
            return salesMethodChartData;
          } catch (error) {
            console.error(
              "Error in sales method chart data generation:",
              error,
            );
            return [];
          }
        default:
          console.warn("Unknown analysis type:", analysisType);
          return [];
      }
    } catch (error) {
      console.error("Error in getChartData:", error);
      return [];
    }
  };

  // Product Report Logic (Moved up to be before renderChart)
  const renderProductReport = () => {
    if (productAnalysisLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    if (
      !productAnalysisData?.productStats ||
      productAnalysisData.productStats.length === 0
    ) {
      return (
        <div className="text-center py-8">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("reports.noDataTitle")}
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            📊 {t("reports.noDataDescription")}
            <br />({formatDate(startDate)} - {formatDate(endDate)})
            <br />
            Thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu đơn hàng và hóa
            đơn
          </p>
          <div className="mt-4 text-sm text-gray-400">
            Không có dữ liệu sản phẩm
          </div>
        </div>
      );
    }

    const {
      productStats,
      totalRevenue,
      totalQuantity,
      totalDiscount,
      totalProducts,
    } = productAnalysisData;

    const getSalesData = () => {
      return productStats || [];
    };
    console.log("Product Analysis Data:", productAnalysisData);

    const data = getSalesData();
    const totalPages = Math.ceil(data.length / productPageSize);
    const startIndex = (productCurrentPage - 1) * productPageSize;
    const endIndex = startIndex + productPageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.salesReportByProduct")}
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>
              {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
              {t("reports.toDate")}: {formatDate(endDate)}
            </span>
            <Button
              onClick={() => {
                const dataWithSummary = [
                  ...data.map((product: any) => ({
                    "Mã hàng": product.productSku,
                    "Tên hàng": product.productName,
                    "Đơn vị tính": t("common.perUnit"),
                    "Sn lượng bán": product.quantity,
                    "Thành tiền": formatCurrency(
                      (product.unitPrice || 0) * (product.quantity || 1),
                    ),
                    "Giảm giá": formatCurrency(product.discount),
                    "Doanh thu": formatCurrency(
                      (product.unitPrice || 0) * (product.quantity || 1) -
                        (product.discount || 0),
                    ),
                    "Nhóm hàng": product.categoryName,
                  })),
                  // Add summary row
                  {
                    "Mã hàng": "TỔNG CỘNG",
                    "Tên hàng": `${totalProducts} sản phẩm`,
                    "Đơn vị tính": "-",
                    "Số l>ợng bán": totalQuantity,
                    "Thành tiền": formatCurrency(totalRevenue),
                    "Giảm giá": formatCurrency(totalDiscount),
                    "Doanh thu": formatCurrency(
                      (totalRevenue || 0) - (totalDiscount || 0),
                    ),
                    "Nhóm hàng": "-",
                  },
                ];
                exportToExcel(
                  dataWithSummary,
                  `ProductAnalysis_${startDate}_to_${endDate}`,
                );
              }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("common.exportExcel")}
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="overflow-x-auto xl:overflow-x-visible">
              <Table className="w-full min-w-[1000px] xl:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead> {t("reports.productCode")} </TableHead>
                    <TableHead> {t("reports.productName")} </TableHead>
                    <TableHead className="text-center">
                      {t("common.unit")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("reports.quantitySold")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("reports.thanhTien")}
                    </TableHead>
                    {analysisType !== "employee" && (
                      <TableHead className="text-right">
                        {t("reports.discount")}
                      </TableHead>
                    )}
                    <TableHead className="text-right">
                      {t("reports.revenue")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("reports.productGroup")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((product: any, index: number) => (
                      <TableRow key={product.productId || index}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => {
                              // Map product analysis data to modal format
                              const productForModal = {
                                id: product.productId,
                                name: product.productName,
                                sku: product.productSku,
                                price: product.unitPrice || 0,
                                stock: 0, // Not available in analysis data
                                categoryId: 0, // Not available in analysis data
                                categoryName: product.categoryName,
                                imageUrl: null,
                                isActive: true,
                                productType: 1,
                                trackInventory: false,
                                taxRate: product,
                                priceIncludesTax: false,
                                afterTaxPrice: product.unitPrice || 0,
                                createdAt: null,
                                updatedAt: null,
                              };
                              // setSelectedProduct(productForModal);
                              // setShowProductDetail(true);
                              setSearchSKU(product.productSku);
                              setShowProductManager(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {product.productSku}
                          </button>
                        </TableCell>
                        <TableCell> {product.productName} </TableCell>
                        <TableCell className="text-center">
                          {t("common.perUnit")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline"> {product.quantity} </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(
                            (product.unitPrice || 0) * (product.quantity || 1),
                          )}
                        </TableCell>
                        {analysisType !== "employee" && (
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(product.discount)}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(
                            (product.unitPrice || 0) * (product.quantity || 1) -
                              (product.discount || 0),
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.categoryName}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-gray-500 italic"
                      >
                        {t("reports.noDataDescription")}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Summary Row */}
                  {data.length > 0 && (
                    <TableRow className="bg-gray-100 font-bold border-t-2">
                      <TableCell className="text-center font-bold">
                        TỔNG CỘNG
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {totalProducts} sản phẩm
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        Món
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        <Badge variant="outline" className="font-bold">
                          {totalQuantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                      {analysisType !== "employee" && (
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(totalDiscount)}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(
                          (totalRevenue || 0) - (totalDiscount || 0),
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {" "}
                        -
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls for Product Report */}
          {data.length > 0 && (
            <div className="flex items-center justify-between space-x-6 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium"> {t("common.show")} </p>
                <Select
                  value={productPageSize.toString()}
                  onValueChange={(value) => {
                    setProductPageSize(Number(value));
                    setProductCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="15"> 15 </SelectItem>
                    <SelectItem value="20"> 20 </SelectItem>
                    <SelectItem value="30"> 30 </SelectItem>
                    <SelectItem value="50"> 50 </SelectItem>
                    <SelectItem value="100"> 100 </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm font-medium"> {t("common.rows")} </p>
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {productCurrentPage} / {totalPages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setProductCurrentPage(1)}
                    disabled={productCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() =>
                      setProductCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={productCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() =>
                      setProductCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages),
                      )
                    }
                    disabled={productCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    {">"}
                  </button>
                  <button
                    onClick={() => setProductCurrentPage(totalPages)}
                    disabled={productCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    »
                  </button>
                </div>
              </div>{" "}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render Chart component
  const renderChart = () => {
    try {
      const chartData = getChartData();

      console.log("Chart data for", analysisType, ":", chartData);

      // Validate chart data
      const isValidChartData =
        Array.isArray(chartData) &&
        chartData.length > 0 &&
        chartData.every(
          (item) => item && typeof item === "object" && item.name,
        );

      // Always render the chart container, even with no data
      return (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-white/90 text-sm font-normal">
                  {t("reports.chartView")}
                </div>
                <div className="text-white font-semibold">
                  {getReportTitle()}
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              {t("reports.visualRepresentation")} - {t("reports.fromDate")}:{" "}
              {formatDate(startDate)} {t("reports.toDate")}:{" "}
              {formatDate(endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
            {!isValidChartData ? (
              <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 flex flex-col justify-center items-center">
                <div className="text-gray-500 mb-4 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium mb-2">
                    {t("reports.noDataDescription")}
                  </div>
                  <div className="text-sm text-orange-600 mb-2">
                    📊 Không có dữ liệu trong khoảng thời gian đã chọn
                  </div>
                  <div className="text-sm text-gray-400">
                    ({formatDate(startDate)} - {formatDate(endDate)})
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu đơn
                    hàng và hóa đơn
                  </div>
                </div>
              </div>
            ) : analysisType === "salesMethod" ? (
              <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20 rounded-xl"></div>
                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full relative z-10"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value, count }) =>
                          `${name}: ${formatCurrency(value)} (${count} đơn)`
                        }
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-gray-200 shadow-lg">
                                <p className="font-semibold text-gray-800 mb-2">
                                  {data.name}
                                </p>
                                <p className="text-sm text-blue-600">
                                  Doanh thu: {formatCurrency(data.value)}
                                </p>
                                <p className="text-sm text-green-600">
                                  Số đơn: {data.count}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20 rounded-xl"></div>
                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full relative z-10"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient
                          id="revenueGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0.6}
                          />
                        </linearGradient>
                        <linearGradient
                          id="ordersGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0.6}
                          />
                        </linearGradient>
                        <linearGradient
                          id="quantityGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#f59e0b"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="95%"
                            stopColor="#f59e0b"
                            stopOpacity={0.6}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-gray-200 shadow-lg">
                                <p className="font-semibold text-gray-800 mb-2">
                                  {label}
                                </p>
                                {payload.map((entry, index) => {
                                  const translatedName =
                                    entry.dataKey === "revenue"
                                      ? t("reports.revenue")
                                      : entry.dataKey === "orders"
                                        ? t("reports.orders")
                                        : entry.dataKey === "quantity"
                                          ? t("reports.quantity")
                                          : entry.name;
                                  return (
                                    <p
                                      key={index}
                                      className="text-sm"
                                      style={{ color: entry.color }}
                                    >
                                      {translatedName}:{" "}
                                      {entry.dataKey === "revenue" ||
                                      entry.dataKey === "netRevenue"
                                        ? formatCurrency(Number(entry.value))
                                        : entry.value}
                                    </p>
                                  );
                                })}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Revenue bar - always show */}
                      <Bar
                        dataKey="revenue"
                        fill="url(#revenueGradient)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />

                      {/* Additional bars based on analysis type */}
                      {analysisType === "time" && (
                        <Bar
                          dataKey="orders"
                          fill="url(#ordersGradient)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      )}

                      {(analysisType === "employee" ||
                        analysisType === "customer" ||
                        analysisType === "salesDetail") && (
                        <Bar
                          dataKey="orders"
                          fill="url(#ordersGradient)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      );
    } catch (error) {
      console.error("Error in renderChart:", error);
      return (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-red-50/50 to-pink-50/30">
          <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-white/90 text-sm font-normal">
                  {t("reports.chartView")}
                </div>
                <div className="text-white font-semibold">
                  Lỗi hiển thị biểu đồ
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
            <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 flex flex-col justify-center items-center">
              <div className="text-red-500 text-center">
                <p className="text-lg font-medium mb-2">
                  Lỗi khi hiển thị biểu đồ
                </p>
                <p className="text-sm">{error?.message || "Unknown error"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  // Main render function
  const renderReportContent = () => {
    try {
      console.log(
        "Rendering report content for analysisType:",
        analysisType,
        "concernType:",
        concernType,
      );

      switch (analysisType) {
        case "time":
          // Handle concernType for time-based analysis
          if (concernType === "employee") {
            return renderEmployeeReport();
          } else if (concernType === "salesDetail") {
            return renderSalesDetailReport();
          }
          return renderSalesReport();
        case "product":
          return renderProductReport();
        case "employee":
          return renderEmployeeReport();
        case "customer":
          return renderCustomerReport();
        case "salesMethod":
          return renderSalesChannelReport(); // Reuse channel report logic
        case "salesDetail":
          return renderSalesDetailReport();
        default:
          return renderSalesReport();
      }
    } catch (error) {
      console.error("Error in renderReportContent:", error);
      return (
        <div className="flex justify-center py-8">
          <div className="text-red-500">
            <p>Có lỗi xảy ra khi hiển thị báo cáo</p>
            <p className="text-sm">{error?.message || "Unknown error"}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-blue-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Main Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Store Filter - Only show for admin users */}
              {isAdmin && (
                <div>
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    Cửa hàng
                  </Label>
                  <Select
                    value={storeFilter}
                    onValueChange={setStoreFilter}
                    disabled={storesLoading}
                  >
                    <SelectTrigger className="h-10 text-sm border-gray-200 hover:border-cyan-300 transition-colors">
                      <SelectValue
                        placeholder={
                          storesLoading
                            ? "Đang tải..."
                            : storeFilter === "all"
                              ? "Tất cả"
                              : storesFilterData
                                  ?.filter((store: any) => store.typeUser !== 1)
                                  .find(
                                    (store: any) =>
                                      store.storeCode === storeFilter,
                                  )?.storeName
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {storesFilterData &&
                        Array.isArray(storesFilterData) &&
                        storesFilterData.length > 1 && (
                          <SelectItem value="all">{t("common.all")}</SelectItem>
                        )}
                      {storesFilterData &&
                        Array.isArray(storesFilterData) &&
                        storesFilterData.map((store: any) => (
                          <SelectItem key={store.id} value={store.storeCode}>
                            {store.storeName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {storesLoading && (
                    <p className="text-xs text-gray-400 mt-1">
                      Đang tải danh sách cửa hàng...
                    </p>
                  )}
                  {!storesLoading && !storesFilterData && (
                    <p className="text-xs text-red-500 mt-1">
                      Lỗi khi tải danh sách cửa hàng
                    </p>
                  )}
                </div>
              )}

              {/* Analysis Type */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  {t("reports.analyzeBy")}
                </Label>
                <Select
                  value={analysisType}
                  onValueChange={(value) => {
                    setAnalysisType(value);
                    // Reset concernType when analysisType changes if necessary
                    if (value === "time") {
                      setConcernType("time"); // Default for time analysis
                    } else if (value === "salesDetail") {
                      setConcernType("sales"); // Default for sales detail analysis
                    } else {
                      // If moving away from 'time', ensure concernType is sensible or reset
                      setConcernType("sales"); // Or a more appropriate default
                    }
                  }}
                >
                  <SelectTrigger className="h-10 text-sm border-gray-200 hover:border-blue-300 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">
                      {t("reports.timeAnalysis")}
                    </SelectItem>
                    <SelectItem value="product">
                      {t("reports.productAnalysis")}
                    </SelectItem>
                    {/* <SelectItem value="employee">
                      {t("reports.employeeAnalysis")}
                    </SelectItem> */}
                    <SelectItem value="customer">
                      {t("reports.customerAnalysis")}
                    </SelectItem>
                    {/* <SelectItem value="salesMethod">
                      {t("reports.salesMethod")}
                    </SelectItem> */}
                    <SelectItem value="salesDetail">
                      {t("reports.salesDetailReport")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {t("reports.startDate")}
                </Label>
                <Input
                  type="datetime-local"
                  value={
                    startDate && startTime ? `${startDate}T${startTime}` : ""
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      const [date, time] = e.target.value.split("T");
                      setStartDate(date);
                      setStartTime(time || "00:00");
                    }
                  }}
                  className="h-10 text-sm border-gray-200 hover:border-green-300 focus:border-green-500 transition-colors"
                  placeholder="dd/MM/yyyy HH:mm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {t("reports.endDate")}
                </Label>
                <Input
                  type="datetime-local"
                  value={endDate && endTime ? `${endDate}T${endTime}` : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [date, time] = e.target.value.split("T");
                      setEndDate(date);
                      setEndTime(time || "23:59");
                    }
                  }}
                  className="h-10 text-sm border-gray-200 hover:border-green-300 focus:border-green-500 transition-colors"
                  placeholder="dd/MM/yyyy HH:mm"
                />
              </div>

              {/* Shop Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  {t("common.shop")}
                </Label>
                <Select
                  value={selectedShop}
                  onValueChange={setSelectedShop}
                  disabled={tablesLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        tablesLoading
                          ? t("common.loading")
                          : t("common.selectShop")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {tablesLoading ? (
                      <SelectItem value="loading" disabled>
                        {t("common.loadingData")}
                      </SelectItem>
                    ) : tablesError ? (
                      <SelectItem value="error" disabled>
                        {t("common.errorLoadingData")}
                      </SelectItem>
                    ) : (
                      getStoresFilter().map((stores: any) => (
                        <SelectItem
                          key={stores.storeCode}
                          value={stores.storeCode}
                        >
                          {stores.storeName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {tablesError && (
                  <p className="text-xs text-red-500 mt-1">
                    Không thể tải dữ liệu cửa hàng
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Filter Row - Show based on analysis type */}
          {analysisType === "employee" && (
            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    {t("reports.employeeFilter")}
                  </Label>
                  <div className="relative">
                    {" "}
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.employeeFilterPlaceholder")}
                      value={selectedEmployee === "all" ? "" : selectedEmployee}
                      onChange={(e) =>
                        setSelectedEmployee(e.target.value || "all")
                      }
                      className="pl-10 h-10 text-sm border-gray-200 hover:border-purple-300 focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {analysisType === "customer" && (
            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    {t("reports.customerFilter")}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.customerFilterPlaceholder")}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10 h-10 text-sm border-gray-200 hover:border-orange-300 focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {analysisType === "product" && (
            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    {t("reports.productFilter")}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.productFilterPlaceholder")}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 h-10 text-sm border-gray-200 hover:border-indigo-300 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    {t("common.productType")}
                  </Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger className="h-10 text-sm border-gray-200 hover:border-indigo-300 focus:border-indigo-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="combo">
                        {t("reports.combo")}
                      </SelectItem>
                      <SelectItem value="product">
                        {t("reports.product")}
                      </SelectItem>
                      <SelectItem value="service">
                        {t("reports.service")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    {t("reports.productGroup")}
                  </Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="h-10 text-sm border-gray-200 hover:border-indigo-300 focus:border-indigo-500 transition-colors">
                      <SelectValue placeholder={t("reports.productGroup")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {categories &&
                        Array.isArray(categories) &&
                        categories.map((category: any) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {analysisType === "salesMethod" && (
            <div className="pt-4 border-t border-gray-100">
              {/* No additional filters for sales method analysis */}
            </div>
          )}

          {/* Sales Detail Report Filters */}
          {analysisType === "salesDetail" && (
            <div className="pt-4 border-t border-gray-100">
              <div className="space-y-4">
                {/* Employee and Order Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      {t("reports.employeeFilter")}
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder={t("reports.employeeFilterPlaceholder")}
                        value={
                          selectedEmployee === "all" ? "" : selectedEmployee
                        }
                        onChange={(e) =>
                          setSelectedEmployee(e.target.value || "all")
                        }
                        className="pl-10 h-10 text-sm border-gray-200 hover:border-pink-300 focus:border-pink-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      {t("reports.orderCode")}
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Tìm theo mã đơn hàng..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="pl-10 h-10 text-sm border-gray-200 hover:border-pink-300 focus:border-pink-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      {t("reports.productGroup")}
                    </Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="h-10 text-sm border-gray-200 hover:border-pink-300 focus:border-pink-500 transition-colors">
                        <SelectValue placeholder={t("reports.productGroup")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {categories &&
                          Array.isArray(categories) &&
                          categories.map((category: any) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Customer Search and Product Search */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      {t("reports.customerSearch")}
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Tìm theo tên, mã KH, SĐT..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10 h-10 text-sm border-gray-200 hover:border-teal-300 focus:border-teal-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      {t("reports.productFilter")}
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder={t("reports.productFilterPlaceholder")}
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10 h-10 text-sm border-gray-200 hover:border-teal-300 focus:border-teal-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      {t("reports.status")}
                    </Label>
                    <Select
                      value={orderStatusFilter}
                      onValueChange={setOrderStatusFilter}
                      defaultValue="all"
                    >
                      <SelectTrigger className="h-10 text-sm border-gray-200 hover:border-teal-300 focus:border-teal-500 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        <SelectItem value="completed">
                          {t("reports.completed")}
                        </SelectItem>
                        <SelectItem value="cancelled">
                          {t("reports.cancelled")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t("reports.loading")}...</div>
          </div>
        ) : (
          <>
            {/* Chart Display */}
            {(analysisType === "time" ||
              analysisType === "product" ||
              analysisType === "employee" ||
              analysisType === "customer" ||
              analysisType === "salesMethod") &&
              renderChart()}

            {/* Data Tables */}
            {renderReportContent()}
          </>
        )}
      </div>

      {showProductManager && (
        <ProductManagerModal
          isOpen={showProductManager}
          onClose={() => {
            setShowProductManager(false);
            setSearchSKU("");
          }}
          initialSearchSKU={searchSKU}
        />
      )}
    </div>
  );
}
