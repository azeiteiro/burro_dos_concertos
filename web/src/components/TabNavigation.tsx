import { TabType } from "@/hooks/useConcerts";
import { Badge, Tabbar } from "@telegram-apps/telegram-ui";
import { FaCalendarCheck, FaTicket } from "react-icons/fa6";

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
        <FaTicket />
      </Tabbar.Item>

      <Tabbar.Item
        selected={activeTab === "my"}
        onClick={() => onTabChange("my")}
        text="My Concerts"
      >
        <div>
          <FaCalendarCheck />
          {myConcertsCount > 0 && (
            <Badge className="absolute top-0" mode="primary" type="number">
              {myConcertsCount}
            </Badge>
          )}
        </div>
      </Tabbar.Item>
    </Tabbar>
  );
}
