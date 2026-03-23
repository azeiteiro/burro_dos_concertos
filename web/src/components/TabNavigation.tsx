import { TabType } from "@/hooks/useConcerts";
import { Tabbar } from "@telegram-apps/telegram-ui";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  myConcertsCount: number;
}

export function TabNavigation({ activeTab, onTabChange, myConcertsCount }: TabNavigationProps) {
  return (
    <Tabbar className="fixed bottom-0 left-0 right-0">
      <Tabbar.Item
        selected={activeTab === "all"}
        onClick={() => onTabChange("all")}
        text="All Concerts"
      >
        🎵
      </Tabbar.Item>

      <Tabbar.Item
        selected={activeTab === "my"}
        onClick={() => onTabChange("my")}
        text="My Concerts"
      >
        <div className="relative">
          🎤
          {myConcertsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] rounded-full px-1 bg-blue-500 text-white">
              {myConcertsCount}
            </span>
          )}
        </div>
      </Tabbar.Item>
    </Tabbar>
  );
}
