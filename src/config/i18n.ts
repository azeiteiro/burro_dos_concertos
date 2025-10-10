import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "path";

// Initialize i18n
const i18nPromise = i18next.use(Backend).init({
  fallbackLng: "en",
  preload: ["en", "pt"],
  ns: ["common"],
  defaultNS: "common",
  backend: {
    loadPath: path.resolve("./src/locales/{{lng}}/{{ns}}.json"),
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
export { i18nPromise };
