
export function setupFetchInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = async (url, options = {}) => {
    // Always get fresh token from localStorage
    const token = localStorage.getItem("authToken");
    
    options.headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Always include credentials
    options.credentials = options.credentials || "include";

    const response = await originalFetch(url, options);

    // Handle 401 - token expired or invalid
    if (response.status === 401) {
      console.warn("⚠️ Token expired or invalid - redirecting to login");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes("/") || window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    return response;
  };

  console.log("✅ Fetch interceptor setup complete - all requests will include auth token");
}
