import { TabType } from "@/hooks/useConcerts";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  myConcertsCount: number;
}

export function TabNavigation({ activeTab, onTabChange, myConcertsCount }: TabNavigationProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 border-t"
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
        borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
      }}
    >
      <div className="flex">
        <button
          onClick={() => onTabChange("all")}
          className={`flex-1 px-4 py-3 text-center transition-colors ${
            activeTab === "all" ? "font-semibold" : "font-normal"
          }`}
          style={{
            color:
              activeTab === "all"
                ? "var(--tg-theme-button-color, #3390ec)"
                : "var(--tg-theme-hint-color, #999999)",
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">🎵</span>
            <span className="text-sm">All Concerts</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange("my")}
          className={`flex-1 px-4 py-3 text-center transition-colors ${
            activeTab === "my" ? "font-semibold" : "font-normal"
          }`}
          style={{
            color:
              activeTab === "my"
                ? "var(--tg-theme-button-color, #3390ec)"
                : "var(--tg-theme-hint-color, #999999)",
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <span className="text-xl">🎤</span>
              {myConcertsCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] rounded-full px-1"
                  style={{
                    backgroundColor: "var(--tg-theme-button-color, #3390ec)",
                    color: "var(--tg-theme-button-text-color, #ffffff)",
                  }}
                >
                  {myConcertsCount}
                </span>
              )}
            </div>
            <span className="text-sm">My Concerts</span>
          </div>
        </button>
      </div>
    </div>
  );
}
