import "@testing-library/jest-dom";
import { cleanup, render as rtlRender, RenderOptions } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import React, { ReactElement } from "react";

// Hoist the mock context value so it's available during mock setup
const { mockAppRootContextValue } = vi.hoisted(() => {
  const contextValue = {
    isReady: true,
    platform: "base" as const,
    appearance: "light" as const,
    portalContainer: null,
  };

  return {
    mockAppRootContextValue: contextValue,
  };
});

// Mock the Telegram UI module
vi.mock("@telegram-apps/telegram-ui", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@telegram-apps/telegram-ui")>();
  const React = await import("react");
  const { createContext, useContext } = React;

  const Context = createContext(mockAppRootContextValue);

  return {
    ...mod,
    useAppRootContext: () => useContext(Context),
    usePlatform: () => "base" as const,
    AppRoot: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Context.Provider, { value: mockAppRootContextValue }, children),
  };
});

// AppRoot is mocked above, no need to import

// Mock Telegram WebApp in window with all required SDK methods
(window as any).Telegram = {
  WebApp: {
    ready: vi.fn(),
    expand: vi.fn(),
    setHeaderColor: vi.fn(),
    close: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    showPopup: vi.fn(),
    openLink: vi.fn(),
    onEvent: vi.fn(),
    offEvent: vi.fn(),
    version: "7.0",
    platform: "unknown",
    isVersionAtLeast: vi.fn(() => true),
    themeParams: {
      bg_color: "#ffffff",
      text_color: "#000000",
      hint_color: "#999999",
      link_color: "#3390ec",
      button_color: "#3390ec",
      button_text_color: "#ffffff",
      secondary_bg_color: "#f5f5f5",
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
    initData: "",
    headerColor: "#ffffff",
    backgroundColor: "#ffffff",
    isExpanded: true,
    viewportHeight: 600,
    viewportStableHeight: 600,
  },
};

// Custom render function - no AppRoot wrapper, hooks are mocked
function customRender(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, options);
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };

// Mock pointer capture for Modal/Drawer components (not supported in jsdom)
if (typeof Element !== "undefined") {
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn();
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
