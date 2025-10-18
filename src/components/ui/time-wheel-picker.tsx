import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TimeWheelPickerProps {
  value?: string;
  onChange: (time: string) => void;
}

export const TimeWheelPicker = ({ value, onChange }: TimeWheelPickerProps) => {
  const parseTime = (timeStr?: string) => {
    if (!timeStr) return { hour: 10, minute: 0, period: "AM" };
    const [hours, mins] = timeStr.split(":").map(Number);
    const hour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const period = hours >= 12 ? "PM" : "AM";
    return { hour, minute: mins, period };
  };

  const initial = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initial.period);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<{ [key: string]: boolean }>({});

  const baseHours = Array.from({ length: 12 }, (_, i) => i + 1);
  const baseMinutes = [0, 15, 30, 45];
  const basePeriods = ["AM", "PM"];

  // Create infinite arrays by tripling the items
  const hours = [...baseHours, ...baseHours, ...baseHours];
  const minutes = [...baseMinutes, ...baseMinutes, ...baseMinutes];
  const periods = [...basePeriods, ...basePeriods, ...basePeriods];

  useEffect(() => {
    const hour24 = selectedPeriod === "PM" && selectedHour !== 12 
      ? selectedHour + 12 
      : selectedPeriod === "AM" && selectedHour === 12 
      ? 0 
      : selectedHour;
    const timeString = `${String(hour24).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;
    onChange(timeString);
  }, [selectedHour, selectedMinute, selectedPeriod, onChange]);

  const scrollTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    items: (number | string)[],
    baseItems: (number | string)[],
    setter: (value: any) => void,
    key: string
  ) => {
    if (!ref.current || isScrollingRef.current[key]) return;
    
    if (scrollTimeouts.current[key]) {
      clearTimeout(scrollTimeouts.current[key]);
    }
    
    scrollTimeouts.current[key] = setTimeout(() => {
      if (!ref.current) return;
      const container = ref.current;
      const itemHeight = 40;
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const itemsPerSet = baseItems.length;
      
      // Get the actual value from the middle set
      const actualIndex = index % itemsPerSet;
      setter(baseItems[actualIndex]);
      
      // Snap to position
      container.scrollTo({ top: index * itemHeight, behavior: "smooth" });
      
      // Handle infinite loop by resetting to middle set when needed
      if (index < itemsPerSet || index >= itemsPerSet * 2) {
        setTimeout(() => {
          if (!ref.current) return;
          isScrollingRef.current[key] = true;
          const middleSetIndex = itemsPerSet + actualIndex;
          container.scrollTo({ top: middleSetIndex * itemHeight, behavior: "auto" });
          setTimeout(() => {
            isScrollingRef.current[key] = false;
          }, 50);
        }, 300);
      }
    }, 100);
  };

  const scrollToValue = (
    ref: React.RefObject<HTMLDivElement>,
    value: number | string,
    items: (number | string)[],
    baseItems: (number | string)[]
  ) => {
    if (!ref.current) return;
    // Scroll to the middle set
    const baseIndex = baseItems.indexOf(value);
    if (baseIndex !== -1) {
      const middleSetIndex = baseItems.length + baseIndex;
      ref.current.scrollTo({ top: middleSetIndex * 40, behavior: "auto" });
    }
  };

  useEffect(() => {
    scrollToValue(hourRef, selectedHour, hours, baseHours);
    scrollToValue(minuteRef, selectedMinute, minutes, baseMinutes);
    scrollToValue(periodRef, selectedPeriod, periods, basePeriods);
  }, []);

  const renderWheel = (
    items: (number | string)[],
    baseItems: (number | string)[],
    selected: number | string,
    ref: React.RefObject<HTMLDivElement>,
    setter: (value: any) => void,
    key: string,
    formatter?: (val: number | string) => string
  ) => (
    <div className="relative h-[200px] w-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-[80px] left-0 right-0 h-[40px] border-y-2 border-primary/20 bg-primary/5" />
      </div>
      <div
        ref={ref}
        className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
        onScroll={() => handleScroll(ref, items, baseItems, setter, key)}
      >
        <div className="h-[80px]" />
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              "h-[40px] flex items-center justify-center snap-center cursor-pointer transition-all",
              selected === item
                ? "text-primary font-bold text-lg scale-110"
                : "text-muted-foreground text-sm"
            )}
            onClick={() => {
              const actualValue = baseItems[baseItems.indexOf(item as any)] || item;
              setter(actualValue);
              scrollToValue(ref, actualValue, items, baseItems);
            }}
          >
            {formatter ? formatter(item) : item}
          </div>
        ))}
        <div className="h-[80px]" />
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-2 p-4 bg-background rounded-lg pointer-events-auto">
      {renderWheel(hours, baseHours, selectedHour, hourRef, setSelectedHour, "hour", (val) =>
        String(val).padStart(2, "0")
      )}
      <div className="text-2xl font-bold text-muted-foreground">:</div>
      {renderWheel(minutes, baseMinutes, selectedMinute, minuteRef, setSelectedMinute, "minute", (val) =>
        String(val).padStart(2, "0")
      )}
      {renderWheel(periods, basePeriods, selectedPeriod, periodRef, setSelectedPeriod, "period")}
    </div>
  );
};
