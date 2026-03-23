import "@testing-library/jest-dom";
import { cleanup, render as rtlRender } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import React from "react";
import { AppRoot } from "@telegram-apps/telegram-ui";

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

// Custom render function that wraps with AppRoot
function customRender(ui: React.ReactElement, options = {}) {
  return rtlRender(React.createElement(AppRoot, null, ui), options);
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };

// Cleanup after each test
afterEach(() => {
  cleanup();
});
