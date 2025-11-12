import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ScanBarcode,
  Users,
  Home,
  Clock,
  Utensils,
  BarChart3,
  ChevronDown,
  Package,
  Settings as SettingsIcon,
  Building2,
  ClipboardCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logoPath from "@assets/EDPOS_1753091767028.png";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  type StoreSettings,
  type Employee,
  type AttendanceRecord,
} from "@shared/schema";
import { PieChart } from "lucide-react";
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Calendar,
  TrendingUp,
  DollarSign,
  FileText as ReportsIcon,
  ShoppingCart as CartIcon,
  FileText,
  ShoppingCart,
  Package2,
  UserCheck,
  Truck,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ProductManagerModal } from "./product-manager-modal";
import { PrinterConfigModal } from "./printer-config-modal";
import { InvoiceManagementModal } from "./invoice-management-modal";
import { UserProfileModal } from "./user-profile-modal";

interface POSHeaderProps {
  onLogout?: () => void;
}

export function POSHeader({ onLogout }: POSHeaderProps) {
  const { t } = useTranslation();
  const [posMenuOpen, setPosMenuOpen] = useState(false);
  const [reportsSubmenuOpen, setReportsSubmenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location] = useLocation();
  const [submenuTimer, setSubmenuTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showProductManager, setShowProductManager] = useState(false);
  const [showInvoiceManagement, setShowInvoiceManagement] = useState(false);
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fetch store settings
  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ["https://laundry-be-admin-demo.onrender.com/api/store-settings"],
  });

  // Fetch employees
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["https://laundry-be-admin-demo.onrender.com/api/employees"],
  });

  // Fetch today's attendance records
  const todayDate = new Date().toISOString().split("T")[0];
  const { data: todayAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ["https://laundry-be-admin-demo.onrender.com/api/attendance", todayDate],
    queryFn: async () => {
      const response = await fetch(`https://laundry-be-admin-demo.onrender.com/api/attendance?date=${todayDate}`);
      if (!response.ok) {
        throw new Error("Failed to fetch attendance records");
      }
      return response.json();
    },
  });

  // Find current working cashier
  const getCurrentCashier = () => {
    if (!employees || !todayAttendance) return null;

    // Get cashiers who are currently clocked in (have clock in but no clock out)
    const workingCashiers = todayAttendance
      .filter((record) => record.clockIn && !record.clockOut)
      .map((record) => {
        const employee = employees.find((emp) => emp.id === record.employeeId);
        return employee && employee.role === "cashier" ? employee : null;
      })
      .filter(Boolean);

    return workingCashiers.length > 0 ? workingCashiers[0] : null;
  };

  const currentCashier = getCurrentCashier();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle submenu timing
  const handleReportsMouseEnter = () => {
    if (submenuTimer) {
      clearTimeout(submenuTimer);
      setSubmenuTimer(null);
    }
    setReportsSubmenuOpen(true);
    setActiveDropdown("reports");
  };

  const handleReportsMouseLeave = () => {
    // Don't set timer here, let the container handle it
  };

  const handleSubmenuMouseEnter = () => {
    if (submenuTimer) {
      clearTimeout(submenuTimer);
      setSubmenuTimer(null);
    }
  };

  const handleSubmenuMouseLeave = () => {
    // Don't set timer here, let the container handle it
  };

  const handleReportsContainerMouseLeave = () => {
    const timer = setTimeout(() => {
      setReportsSubmenuOpen(false);
      setActiveDropdown(null);
    }, 300);
    setSubmenuTimer(timer);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".pos-dropdown")) {
        setPosMenuOpen(false);
        setReportsSubmenuOpen(false);
        setActiveDropdown(null);
        setUserMenuOpen(false);
      }
    };

    if (posMenuOpen || reportsSubmenuOpen || userMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [posMenuOpen, reportsSubmenuOpen, userMenuOpen]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (submenuTimer) {
        clearTimeout(submenuTimer);
      }
    };
  }, [submenuTimer]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleLogout = async () => {
    try {
      // Gọi API logout để xóa session phía server
      await fetch("https://laundry-be-admin-demo.onrender.com/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout API error:", error);
    }

    // Xóa tất cả thông tin đăng nhập
    sessionStorage.removeItem("pinAuthenticated");
    localStorage.removeItem("authToken");
    localStorage.removeItem("storeInfo");

    // Xóa tất cả cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Xóa cache của browser (nếu có API hỗ trợ)
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Gọi callback onLogout nếu có
    if (onLogout) {
      onLogout();
    }

    // Chuyển về trang login và reload để xóa state
    window.location.href = "/";
    window.location.reload();
  };

  return (
    <header className="bg-background shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <img
              src={logoPath}
              alt="EDPOS Logo"
              className="h-10 cursor-pointer drop-shadow-lg"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(58%) sepia(89%) saturate(491%) hue-rotate(91deg) brightness(95%) contrast(88%)",
              }}
              onClick={() => (window.location.href = "/")}
            />
          </div>
          <div className="flex flex-col">
            <div className="font-bold text-[16px] text-green-600">
              <span className="font-extrabold">M</span>anagement
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <LanguageSwitcher />
          {/* Navigation Menu */}
          <nav className="flex items-center space-x-2">
            {/* User Menu Dropdown */}
            <div className="relative pos-dropdown">
              <button
                className="flex items-center px-3 py-1.5 rounded-full hover:bg-green-50 transition-all duration-200 text-sm text-gray-700"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <User className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">
                  {currentCashier
                    ? currentCashier.name
                    : storeSettings?.storeName ||
                      storeSettings?.userName ||
                      storeSettings?.storeCode ||
                      "Admin"}
                </span>
                <ChevronDown
                  className={`w-3 h-3 ml-1 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-48 z-50">
                  <button
                    className="w-full flex items-center px-4 py-2 text-left hover:bg-red-50 hover:text-red-600 text-gray-700 transition-colors"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {showUserProfile && (
        <UserProfileModal
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
        />
      )}
      {showProductManager && (
        <ProductManagerModal
          isOpen={showProductManager}
          onClose={() => setShowProductManager(false)}
        />
      )}
      {showInvoiceManagement && (
        <InvoiceManagementModal
          isOpen={showInvoiceManagement}
          onClose={() => setShowInvoiceManagement(false)}
        />
      )}
      {showPrinterConfig && (
        <PrinterConfigModal
          isOpen={showPrinterConfig}
          onClose={() => setShowPrinterConfig(false)}
        />
      )}
    </header>
  );
}
