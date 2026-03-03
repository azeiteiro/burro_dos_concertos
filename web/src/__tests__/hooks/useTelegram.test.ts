import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTelegram } from "@/hooks/useTelegram";

// Mock Telegram WebApp SDK
vi.mock("@twa-dev/sdk", () => ({
  default: {
    ready: vi.fn(),
    expand: vi.fn(),
    setHeaderColor: vi.fn(),
    close: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    themeParams: {
      bg_color: "#ffffff",
      text_color: "#000000",
    },
    colorScheme: "light",
    initDataUnsafe: {
      user: {
        id: 123,
        first_name: "Test",
        last_name: "User",
        username: "testuser",
      },
    },
  },
}));

// Import after mock
import WebApp from "@twa-dev/sdk";

describe("useTelegram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize Telegram WebApp on mount", async () => {
    const { result } = renderHook(() => useTelegram());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(WebApp.ready).toHaveBeenCalled();
    expect(WebApp.expand).toHaveBeenCalled();
    expect(WebApp.setHeaderColor).toHaveBeenCalledWith("#ffffff");
  });

  it("should return webApp instance", () => {
    const { result } = renderHook(() => useTelegram());

    expect(result.current.webApp).toBe(WebApp);
  });

  it("should return user from initDataUnsafe", () => {
    const { result } = renderHook(() => useTelegram());

    expect(result.current.user).toEqual({
      id: 123,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
    });
  });

  it("should return theme params", () => {
    const { result } = renderHook(() => useTelegram());

    expect(result.current.themeParams).toEqual({
      bg_color: "#ffffff",
      text_color: "#000000",
    });
    expect(result.current.colorScheme).toBe("light");
  });

  it("should provide close function", () => {
    const { result } = renderHook(() => useTelegram());

    result.current.close();

    expect(WebApp.close).toHaveBeenCalled();
  });

  it("should provide showAlert function", () => {
    const { result } = renderHook(() => useTelegram());

    result.current.showAlert("Test alert");

    expect(WebApp.showAlert).toHaveBeenCalledWith("Test alert");
  });

  it("should provide showConfirm function", () => {
    const { result } = renderHook(() => useTelegram());

    result.current.showConfirm("Test confirm");

    expect(WebApp.showConfirm).toHaveBeenCalledWith("Test confirm");
  });

  it("should use fallback color if bg_color is not set", async () => {
    WebApp.themeParams.bg_color = undefined as any;

    const { result } = renderHook(() => useTelegram());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(WebApp.setHeaderColor).toHaveBeenCalledWith("#ffffff");

    // Restore
    WebApp.themeParams.bg_color = "#ffffff";
  });
});
