// API configuration.
// Set VITE_API_BASE_URL to the PHP backend root (e.g. https://dcms.haronihotel.com/api).
// Without it the app runs against the built-in demo backend that stores data in this browser.
const rawBase = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "";

export const API_BASE_URL = rawBase.replace(/\/+$/, "");
export const USE_DEMO_BACKEND = !API_BASE_URL || import.meta.env["VITE_USE_DEMO_BACKEND"] === "true";
export const SESSION_STORAGE_KEY = "haroni-dcms-session";
