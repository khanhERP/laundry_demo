import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import IncomeVoucherModal from "@/components/pos/income-voucher-modal";
import ExpenseVoucherModal from "@/components/pos/expense-voucher-modal";
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  FileText,
  Plus,
  Minus,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CashBookPageProps {
  onLogout: () => void;
}

interface CashTransaction {
  id: string;
  date: string;
  description: string;
  source: string;
  type: "thu" | "chi";
  amount: number;
  balance: number;
  voucherType?: string;
  internalId?: number;
  selected?: boolean; // Added for checkbox selection
  completionDate?: string; // Added for sorting by completion time
}

export default function CashBookPage({ onLogout }: CashBookPageProps) {
  const { t } = useTranslation();

  // Modal states
  const [showIncomeVoucherModal, setShowIncomeVoucherModal] = useState(false);
  const [showExpenseVoucherModal, setShowExpenseVoucherModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherMode, setVoucherMode] = useState("create");

  // Filters
  const [filterType, setFilterType] = useState("all"); // "all", "thu", "chi"
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all"); // "all" or specific payment method
  const [voucherTypeFilter, setVoucherTypeFilter] = useState("all"); // "all", "income_voucher", "expense_voucher", "purchase_receipt", "sales_order"
  const [storeFilter, setStoreFilter] = useState("all");
  const [voucherNumberFilter, setVoucherNumberFilter] = useState(""); // Filter by voucher number
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Điều chỉnh về giờ địa phương
    const localDate = new Date(
      firstDayOfMonth.getTime() - firstDayOfMonth.getTimezoneOffset() * 60000,
    );
    return localDate.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // For row selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // For sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Query general settings to determine date filter logic
  const { data: generalSettings = [] } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/general-settings"],
    queryFn: async () => {
      try {
        const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/general-settings");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching general settings:", error);
        return [];
      }
    },
  });

  // Check if ST-002 (ngày tạo đơn) is active
  const useCreatedAtFilter = generalSettings.find(
    (s: any) => s.settingCode === "ST-002" && s.isActive === true,
  );

  // Query orders (thu - income from sales)
  const { data: orders = [] } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/orders"],
    queryFn: async () => {
      try {
        const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/orders");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
      }
    },
  });

  // Query purchase receipts (chi - expenses from purchases)
  const { data: purchaseReceipts = [] } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/purchase-receipts"],
    queryFn: async () => {
      try {
        const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/purchase-receipts");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        console.error("Error fetching purchase receipts:", error);
        return [];
      }
    },
  });

  // Query income vouchers (thu - manual income entries)
  const { data: incomeVouchers = [] } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/income-vouchers"],
    queryFn: async () => {
      try {
        const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/income-vouchers");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching income vouchers:", error);
        return [];
      }
    },
  });

  // Query expense vouchers (chi - manual expense entries)
  const { data: expenseVouchers = [] } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/expense-vouchers"],
    queryFn: async () => {
      try {
        const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/expense-vouchers");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching expense vouchers:", error);
        return [];
      }
    },
  });

  // Query suppliers for name mapping
  const { data: suppliers = [] } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/suppliers"],
    queryFn: async () => {
      try {
        const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/suppliers");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    },
  });

  // Fetch stores for filtering
  const { data: storesData = [] } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/store-settings/list"],
    queryFn: async () => {
      try {
        const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/store-settings/list");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Filter out stores with typeUser = 1
        return Array.isArray(data)
          ? data.filter((store: any) => store.typeUser !== 1)
          : [];
      } catch (error) {
        console.error("Error fetching stores:", error);
        return [];
      }
    },
  });

  // Auto-select first store if storeFilter is "all" and there's only one store
  useEffect(() => {
    if (storesData && storesData.length > 0) {
      const filteredStores = storesData.filter(
        (store: any) => store.typeUser !== 1,
      );
      if (filteredStores.length === 1 && storeFilter === "all") {
        setStoreFilter(filteredStores[0].storeCode);
      }
    }
  }, [storesData]);

  // Load payment methods from localStorage (same as settings page)
  // Query payment methods from API
  const { data: paymentMethodsData } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/payment-methods"],
    queryFn: async () => {
      const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/payment-methods");
      return response.json();
    },
  });

  const getPaymentMethods = () => {
    const paymentMethods = paymentMethodsData || [];

    // Filter to only return enabled payment methods
    return paymentMethods.filter((method: any) => method.enabled === true);
  };

  const paymentMethods = getPaymentMethods();

  // Calculate cash book data
  const cashBookData = useMemo(() => {
    const transactions: CashTransaction[] = [];

    // Add income transactions from orders (thu)
    orders
      .filter((order) => {
        const isPaid =
          order.status === "paid" || order.paymentStatus === "paid";
        if (!isPaid) return false;

        // Apply store filter based on admin status
        if (storeFilter !== "all") {
          // Specific store selected
          if (order.storeCode !== storeFilter) return false;
        }

        // Apply payment method filter
        if (paymentMethodFilter !== "all") {
          // Check if payment method is multi-payment (JSON array)
          if (order.paymentMethod && order.paymentMethod.startsWith("[")) {
            try {
              const paymentMethods = JSON.parse(order.paymentMethod);
              // Check if any payment method in the array matches the filter
              return paymentMethods.some(
                (pm: any) => pm.method === paymentMethodFilter,
              );
            } catch (e) {
              console.error("Error parsing payment method:", e);
              return false;
            }
          }
          // Single payment method
          return order.paymentMethod === paymentMethodFilter;
        }
        return true;
      })
      .forEach((order) => {
        // Use orderedAt or updatedAt based on general settings
        // ST-002 = true: Use orderedAt (ngày đặt hàng/ngày tạo đơn)
        // ST-002 = false: Use updatedAt (ngày hoàn thành/hủy đơn)
        const orderDate = useCreatedAtFilter
          ? new Date(order.orderedAt)
          : new Date(order.updatedAt);

        // Calculate amount based on payment method filter
        let transactionAmount = parseFloat(order.total || "0");

        // If filtering by specific payment method and order has multi-payment
        if (
          paymentMethodFilter !== "all" &&
          order.paymentMethod &&
          order.paymentMethod.startsWith("[")
        ) {
          try {
            const paymentMethods = JSON.parse(order.paymentMethod);
            const matchedMethod = paymentMethods.find(
              (pm: any) => pm.method === paymentMethodFilter,
            );
            if (matchedMethod) {
              // Use the specific amount for this payment method
              transactionAmount = parseFloat(matchedMethod.amount || "0");
            }
          } catch (e) {
            console.error("Error parsing payment method for amount:", e);
          }
        }

        transactions.push({
          id: order.orderNumber || `ORDER-${order.id}`, // Use actual order number
          date: orderDate.toISOString().split("T")[0], // Using updatedAt (completion date)
          description:
            order.salesChannel === "table"
              ? "tableSalesTransaction"
              : "salesTransaction",
          source: order.customerName || t("common.customer"),
          type: "thu", // All paid orders are income transactions
          amount: transactionAmount,
          balance: 0, // Will be calculated later
          voucherType: "sales_order",
          completionDate: useCreatedAtFilter
            ? order.createdAt
            : order.updatedAt,
        });
      });

    // Add income transactions from income vouchers (thu)
    incomeVouchers
      .filter((voucher) => {
        // Apply store filter
        if (storeFilter !== "all") {
          if (voucher.storeCode !== storeFilter) return false;
        }

        // Apply payment method filter - income vouchers use 'account' field
        if (paymentMethodFilter !== "all") {
          return voucher.account === paymentMethodFilter;
        }
        return true;
      })
      .forEach((voucher) => {
        // Validate date before adding to transactions
        const voucherDate = voucher.date ? new Date(voucher.date) : new Date();
        const isValidDate = !isNaN(voucherDate.getTime());

        if (isValidDate) {
          transactions.push({
            id: voucher.voucherNumber, // Use actual voucher number instead of internal ID
            date: voucher.date || new Date().toISOString().split("T")[0],
            description: voucher.category || "orther",
            source: voucher.recipient || "",
            type: "thu",
            amount: parseFloat(voucher.amount || "0"),
            balance: 0, // Will be calculated later
            voucherType: "income_voucher",
            internalId: voucher.id, // Keep internal ID for click handling
            completionDate: voucher.updatedAt,
          });
        }
      });

    // Add expense transactions from expense vouchers (chi)
    expenseVouchers
      .filter((voucher) => {
        // Apply store filter
        if (storeFilter !== "all") {
          if (voucher.storeCode !== storeFilter) return false;
        }

        // Apply payment method filter - expense vouchers use 'account' field
        if (paymentMethodFilter !== "all") {
          const matches = voucher.account === paymentMethodFilter;
          console.log(
            `🔍 Filtering expense voucher ${voucher.voucherNumber}:`,
            {
              voucherAccount: voucher.account,
              filterValue: paymentMethodFilter,
              matches: matches,
            },
          );
          return matches;
        }
        return true;
      })
      .forEach((voucher) => {
        // Validate date before adding to transactions
        const voucherDate = voucher.date ? new Date(voucher.date) : new Date();
        const isValidDate = !isNaN(voucherDate.getTime());

        if (isValidDate) {
          transactions.push({
            id: voucher.voucherNumber, // Use actual voucher number instead of internal ID
            date: voucher.date || new Date().toISOString().split("T")[0],
            description: voucher.category || "other",
            source: voucher.recipient || "Không rõ",
            type: "chi",
            amount: parseFloat(voucher.amount || "0"),
            balance: 0, // Will be calculated later
            voucherType: "expense_voucher",
            internalId: voucher.id, // Keep internal ID for click handling
            completionDate: voucher.updatedAt,
          });
        }
      });

    // Add expense transactions from purchase receipts (chi)
    // Only include receipts with purchaseType = 'expenses' AND isPaid = true
    purchaseReceipts
      .filter((receipt) => {
        // Filter 1: Must be expense type AND paid
        const isExpenseAndPaid = receipt.isPaid === true;
        if (!isExpenseAndPaid) return false;

        // Apply store filter
        if (storeFilter !== "all") {
          if (receipt.storeCode !== storeFilter) return false;
        }

        // Filter 2: Apply payment method filter
        if (paymentMethodFilter !== "all") {
          // Handle null/undefined payment method
          if (!receipt.paymentMethod) {
            return false;
          }

          // Check if payment method is JSON object (single payment)
          if (receipt.paymentMethod.startsWith("{")) {
            try {
              const paymentData = JSON.parse(receipt.paymentMethod);
              return paymentData.method === paymentMethodFilter;
            } catch (e) {
              console.error(
                "Error parsing purchase receipt payment method (object):",
                e,
              );
              return false;
            }
          }

          // Check if payment method is JSON array (multi-payment)
          if (receipt.paymentMethod.startsWith("[")) {
            try {
              const paymentMethods = JSON.parse(receipt.paymentMethod);
              return paymentMethods.some(
                (pm: any) => pm.method === paymentMethodFilter,
              );
            } catch (e) {
              console.error(
                "Error parsing purchase receipt payment method (array):",
                e,
              );
              return false;
            }
          }

          // Single payment method string
          return receipt.paymentMethod === paymentMethodFilter;
        }
        return true;
      })
      .forEach((receipt) => {
        // Validate date before adding to transactions
        const receiptDate =
          receipt.purchaseDate || receipt.createdAt
            ? new Date(receipt.purchaseDate || receipt.createdAt)
            : new Date();
        const isValidDate = !isNaN(receiptDate.getTime());

        if (isValidDate) {
          const supplier = suppliers.find((s) => s.id === receipt.supplierId);

          // Calculate amount based on payment method filter
          let transactionAmount = 0;

          if (paymentMethodFilter === "all") {
            // Show payment_amount when filter is "all"
            transactionAmount = parseFloat(receipt.paymentAmount || "0");
          } else {
            // If filtering by specific payment method
            if (receipt.paymentMethod) {
              // Check if JSON object (single payment)
              if (receipt.paymentMethod.startsWith("{")) {
                try {
                  const paymentData = JSON.parse(receipt.paymentMethod);
                  if (paymentData.method === paymentMethodFilter) {
                    transactionAmount = parseFloat(paymentData.amount || "0");
                  }
                } catch (e) {
                  console.error(
                    "Error parsing payment method for amount (object):",
                    e,
                  );
                }
              }
              // Check if JSON array (multi-payment)
              else if (receipt.paymentMethod.startsWith("[")) {
                try {
                  const paymentMethods = JSON.parse(receipt.paymentMethod);
                  const matchedMethod = paymentMethods.find(
                    (pm: any) => pm.method === paymentMethodFilter,
                  );
                  if (matchedMethod) {
                    transactionAmount = parseFloat(matchedMethod.amount || "0");
                  }
                } catch (e) {
                  console.error(
                    "Error parsing payment method for amount (array):",
                    e,
                  );
                }
              }
              // Single payment method string
              else if (receipt.paymentMethod === paymentMethodFilter) {
                transactionAmount = parseFloat(receipt.paymentAmount || "0");
              }
            }
          }

          // Only add transaction if amount > 0
          if (transactionAmount > 0) {
            transactions.push({
              id: receipt.receiptNumber || `PURCHASE-${receipt.id}`, // Use actual receipt number
              date: receiptDate.toISOString().split("T")[0],
              description: "purchaseTransaction",
              source: supplier?.name || t("common.supplier"),
              type: "chi",
              amount: transactionAmount,
              balance: 0, // Will be calculated later
              voucherType: "purchase_receipt",
              completionDate: receipt.updatedAt,
            });
          }
        }
      });

    // Sort by date
    transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Filter by date range
    const filteredTransactions = transactions.filter((transaction) => {
      const transactionDate = transaction.date;
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Calculate opening balance (balance before start date)
    const openingBalance = transactions
      .filter((transaction) => transaction.date < startDate)
      .reduce((balance, transaction) => {
        return transaction.type === "thu"
          ? balance + transaction.amount
          : balance - transaction.amount;
      }, 0);

    // Calculate running balance for filtered transactions
    let runningBalance = openingBalance;
    const transactionsWithBalance = filteredTransactions.map((transaction) => {
      runningBalance =
        transaction.type === "thu"
          ? runningBalance + transaction.amount
          : runningBalance - transaction.amount;

      return {
        ...transaction,
        balance: runningBalance,
      };
    });

    // Calculate totals
    const totalIncome = filteredTransactions
      .filter((t) => t.type === "thu")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
      .filter((t) => t.type === "chi")
      .reduce((sum, t) => sum + t.amount, 0);

    const endingBalance = openingBalance + totalIncome - totalExpense;

    return {
      openingBalance,
      totalIncome,
      totalExpense,
      endingBalance,
      transactions: transactionsWithBalance,
    };
  }, [
    orders,
    purchaseReceipts,
    incomeVouchers,
    expenseVouchers,
    suppliers,
    startDate,
    endDate,
    paymentMethodFilter,
    storeFilter,
  ]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter transactions by type and recalculate summaries
  const filteredData = useMemo(() => {
    let filtered = cashBookData.transactions;

    // Filter by transaction type
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Filter by voucher type
    if (voucherTypeFilter !== "all") {
      filtered = filtered.filter((t) => t.voucherType === voucherTypeFilter);
    }

    // Filter by voucher number
    if (voucherNumberFilter.trim() !== "") {
      filtered = filtered.filter((t) =>
        t.id.toLowerCase().includes(voucherNumberFilter.toLowerCase().trim()),
      );
    }

    // Filter by store
    if (storeFilter !== "all") {
      filtered = filtered.filter((t) => {
        // For orders (sales_order type), check storeCode
        if (t.voucherType === "sales_order") {
          const order = orders.find(
            (o: any) =>
              o.orderNumber === t.id ||
              o.id === parseInt(t.id.replace(/[^0-9]/g, "") || "0"),
          );
          return order?.storeCode === storeFilter;
        }
        // For purchase receipts, check storeCode
        if (t.voucherType === "purchase_receipt") {
          const receipt = purchaseReceipts.find(
            (pr: any) =>
              pr.receiptNumber === t.id ||
              pr.id === parseInt(t.id.replace(/[^0-9]/g, "") || "0"),
          );
          return receipt?.storeCode === storeFilter;
        }
        // For vouchers, we might need to add storeCode field in the future
        // For now, include all vouchers if store filter is active
        return true;
      });
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortField as keyof CashTransaction];
        let bValue: any = b[sortField as keyof CashTransaction];

        // Handle date sorting
        if (sortField === "date") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // Handle completionDate sorting
        if (sortField === "completionDate") {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        // Handle numeric sorting
        if (sortField === "amount" || sortField === "balance") {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }

        // Handle string sorting
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Recalculate summaries based on ALL FILTERED transactions (not just selected)
    const totalIncome = filtered
      .filter((t) => t.type === "thu")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filtered
      .filter((t) => t.type === "chi")
      .reduce((sum, t) => sum + t.amount, 0);

    const endingBalance =
      cashBookData.openingBalance + totalIncome - totalExpense;

    console.log("💰 Filtered Data Summary:", {
      totalTransactions: filtered.length,
      totalIncome,
      totalExpense,
      endingBalance,
    });

    return {
      transactions: filtered,
      totalIncome,
      totalExpense,
      endingBalance,
    };
  }, [
    cashBookData.transactions,
    cashBookData.openingBalance,
    filterType,
    voucherTypeFilter,
    voucherNumberFilter,
    storeFilter,
    orders,
    purchaseReceipts,
    sortField,
    sortOrder,
    selectedRows,
  ]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.transactions.slice(startIndex, endIndex);
  }, [filteredData.transactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.transactions.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterType,
    voucherTypeFilter,
    voucherNumberFilter,
    storeFilter,
    startDate,
    endDate,
    paymentMethodFilter,
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Handle clicking on transaction rows
  const handleTransactionClick = (transaction: CashTransaction) => {
    if (
      transaction.voucherType === "income_voucher" &&
      transaction.internalId
    ) {
      // Find the income voucher using internal ID
      const voucher = incomeVouchers.find(
        (v) => v.id.toString() === transaction.internalId.toString(),
      );
      if (voucher) {
        setSelectedVoucher(voucher);
        setVoucherMode("edit");
        setShowIncomeVoucherModal(true);
      }
    } else if (
      transaction.voucherType === "expense_voucher" &&
      transaction.internalId
    ) {
      // Find the expense voucher using internal ID
      const voucher = expenseVouchers.find(
        (v) => v.id.toString() === transaction.internalId.toString(),
      );
      if (voucher) {
        setSelectedVoucher(voucher);
        setVoucherMode("edit");
        setShowExpenseVoucherModal(true);
      }
    }
  };

  // Handle checkbox selection
  const handleRowSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    transactionId: string,
  ) => {
    const isChecked = event.target.checked;
    setSelectedRows((prev) => {
      const newSelectedRows = new Set(prev);
      if (isChecked) {
        newSelectedRows.add(transactionId);
      } else {
        newSelectedRows.delete(transactionId);
      }
      return newSelectedRows;
    });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setSelectAll(isChecked);
    setSelectedRows((prev) => {
      const newSelectedRows = new Set<string>();
      if (isChecked) {
        filteredData.transactions.forEach((transaction) => {
          newSelectedRows.add(transaction.id);
        });
      }
      return newSelectedRows;
    });
  };

  // Update selectAll state if all rows are manually selected/deselected
  useEffect(() => {
    if (
      filteredData.transactions.length > 0 &&
      selectedRows.size === filteredData.transactions.length
    ) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedRows, filteredData.transactions]);

  // Handle closing modals
  const handleCloseIncomeModal = () => {
    setShowIncomeVoucherModal(false);
    setSelectedVoucher(null);
    setVoucherMode("create");
  };

  const handleCloseExpenseModal = () => {
    setShowExpenseVoucherModal(false);
    setSelectedVoucher(null);
    setVoucherMode("create");
  };

  return (
    <div className="min-h-screen bg-green-50 grocery-bg">
      <POSHeader />
      <RightSidebar />
      <div className="px-6">
        <div className="max-w-7xl mx-auto py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-green-600" />
              {t("common.cashManagement")}
            </h1>
            <p className="text-gray-600 mt-2">
              {t("common.cashManagementDescription")}
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8 border-green-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Filter Type */}
                <div className="md:col-span-2 lg:col-span-3">
                  <Label className="text-sm font-bold text-gray-800 mb-3 block">
                    {t("common.transactionTypeFilter")}
                  </Label>
                  <RadioGroup
                    value={filterType}
                    onValueChange={setFilterType}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="cursor-pointer">
                        {t("common.allTransactions")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="thu" id="thu" />
                      <Label htmlFor="thu" className="cursor-pointer">
                        {t("common.incomeFilter")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chi" id="chi" />
                      <Label htmlFor="chi" className="cursor-pointer">
                        {t("common.expenseFilter")}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Store Filter */}
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-3 block">
                    {t("common.storeLabel")}
                  </Label>
                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.storeLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {storesData.filter((store: any) => store.typeUser !== 1)
                        .length > 1 && (
                        <SelectItem value="all">
                          {t("common.allStores")}
                        </SelectItem>
                      )}
                      {storesData
                        .filter((store: any) => store.typeUser !== 1)
                        .map((store: any) => (
                          <SelectItem key={store.id} value={store.storeCode}>
                            {store.storeName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-3 block">
                    {t("common.fundType")}
                  </Label>
                  <Select
                    value={paymentMethodFilter}
                    onValueChange={setPaymentMethodFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.fundType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("common.allFunds")}
                      </SelectItem>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.nameKey}>
                          {t(`common.${method.nameKey}`)} {method.icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Voucher Type Filter */}
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-3 block">
                    {t("common.voucherTypeFilter")}
                  </Label>
                  <Select
                    value={voucherTypeFilter}
                    onValueChange={setVoucherTypeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("common.voucherTypeFilter")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("common.allVouchers")}
                      </SelectItem>
                      <SelectItem value="income_voucher">
                        {t("common.incomeVoucher")}
                      </SelectItem>
                      <SelectItem value="expense_voucher">
                        {t("common.expenseVoucher")}
                      </SelectItem>
                      <SelectItem value="purchase_receipt">
                        {t("common.purchaseReceipt")}
                      </SelectItem>
                      <SelectItem value="sales_order">
                        {t("common.salesOrder")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Voucher Number Filter */}
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-3 block">
                    {t("common.voucherCode")}
                  </Label>
                  <Input
                    type="text"
                    value={voucherNumberFilter}
                    onChange={(e) => setVoucherNumberFilter(e.target.value)}
                    placeholder={t("common.voucherCode")}
                  />
                </div>

                {/* Start Date */}
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-3 block">
                    {t("common.fromDate")}
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-3 block">
                    {t("common.toDate")}
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t("common.openingBalance")}
                </CardTitle>
                <Wallet className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(cashBookData.openingBalance)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t("common.totalIncome")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(filteredData.totalIncome)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t("common.totalExpense")}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -{formatCurrency(filteredData.totalExpense)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t("common.closingBalance")}
                </CardTitle>
                <Wallet className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(filteredData.endingBalance)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mb-6">
            <Button
              onClick={() => {
                // Prepare export data
                const exportData = filteredData.transactions.map(
                  (transaction) => {
                    // Get updatedAt for completion date
                    let updatedAt = null;
                    let paymentMethodName = "";
                    
                    if (transaction.voucherType === "sales_order") {
                      const order = orders.find(
                        (o: any) =>
                          o.orderNumber === transaction.id ||
                          `ORDER-${o.id}` === transaction.id ||
                          `ORD-${o.id}` === transaction.id,
                      );
                      updatedAt = order?.updatedAt;
                      
                      // Get payment method for sales order
                      if (order?.paymentMethod) {
                        const method = paymentMethods.find(
                          (pm: any) => pm.nameKey === order.paymentMethod
                        );
                        paymentMethodName = method ? t(`common.${method.nameKey}`) : order.paymentMethod;
                      }
                    } else if (transaction.voucherType === "purchase_receipt") {
                      const receipt = purchaseReceipts.find(
                        (pr: any) =>
                          pr.receiptNumber === transaction.id ||
                          `PURCHASE-${pr.id}` === transaction.id,
                      );
                      updatedAt = receipt?.updatedAt;
                      
                      // Get payment method for purchase receipt
                      if (receipt?.paymentMethod) {
                        try {
                          const paymentData = JSON.parse(receipt.paymentMethod);
                          if (paymentData.method) {
                            const method = paymentMethods.find(
                              (pm: any) => pm.nameKey === paymentData.method
                            );
                            paymentMethodName = method ? t(`common.${method.nameKey}`) : paymentData.method;
                          }
                        } catch (e) {
                          paymentMethodName = receipt.paymentMethod;
                        }
                      }
                    } else if (transaction.voucherType === "income_voucher") {
                      const voucher = incomeVouchers.find(
                        (v: any) => v.voucherNumber === transaction.id,
                      );
                      updatedAt = voucher?.updatedAt;
                      
                      // Get payment method for income voucher
                      if (voucher?.account) {
                        const method = paymentMethods.find(
                          (pm: any) => pm.nameKey === voucher.account
                        );
                        paymentMethodName = method ? t(`common.${method.nameKey}`) : voucher.account;
                      }
                    } else if (transaction.voucherType === "expense_voucher") {
                      const voucher = expenseVouchers.find(
                        (v: any) => v.voucherNumber === transaction.id,
                      );
                      updatedAt = voucher?.updatedAt;
                      
                      // Get payment method for expense voucher
                      if (voucher?.account) {
                        const method = paymentMethods.find(
                          (pm: any) => pm.nameKey === voucher.account
                        );
                        paymentMethodName = method ? t(`common.${method.nameKey}`) : voucher.account;
                      }
                    }

                    const completionDate = updatedAt
                      ? `${new Date(updatedAt).toLocaleDateString("vi-VN")} ${new Date(updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}`
                      : "-";

                    return {
                      "Mã phiếu": transaction.id,
                      "Thời gian": formatDate(transaction.date),
                      "Ngày hoàn thành": completionDate,
                      "Loại thu chi": transaction.description,
                      "Người nộp/nhận": transaction.source,
                      "Phương thức thanh toán": paymentMethodName,
                      Thu: transaction.type === "thu" ? transaction.amount : 0,
                      Chi: transaction.type === "chi" ? transaction.amount : 0,
                      "Tồn quỹ": transaction.balance,
                    };
                  },
                );

                // Create summary data
                const summaryData = [
                  ["BÁO CÁO SỔ QUỸ TIỀN MẶT", "", "", "", "", "", "", "", ""],
                  [
                    `Từ ngày: ${formatDate(startDate)}`,
                    `Đến ngày: ${formatDate(endDate)}`,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                  ],
                  ["", "", "", "", "", "", "", "", ""],
                  ["TỔNG KẾT:", "", "", "", "", "", "", "", ""],
                  [
                    "Quỹ đầu kỳ:",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    cashBookData.openingBalance,
                  ],
                  [
                    "Tổng thu:",
                    "",
                    "",
                    "",
                    "",
                    "",
                    filteredData.totalIncome,
                    "",
                    "",
                  ],
                  [
                    "Tổng chi:",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    filteredData.totalExpense,
                    "",
                  ],
                  [
                    "Tồn quỹ:",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    filteredData.endingBalance,
                  ],
                  ["", "", "", "", "", "", "", "", ""],
                  ["CHI TIẾT GIAO DỊCH:", "", "", "", "", "", "", "", ""],
                  ["", "", "", "", "", "", "", "", ""],
                ];

                // Create worksheet
                const ws = XLSX.utils.aoa_to_sheet(summaryData);

                // Add transaction data
                XLSX.utils.sheet_add_json(ws, exportData, {
                  origin: `A${summaryData.length + 1}`,
                  skipHeader: false,
                });

                // Set column widths
                const colWidths = [
                  { wch: 25 }, // Mã phiếu
                  { wch: 15 }, // Thời gian
                  { wch: 20 }, // Ngày hoàn thành
                  { wch: 30 }, // Loại thu chi
                  { wch: 25 }, // Người nộp/nhận
                  { wch: 20 }, // Phương thức thanh toán
                  { wch: 15 }, // Thu
                  { wch: 15 }, // Chi
                  { wch: 15 }, // Tồn quỹ
                ];
                ws["!cols"] = colWidths;

                // Style the worksheet
                const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

                // Style header rows
                for (let row = 0; row < 3; row++) {
                  for (let col = 0; col <= 8; col++) {
                    const cellAddress = XLSX.utils.encode_cell({
                      r: row,
                      c: col,
                    });
                    if (ws[cellAddress]) {
                      ws[cellAddress].s = {
                        font: {
                          bold: row === 0,
                          name: "Times New Roman",
                          sz: row === 0 ? 14 : 11,
                          color: { rgb: "000000" },
                        },
                        alignment: { horizontal: "center", vertical: "center" },
                      };
                    }
                  }
                }

                // Style summary section
                for (let row = 3; row < 9; row++) {
                  for (let col = 0; col <= 8; col++) {
                    const cellAddress = XLSX.utils.encode_cell({
                      r: row,
                      c: col,
                    });
                    if (ws[cellAddress]) {
                      ws[cellAddress].s = {
                        font: {
                          bold: true,
                          name: "Times New Roman",
                          sz: 11,
                          color: { rgb: "000000" },
                        },
                        fill: {
                          patternType: "solid",
                          fgColor: { rgb: "E8F5E8" },
                        },
                        alignment: { horizontal: "left", vertical: "center" },
                      };
                    }
                  }
                }

                // Style transaction header
                const headerRow = summaryData.length;
                for (let col = 0; col <= 8; col++) {
                  const cellAddress = XLSX.utils.encode_cell({
                    r: headerRow,
                    c: col,
                  });
                  if (ws[cellAddress]) {
                    ws[cellAddress].s = {
                      font: {
                        bold: true,
                        name: "Times New Roman",
                        sz: 11,
                        color: { rgb: "FFFFFF" },
                      },
                      fill: {
                        patternType: "solid",
                        fgColor: { rgb: "059669" },
                      },
                      alignment: { horizontal: "center", vertical: "center" },
                      border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } },
                      },
                    };
                  }
                }

                // Style transaction data rows
                for (let row = headerRow + 1; row <= range.e.r; row++) {
                  const isEven = (row - headerRow - 1) % 2 === 0;
                  const bgColor = isEven ? "FFFFFF" : "F8F9FA";

                  for (let col = 0; col <= 8; col++) {
                    const cellAddress = XLSX.utils.encode_cell({
                      r: row,
                      c: col,
                    });
                    if (ws[cellAddress]) {
                      const isCurrency = [6, 7, 8].includes(col);
                      ws[cellAddress].s = {
                        font: {
                          name: "Times New Roman",
                          sz: 10,
                          color: { rgb: "000000" },
                        },
                        fill: {
                          patternType: "solid",
                          fgColor: { rgb: bgColor },
                        },
                        alignment: {
                          horizontal: isCurrency ? "right" : "left",
                          vertical: "center",
                        },
                        border: {
                          top: { style: "thin", color: { rgb: "CCCCCC" } },
                          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                          left: { style: "thin", color: { rgb: "CCCCCC" } },
                          right: { style: "thin", color: { rgb: "CCCCCC" } },
                        },
                      };
                      
                      // Apply number format to currency columns
                      if (isCurrency && ws[cellAddress].v !== undefined) {
                        ws[cellAddress].z = "#,##0";
                      }
                    }
                  }
                }

                // Create workbook and save
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Sổ quỹ tiền mặt");

                // Set workbook properties
                wb.Props = {
                  Title: "Báo cáo sổ quỹ tiền mặt",
                  Subject: "Chi tiết thu chi tiền mặt",
                  Author: "EDPOS System",
                  CreatedDate: new Date(),
                };

                // Generate filename with timestamp
                const timestamp = new Date()
                  .toISOString()
                  .slice(0, 19)
                  .replace(/:/g, "-");
                const filename = `so-quy-tien-mat_${formatDate(startDate).replace(/\//g, "-")}_${formatDate(endDate).replace(/\//g, "-")}_${timestamp}.xlsx`;

                // Save file
                try {
                  XLSX.writeFile(wb, filename, {
                    bookType: "xlsx",
                    cellStyles: true,
                    sheetStubs: false,
                    compression: true,
                  });
                  console.log("✅ Excel file exported successfully:", filename);
                } catch (error) {
                  console.error("❌ Error exporting Excel file:", error);
                  // Fallback export without styling
                  XLSX.writeFile(wb, filename, { bookType: "xlsx" });
                }
              }}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("common.exportExcel")}
            </Button>
          </div>

          {/* Transactions Table */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("common.transactionDetails")}
              </CardTitle>
              {selectedRows.size > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Đã chọn: <span className="font-semibold text-green-600">{selectedRows.size}</span> giao dịch
                </p>
              )}
            </CardHeader>
            <CardContent>
              {filteredData.transactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {t("common.noTransactionsInPeriod")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px] font-bold whitespace-nowrap">
                            <Input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                              className="w-4 h-4"
                            />
                          </TableHead>
                          <TableHead
                            className="w-[110px] font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("id")}
                          >
                            <div className="flex items-center gap-1">
                              {t("common.voucherCode")}
                              {sortField === "id" && (
                                <span className="text-blue-600">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[95px] font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("date")}
                          >
                            <div className="flex items-center gap-1">
                              {t("common.transactionDate")}
                              {sortField === "date" && (
                                <span className="text-blue-600">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[95px] font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("completionDate")}
                          >
                            <div className="flex items-center gap-1">
                              {t("common.dateTime")}
                              {sortField === "completionDate" && (
                                <span className="text-blue-600">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[120px] font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("description")}
                          >
                            <div className="flex items-center gap-1">
                              {t("common.transactionType")}
                              {sortField === "description" && (
                                <span className="text-blue-600">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="w-[150px] max-w-[150px] font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("source")}
                          >
                            <div className="flex items-center gap-1">
                              {t("common.payerReceiver")}
                              {sortField === "source" && (
                                <span className="text-blue-600">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-right w-[110px] font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("amount")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {t("common.income")}
                              {sortField === "amount" && sortOrder && (
                                <span className="text-blue-600">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-right w-[110px] font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("amount")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {t("common.expense")}
                              {sortField === "amount" && sortOrder && (
                                <span className="text-blue-600">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-right w-[120px] font-bold whitespace-nowrap cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("balance")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {t("common.balance")}
                              {sortField === "balance" && (
                                <span className="text-blue-600">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((transaction) => (
                          <TableRow
                            key={transaction.id}
                            className={
                              transaction.voucherType === "income_voucher" ||
                              transaction.voucherType === "expense_voucher"
                                ? "cursor-pointer hover:bg-gray-50"
                                : ""
                            }
                            onClick={() => handleTransactionClick(transaction)}
                          >
                            <TableCell
                              className="w-[40px] p-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Input
                                type="checkbox"
                                checked={selectedRows.has(transaction.id)}
                                onChange={(e) =>
                                  handleRowSelect(e, transaction.id)
                                }
                                className="w-4 h-4"
                              />
                            </TableCell>
                            <TableCell className="font-medium w-[110px] max-w-[110px] p-2">
                              <button
                                onClick={() => {
                                  // Navigate to sales orders with order filter for sales_order type
                                  if (
                                    transaction.voucherType === "sales_order"
                                  ) {
                                    const orderNumber = transaction.id;
                                    window.location.href = `/sales-orders?order=${orderNumber}`;
                                  }
                                  // For other voucher types, the existing click handler will work
                                }}
                                className={`truncate text-xs text-left w-full ${
                                  transaction.voucherType === "sales_order"
                                    ? "text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                    : "text-gray-900"
                                }`}
                                title={transaction.id}
                              >
                                {transaction.id}
                              </button>
                            </TableCell>
                            <TableCell className="w-[95px] max-w-[95px] p-2">
                              {(() => {
                                // Find the corresponding order/voucher to get orderedAt date
                                let creationDate = transaction.date; // Default to transaction date

                                if (transaction.voucherType === "sales_order") {
                                  const order = orders.find(
                                    (o: any) =>
                                      o.orderNumber === transaction.id ||
                                      `ORDER-${o.id}` === transaction.id ||
                                      `ORD-${o.id}` === transaction.id,
                                  );
                                  // Always use orderedAt (ngày đặt hàng/ngày tạo đơn)
                                  creationDate =
                                    order?.orderedAt ||
                                    order?.createdAt ||
                                    transaction.date;
                                } else if (
                                  transaction.voucherType === "purchase_receipt"
                                ) {
                                  const receipt = purchaseReceipts.find(
                                    (pr: any) =>
                                      pr.receiptNumber === transaction.id ||
                                      `PURCHASE-${pr.id}` === transaction.id,
                                  );
                                  // Use purchaseDate or createdAt for creation date
                                  creationDate =
                                    receipt?.purchaseDate ||
                                    receipt?.createdAt ||
                                    transaction.date;
                                } else if (
                                  transaction.voucherType === "income_voucher"
                                ) {
                                  const voucher = incomeVouchers.find(
                                    (v: any) =>
                                      v.voucherNumber === transaction.id,
                                  );
                                  // Use date field for vouchers
                                  creationDate =
                                    voucher?.date || transaction.date;
                                } else if (
                                  transaction.voucherType === "expense_voucher"
                                ) {
                                  const voucher = expenseVouchers.find(
                                    (v: any) =>
                                      v.voucherNumber === transaction.id,
                                  );
                                  // Use date field for vouchers
                                  creationDate =
                                    voucher?.date || transaction.date;
                                }

                                return (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                    <span className="text-xs">
                                      {formatDate(creationDate)}
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell
                              className="w-[95px] max-w-[95px] p-2 cursor-pointer"
                              onClick={() =>
                                handleTransactionClick(transaction)
                              }
                            >
                              {(() => {
                                // Find the corresponding order/voucher to get updatedAt
                                let updatedAt = null;

                                if (transaction.voucherType === "sales_order") {
                                  const order = orders.find(
                                    (o: any) =>
                                      o.orderNumber === transaction.id ||
                                      `ORDER-${o.id}` === transaction.id ||
                                      `ORD-${o.id}` === transaction.id,
                                  );
                                  // ST-002 = true: Show orderedAt in completion column
                                  // ST-002 = false: Show updatedAt in completion column
                                  updatedAt = useCreatedAtFilter
                                    ? order?.orderedAt
                                    : order?.updatedAt;
                                } else if (
                                  transaction.voucherType === "purchase_receipt"
                                ) {
                                  const receipt = purchaseReceipts.find(
                                    (pr: any) =>
                                      pr.receiptNumber === transaction.id ||
                                      `PURCHASE-${pr.id}` === transaction.id,
                                  );
                                  updatedAt = receipt?.updatedAt;
                                } else if (
                                  transaction.voucherType === "income_voucher"
                                ) {
                                  const voucher = incomeVouchers.find(
                                    (v: any) =>
                                      v.voucherNumber === transaction.id,
                                  );
                                  updatedAt = voucher?.updatedAt;
                                } else if (
                                  transaction.voucherType === "expense_voucher"
                                ) {
                                  const voucher = expenseVouchers.find(
                                    (v: any) =>
                                      v.voucherNumber === transaction.id,
                                  );
                                  updatedAt = voucher?.updatedAt;
                                }

                                if (updatedAt) {
                                  const date = new Date(updatedAt);
                                  return (
                                    <div className="text-xs">
                                      <div>
                                        {date.toLocaleDateString("vi-VN")}
                                      </div>
                                      <div className="text-[10px] text-gray-500">
                                        {date.toLocaleTimeString("vi-VN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                          hour12: false,
                                        })}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="text-gray-400 text-xs">
                                    -
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell
                              className="w-[120px] max-w-[120px] p-2 cursor-pointer"
                              onClick={() =>
                                handleTransactionClick(transaction)
                              }
                            >
                              <div className="flex items-center gap-1">
                                {transaction.type === "thu" ? (
                                  <>
                                    <Plus className="w-3 h-3 text-green-500 flex-shrink-0" />
                                    <Badge className="bg-green-100 text-green-800 text-[10px] truncate max-w-[90px]">
                                      {t(
                                        `common.incomeCategories.${transaction.description}`,
                                      )}
                                    </Badge>
                                  </>
                                ) : (
                                  <>
                                    <Minus className="w-3 h-3 text-red-500 flex-shrink-0" />
                                    <Badge className="bg-red-100 text-red-800 text-[10px] truncate max-w-[90px]">
                                      {t(`common.${transaction.description}`)}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell
                              className="w-[150px] max-w-[150px] p-2 cursor-pointer"
                              onClick={() =>
                                handleTransactionClick(transaction)
                              }
                            >
                              <div
                                className="truncate overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                                title={transaction.source}
                              >
                                {transaction.source}
                              </div>
                            </TableCell>
                            <TableCell className="text-right w-[110px] max-w-[110px] p-2">
                              {transaction.type === "thu" ? (
                                <span className="text-green-600 font-medium text-xs whitespace-nowrap">
                                  {formatCurrency(transaction.amount)}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right w-[110px] max-w-[110px] p-2">
                              {transaction.type === "chi" ? (
                                <span className="text-red-600 font-medium text-xs whitespace-nowrap">
                                  {formatCurrency(transaction.amount)}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium w-[120px] max-w-[120px] p-2">
                              <span className="text-xs text-blue-600 whitespace-nowrap">
                                {formatCurrency(transaction.balance)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {filteredData.transactions.length > 0 && (
            <>
              {/* Pagination Controls */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">{t("common.show")}</Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-sm">{t("common.rows")}</Label>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {t("common.page")} {currentPage} / {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8"
                    >
                      «
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="h-8 w-8"
                    >
                      ‹
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="h-8 w-8"
                    >
                      ›
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8"
                    >
                      »
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Summary Footer */}
          <div className="mt-4 bg-blue-50 border-t-2 border-blue-200 font-bold rounded-lg p-4">
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex flex-col items-center gap-1">
                <span>
                  {t("common.total")} {t("common.income")}
                </span>
                <span className="text-green-600 text-lg">
                  {formatCurrency(
                    filteredData.transactions
                      .filter((t) => selectedRows.has(t.id) && t.type === "thu")
                      .reduce((sum, t) => sum + t.amount, 0),
                  )}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span>
                  {t("common.total")} {t("common.expense")}
                </span>
                <span className="text-red-600 text-lg">
                  -
                  {formatCurrency(
                    filteredData.transactions
                      .filter((t) => selectedRows.has(t.id) && t.type === "chi")
                      .reduce((sum, t) => sum + t.amount, 0),
                  )}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="hidden">{t("common.closingBalance")}</span>
                <span className="text-blue-600 text-lg hidden">
                  {formatCurrency(
                    cashBookData.openingBalance +
                      filteredData.transactions
                        .filter(
                          (t) => selectedRows.has(t.id) && t.type === "thu",
                        )
                        .reduce((sum, t) => sum + t.amount, 0) -
                      filteredData.transactions
                        .filter(
                          (t) => selectedRows.has(t.id) && t.type === "chi",
                        )
                        .reduce((sum, t) => sum + t.amount, 0),
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income Voucher Modal */}
      <IncomeVoucherModal
        isOpen={showIncomeVoucherModal}
        onClose={handleCloseIncomeModal}
        voucher={selectedVoucher}
        mode={voucherMode}
      />

      {/* Expense Voucher Modal */}
      <ExpenseVoucherModal
        isOpen={showExpenseVoucherModal}
        onClose={handleCloseExpenseModal}
        voucher={selectedVoucher}
        mode={voucherMode}
      />
    </div>
  );
}
