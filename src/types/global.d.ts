import "grammy";

declare module "grammy" {
  interface Context {
    t: (key: string, options?: Record<string, unknown>) => string;
  }
}
