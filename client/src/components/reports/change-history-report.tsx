import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export function ChangeHistoryReport() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [orderNumberFilter, setOrderNumberFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Fetch stores list
  const { data: storesData = [] } = useQuery({
    queryKey: ["https://laundry-be-admin-demo.onrender.com/api/store-settings/list"],
    queryFn: async () => {
      try {
        const response = await fetch("https://laundry-be-admin-demo.onrender.com/api/store-settings/list");
        if (!response.ok) throw new Error("Failed to fetch stores");
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

  // Fetch change history
  const {
    data: changeHistory = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["https://laundry-be-admin-demo.onrender.com/api/order-change-history", startDate, endDate, storeFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        // Always append storeCode parameter, let backend handle "all" case
        if (storeFilter) {
          params.append("storeCode", storeFilter);
        }

        console.log("📋 Fetching change history with params:", {
          startDate,
          endDate,
          storeFilter,
          url: `https://laundry-be-admin-demo.onrender.com/api/order-change-history?${params}`,
        });

        const response = await fetch(`https://laundry-be-admin-demo.onrender.com/api/order-change-history?${params}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch change history:", {
            status: response.status,
            statusText: response.statusText,
            errorText,
          });
          throw new Error(`Failed to fetch change history: ${response.status}`);
        }
        const data = await response.json();

        console.log("✅ Change history fetched:", {
          total: data.length,
          firstRecord: data[0],
        });

        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("❌ Error fetching change history:", error);
        throw error; // Re-throw to trigger error state
      }
    },
    enabled: storesData.length > 0, // Only fetch when stores data is loaded
    retry: 1,
    retryDelay: 1000,
  });

  const filteredHistory = useMemo(() => {
    if (!Array.isArray(changeHistory)) return [];
    
    // Filter by order number if provided
    if (orderNumberFilter.trim()) {
      return changeHistory.filter((item: any) => 
        item.orderNumber?.toLowerCase().includes(orderNumberFilter.toLowerCase())
      );
    }
    
    return changeHistory;
  }, [changeHistory, orderNumberFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [startDate, endDate, storeFilter, orderNumberFilter]);

  console.log("📋 Change History Component State:", {
    isLoading,
    isError,
    error,
    historyCount: changeHistory?.length || 0,
    filteredCount: filteredHistory?.length || 0,
    startDate,
    endDate,
    storeFilter,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">
            Nhật ký thay đổi dữ liệu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label className="text-sm font-medium mb-2 text-gray-700">
                Cửa hàng
              </Label>
              <Select
                value={storeFilter || undefined}
                onValueChange={setStoreFilter}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Chọn cửa hàng" />
                </SelectTrigger>
                <SelectContent>
                  {storesData?.length > 1 && (
                    <SelectItem value="all">Tất cả</SelectItem>
                  )}

                  {storesData
                    ?.filter((store: any) => store?.storeCode) // chỉ lấy store có storeCode hợp lệ
                    .map((store: any) => (
                      <SelectItem
                        key={store.id || store.storeCode}
                        value={store.storeCode}
                      >
                        {store.storeName || "Không rõ tên"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 text-gray-700">
                Mã đơn hàng
              </Label>
              <Input
                type="text"
                placeholder="Tìm theo mã đơn..."
                value={orderNumberFilter}
                onChange={(e) => setOrderNumberFilter(e.target.value)}
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 text-gray-700">
                Từ ngày
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 text-gray-700">
                Đến ngày
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          {/* History Table */}
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-12 text-red-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg font-semibold mb-2">Lỗi tải dữ liệu</p>
                <p className="text-sm text-gray-600">
                  {error instanceof Error ? error.message : "Vui lòng thử lại"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-green-50 to-blue-50 border-b-2 border-green-200">
                    <TableHead className="font-bold text-gray-800 w-[160px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Thời gian
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-800 w-[200px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Cửa hàng
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-800 w-[120px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Hành động
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-800 w-[160px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Mã đơn hàng
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        Mô tả chi tiết
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!paginatedHistory || paginatedHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-12 text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <svg
                            className="w-16 h-16 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="font-medium">Không có dữ liệu thay đổi</p>
                          <p className="text-sm">Thử thay đổi bộ lọc hoặc khoảng thời gian</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedHistory.map((item: any, index: number) => {
                      try {
                        const actionLabel = item.action === "update"
                          ? "Cập nhật"
                          : item.action === "create"
                            ? "Tạo mới"
                            : item.action === "delete"
                              ? "Hủy đơn"
                              : "Cập nhật";
                        
                        const actionColor = item.action === "update"
                          ? "bg-blue-100 text-blue-700"
                          : item.action === "create"
                            ? "bg-green-100 text-green-700"
                            : item.action === "delete"
                              ? "bg-red-100 text-red-700"
                              : "bg-purple-100 text-purple-700";

                        return (
                          <TableRow
                            key={item.id || index}
                            className="hover:bg-blue-50/50 transition-colors border-b border-gray-100"
                          >
                            <TableCell className="text-sm text-gray-700 font-medium">
                              {item.changedAt
                                ? format(
                                    new Date(item.changedAt),
                                    "dd/MM/yyyy HH:mm:ss",
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700">
                              <div className="font-medium">{item.storeName || item.storeCode}</div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${actionColor}`}>
                                {actionLabel}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                                {item.orderNumber || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm max-w-2xl">
                              <div className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                                {item.detailedDescription || "-"}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      } catch (renderError) {
                        console.error(
                          "Error rendering history item:",
                          renderError,
                          item,
                        );
                        return null;
                      }
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination and Summary */}
          {!isLoading && !isError && filteredHistory.length > 0 && (
            <div className="mt-6 flex flex-col gap-4 border-t pt-4 bg-gray-50 p-4 rounded-lg">
              {/* Top row: Page size selector and summary */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">Hiển thị</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-700 font-medium">bản ghi</span>
                </div>

                <div className="text-sm text-gray-700 font-medium">
                  Hiển thị{" "}
                  <span className="font-bold text-green-600">
                    {startIndex + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-bold text-green-600">
                    {Math.min(endIndex, filteredHistory.length)}
                  </span>{" "}
                  trong tổng số{" "}
                  <span className="font-bold text-blue-600">
                    {filteredHistory.length}
                  </span>{" "}
                  thay đổi
                </div>
              </div>

              {/* Bottom row: Pagination controls */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-9 px-3 border-green-300 hover:bg-green-50 disabled:opacity-50"
                >
                  Đầu
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0 border-green-300 hover:bg-green-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      );
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center gap-1">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-gray-400 px-1 text-sm">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`h-9 min-w-[36px] px-3 font-medium transition-all ${
                            currentPage === page
                              ? "bg-green-600 hover:bg-green-700 text-white shadow-md scale-105"
                              : "hover:bg-green-50 border-green-200"
                          }`}
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0 border-green-300 hover:bg-green-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 border-green-300 hover:bg-green-50 disabled:opacity-50"
                >
                  Cuối
                </Button>
              </div>

              {/* Page indicator */}
              <div className="text-center text-sm text-gray-600">
                Trang {currentPage} / {totalPages}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
