import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const salesPortalClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

salesPortalClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("udyogbill_salesrep_token") || localStorage.getItem("udyogbill_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const salesRepService = {
  // Device Hardware Security
  async registerDevice(data: {
    deviceFingerprint: string;
    deviceModel: string;
    deviceBrand?: string;
    osVersion: string;
    appVersion?: string;
  }) {
    const res = await salesPortalClient.post("/sales-portal/auth/register-device", data);
    return res.data?.data ?? res.data;
  },

  // Rep Login with Device Lock Validation
  async login(data: {
    mobileNumber: string;
    password: string;
    deviceFingerprint: string;
    deviceModel?: string;
    deviceBrand?: string;
    osVersion?: string;
    appVersion?: string;
  }) {
    const res = await salesPortalClient.post("/sales-portal/auth/login", data);
    const result = res.data?.data ?? res.data;
    if (result?.accessToken && typeof window !== "undefined") {
      localStorage.setItem("udyogbill_salesrep_token", result.accessToken);
      localStorage.setItem("udyogbill_salesrep_user", JSON.stringify(result));
    }
    return result;
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("udyogbill_salesrep_token");
      localStorage.removeItem("udyogbill_salesrep_user");
    }
  },

  getCurrentRep() {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem("udyogbill_salesrep_user");
      return data ? JSON.parse(data) : null;
    }
    return null;
  },

  // Rep Field Dashboard / Cockpit
  async getCockpit() {
    const res = await salesPortalClient.get("/sales-portal/cockpit");
    return res.data?.data ?? res.data;
  },

  // Pitched Products
  async getProducts() {
    const res = await salesPortalClient.get("/sales-portal/products");
    return res.data?.data ?? res.data;
  },

  // Shop Field Visits
  async submitVisit(data: any) {
    const res = await salesPortalClient.post("/sales-portal/visits", data);
    return res.data?.data ?? res.data;
  },

  async getMyVisits(params?: any) {
    const res = await salesPortalClient.get("/sales-portal/visits", { params });
    return res.data?.data ?? res.data;
  },
};
