import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2 } from "lucide-react";

export function ChangeHistoryReport() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [storeFilter, setStoreFilter] = useState<string>("all");

  // Fetch stores list
  const { data: storesData = [] } = useQuery({
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/store-settings/list"],
    queryFn: async () => {
      try {
        const response = await fetch("https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/store-settings/list");
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
    queryKey: ["https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/order-change-history", startDate, endDate, storeFilter],
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
          url: `https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/order-change-history?${params}`,
        });

        const response = await fetch(`https://7874c3c9-831f-419c-bd7a-28fed8813680-00-26bwuawdklolu.pike.replit.dev/api/order-change-history?${params}`);
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
    return changeHistory;
  }, [changeHistory]);

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 w-[180px]">
                      Thời gian
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Cửa hàng
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Chức năng
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Hành động
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Thông tin tham chiếu
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Mô tả chi tiết
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredHistory || filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-gray-500"
                      >
                        Không có dữ liệu thay đổi trong khoảng thời gian này
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((item: any, index: number) => {
                      try {
                        return (
                          <TableRow
                            key={item.id || index}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="text-sm">
                              {item.changedAt
                                ? format(
                                    new Date(item.changedAt),
                                    "dd/MM/yyyy HH:mm:ss",
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.storeName || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.action === "update"
                                ? "Sửa"
                                : item.action === "create"
                                  ? "Tạo mới"
                                  : "Đơn bán hàng"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.action === "update"
                                ? "Sửa"
                                : item.action === "create"
                                  ? "Tạo"
                                  : "Cập nhật"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-blue-600">
                              {item.orderNumber || "-"}
                            </TableCell>
                            <TableCell className="text-sm max-w-2xl">
                              <div className="whitespace-pre-wrap">
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

          {/* Summary */}
          {filteredHistory.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Tổng số:{" "}
              <span className="font-semibold">{filteredHistory.length}</span>{" "}
              thay đổi
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
