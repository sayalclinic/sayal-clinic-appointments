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

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ["AM", "PM"];

  useEffect(() => {
    const hour24 = selectedPeriod === "PM" && selectedHour !== 12 
      ? selectedHour + 12 
      : selectedPeriod === "AM" && selectedHour === 12 
      ? 0 
      : selectedHour;
    const timeString = `${String(hour24).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;
    onChange(timeString);
  }, [selectedHour, selectedMinute, selectedPeriod, onChange]);

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    items: (number | string)[],
    setter: (value: any) => void
  ) => {
    if (!ref.current) return;
    const container = ref.current;
    const itemHeight = 40;
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    setter(items[clampedIndex]);
    container.scrollTo({ top: clampedIndex * itemHeight, behavior: "smooth" });
  };

  const scrollToValue = (
    ref: React.RefObject<HTMLDivElement>,
    value: number | string,
    items: (number | string)[]
  ) => {
    if (!ref.current) return;
    const index = items.indexOf(value);
    if (index !== -1) {
      ref.current.scrollTo({ top: index * 40, behavior: "auto" });
    }
  };

  useEffect(() => {
    scrollToValue(hourRef, selectedHour, hours);
    scrollToValue(minuteRef, selectedMinute, minutes);
    scrollToValue(periodRef, selectedPeriod, periods);
  }, []);

  const renderWheel = (
    items: (number | string)[],
    selected: number | string,
    ref: React.RefObject<HTMLDivElement>,
    setter: (value: any) => void,
    formatter?: (val: number | string) => string
  ) => (
    <div className="relative h-[200px] w-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-[80px] left-0 right-0 h-[40px] border-y-2 border-primary/20 bg-primary/5" />
      </div>
      <div
        ref={ref}
        className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
        onScroll={() => handleScroll(ref, items, setter)}
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
              setter(item);
              scrollToValue(ref, item, items);
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
      {renderWheel(hours, selectedHour, hourRef, setSelectedHour, (val) =>
        String(val).padStart(2, "0")
      )}
      <div className="text-2xl font-bold text-muted-foreground">:</div>
      {renderWheel(minutes, selectedMinute, minuteRef, setSelectedMinute, (val) =>
        String(val).padStart(2, "0")
      )}
      {renderWheel(periods, selectedPeriod, periodRef, setSelectedPeriod)}
    </div>
  );
};
