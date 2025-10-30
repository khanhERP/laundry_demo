import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Eye, EyeOff, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface PinAuthProps {
  onAuthSuccess: () => void;
}

export function PinAuth({ onAuthSuccess }: PinAuthProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if already authenticated with valid token
    const token = localStorage.getItem("authToken");
    if (token) {
      // Verify token is still valid
      verifyToken(token);
    }
  }, [onAuthSuccess]);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch("https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/auth/verify", {
        headers: {
          "Authorization": `Bearer ${token}`
        },
        credentials: 'include' // Send cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.typeUser === 1) {
          onAuthSuccess();
        } else {
          // Token valid but not admin user
          localStorage.removeItem("authToken");
          localStorage.removeItem("userData");
        }
      } else {
        // Token invalid
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Submitting login:", username);

      // Call login API
      const response = await fetch("https://c4a08644-6f82-4c21-bf98-8d382f0008d1-00-2q0r6kl8z7wo.pike.replit.dev/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include', // Important: Receive cookies
        body: JSON.stringify({
          userName: username,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Check if user has admin rights (typeUser = 1)
        if (data.data.user.typeUser !== 1) {
          toast({
            title: "Đăng nhập thất bại",
            description: "Tài khoản không có quyền truy cập hệ thống POS",
            variant: "destructive",
          });
          setPassword("");
          return;
        }

        // Save token and user data
        localStorage.setItem("authToken", data.data.token);
        localStorage.setItem("userData", JSON.stringify(data.data.user));

        console.log("✅ Login successful, token saved");

        // Call onAuthSuccess to update app state
        onAuthSuccess();

        // CRITICAL: Reload page to ensure fresh start with new token
        console.log("🔄 Reloading page after successful login...");
        
        // Small delay to ensure token is saved
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload the page - this will clear all cache and fetch fresh data
        window.location.reload();
      } else {
        toast({
          title: "Đăng nhập thất bại",
          description: data.message || "Tên đăng nhập hoặc mật khẩu không đúng",
          variant: "destructive",
        });
        setPassword("");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Lỗi hệ thống",
        description: "Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #ffffff 0%, transparent 50%),
                           radial-gradient(circle at 75% 25%, #ffffff 0%, transparent 50%),
                           radial-gradient(circle at 25% 75%, #ffffff 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, #ffffff 0%, transparent 50%)`,
            backgroundSize: "100px 100px",
          }}
        ></div>
      </div>

      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0 relative z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Đăng nhập hệ thống
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Nhập tên đăng nhập và mật khẩu để truy cập hệ thống POS
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-gray-700"
              >
                Tên đăng nhập
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tên đăng nhập"
                  className="pr-10"
                  autoFocus
                  disabled={isLoading}
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập mật khẩu"
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold mt-6"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Đang xác thực...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Đăng nhập
                </div>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Liên hệ quản trị viên nếu bạn quên mật khẩu
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}