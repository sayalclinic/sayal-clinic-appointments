import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClockTimePickerProps {
  value?: string;
  onChange: (time: string) => void;
}

export const ClockTimePicker = ({ value, onChange }: ClockTimePickerProps) => {
  const parseTime = (timeStr?: string) => {
    if (!timeStr) return { hour: 10, minute: 0, period: "AM" };
    const [hours, mins] = timeStr.split(":").map(Number);
    const hour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const period = hours >= 12 ? "PM" : "AM";
    return { hour, minute: mins, period };
  };

  const initial = parseTime(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period as "AM" | "PM");
  const [isDragging, setIsDragging] = useState<"hour" | "minute" | null>(null);
  
  const clockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hour24 = period === "PM" && hour !== 12 
      ? hour + 12 
      : period === "AM" && hour === 12 
      ? 0 
      : hour;
    const timeString = `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onChange(timeString);
  }, [hour, minute, period, onChange]);

  const getAngle = (e: React.MouseEvent | MouseEvent, center: { x: number; y: number }) => {
    const rect = clockRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    
    const x = e.clientX - center.x;
    const y = e.clientY - center.y;
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;
    return angle;
  };

  const handleMouseDown = (type: "hour" | "minute") => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !clockRef.current) return;
    
    const rect = clockRef.current.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    const angle = getAngle(e, center);
    
    if (isDragging === "hour") {
      const newHour = Math.round(angle / 30) % 12 || 12;
      setHour(newHour);
    } else if (isDragging === "minute") {
      // Snap to 15-minute intervals (0, 15, 30, 45)
      const quarterHour = Math.round(angle / 90);
      const newMinute = (quarterHour * 15) % 60;
      setMinute(newMinute);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, hour, minute]);

  const hourAngle = ((hour % 12) * 30) - 90;
  const minuteAngle = (minute * 6) - 90;

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 15, 30, 45];

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-background rounded-lg pointer-events-auto">
      {/* Clock Face */}
      <div className="relative" ref={clockRef}>
        <div className="w-48 h-48 rounded-full border-4 border-foreground/20 bg-background relative shadow-lg">
          {/* Hour markers */}
          {hours.map((h) => {
            const angle = (h * 30 - 90) * (Math.PI / 180);
            const x = 84 * Math.cos(angle);
            const y = 84 * Math.sin(angle);
            return (
              <div
                key={`hour-${h}`}
                className="absolute w-6 h-6 flex items-center justify-center text-xs font-semibold cursor-pointer hover:text-primary transition-colors"
                style={{
                  left: `calc(50% + ${x}px - 12px)`,
                  top: `calc(50% + ${y}px - 12px)`,
                }}
                onClick={() => setHour(h)}
              >
                {h}
              </div>
            );
          })}
          
          {/* Minute markers (15-minute intervals) */}
          {minutes.map((m) => {
            const angle = (m * 6 - 90) * (Math.PI / 180);
            const x = 74 * Math.cos(angle);
            const y = 74 * Math.sin(angle);
            return (
              <div
                key={`min-${m}`}
                className="absolute w-2 h-2 bg-primary/30 rounded-full"
                style={{
                  left: `calc(50% + ${x}px - 4px)`,
                  top: `calc(50% + ${y}px - 4px)`,
                }}
              />
            );
          })}
          
          {/* Center dot */}
          <div className="absolute w-3 h-3 bg-primary rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
          
          {/* Hour hand */}
          <div
            className={cn(
              "absolute w-1.5 bg-foreground rounded-full origin-bottom cursor-grab transition-transform",
              isDragging === "hour" ? "cursor-grabbing scale-110" : ""
            )}
            style={{
              height: "40px",
              left: "calc(50% - 3px)",
              top: "calc(50% - 40px)",
              transform: `rotate(${hourAngle + 90}deg)`,
              transition: isDragging === "hour" ? "none" : "transform 0.2s ease-out"
            }}
            onMouseDown={handleMouseDown("hour")}
          />
          
          {/* Minute hand */}
          <div
            className={cn(
              "absolute w-1 bg-primary rounded-full origin-bottom cursor-grab transition-transform",
              isDragging === "minute" ? "cursor-grabbing scale-110" : ""
            )}
            style={{
              height: "60px",
              left: "calc(50% - 2px)",
              top: "calc(50% - 60px)",
              transform: `rotate(${minuteAngle + 90}deg)`,
              transition: isDragging === "minute" ? "none" : "transform 0.2s ease-out"
            }}
            onMouseDown={handleMouseDown("minute")}
          />
        </div>
      </div>
      
      {/* Time Selection Dropdowns */}
      <div className="flex items-center gap-2">
        <Select value={String(hour).padStart(2, "0")} onValueChange={(v) => setHour(parseInt(v))}>
          <SelectTrigger className="w-16 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {hours.map((h) => (
              <SelectItem key={h} value={String(h).padStart(2, "0")}>
                {String(h).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="text-xl font-bold">:</span>
        
        <Select value={String(minute).padStart(2, "0")} onValueChange={(v) => setMinute(parseInt(v))}>
          <SelectTrigger className="w-16 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((m) => (
              <SelectItem key={m} value={String(m).padStart(2, "0")}>
                {String(m).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={period} onValueChange={(v: "AM" | "PM") => setPeriod(v)}>
          <SelectTrigger className="w-16 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};