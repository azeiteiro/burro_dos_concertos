import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTelegram } from "@/hooks/useTelegram";

// Get the mocked WebApp from window (set up in test/setup.ts)
const getWebApp = () => (window as any).Telegram.WebApp;

describe("useTelegram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset bg_color to default
    getWebApp().themeParams.bg_color = "#ffffff";
  });

  it("should initialize Telegram WebApp on mount", async () => {
    const { result } = renderHook(() => useTelegram());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(getWebApp().ready).toHaveBeenCalled();
    expect(getWebApp().expand).toHaveBeenCalled();
    expect(getWebApp().setHeaderColor).toHaveBeenCalledWith("#ffffff");
  });

  it("should return webApp instance", () => {
    const { result } = renderHook(() => useTelegram());

    expect(result.current.webApp).toBe(getWebApp());
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

    expect(getWebApp().close).toHaveBeenCalled();
  });

  it("should provide showAlert function", () => {
    const { result } = renderHook(() => useTelegram());

    result.current.showAlert("Test alert");

    expect(getWebApp().showAlert).toHaveBeenCalledWith("Test alert");
  });

  it("should provide showConfirm function", () => {
    const { result } = renderHook(() => useTelegram());

    result.current.showConfirm("Test confirm");

    expect(getWebApp().showConfirm).toHaveBeenCalledWith("Test confirm");
  });

  it("should use fallback color if bg_color is not set", async () => {
    getWebApp().themeParams.bg_color = undefined;

    const { result } = renderHook(() => useTelegram());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(getWebApp().setHeaderColor).toHaveBeenCalledWith("#ffffff");
  });
});
