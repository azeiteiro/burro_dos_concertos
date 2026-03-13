import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Mock Telegram WebApp in window
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
};

// Cleanup after each test
afterEach(() => {
  cleanup();
});
