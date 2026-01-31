import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { cn } from "@/lib/utils";

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface InteractivePieChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ChartDataItem[];
  title: string;
  formatValue?: (value: number) => string;
}

// Custom active shape for expanded slice with smooth animation
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
    percent,
  } = props;

  return (
    <g>
      {/* Expanded outer slice */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 20}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))",
          transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Inner highlight ring */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 24}
        outerRadius={outerRadius + 28}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          opacity: 0.5,
          transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Center text */}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fill="currentColor"
        className="text-sm font-semibold"
        style={{ transition: "all 200ms ease-out" }}
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        fill="currentColor"
        className="text-lg font-bold"
        style={{ transition: "all 200ms ease-out" }}
      >
        {typeof value === "number" && value > 1000
          ? `₹${value.toLocaleString()}`
          : value}
      </text>
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        fill="currentColor"
        className="text-xs text-muted-foreground"
        style={{ opacity: 0.7, transition: "all 200ms ease-out" }}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

export const InteractivePieChartModal = ({
  open,
  onOpenChange,
  data,
  title,
  formatValue = (v) => v.toString(),
}: InteractivePieChartModalProps) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  const onPieClick = (_: any, index: number) => {
    setActiveIndex((prev) => (prev === index ? undefined : index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-bold text-primary">
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Click or tap on any slice to see details
          </p>
        </DialogHeader>

        <div className="relative">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                onClick={onPieClick}
                animationBegin={0}
                animationDuration={500}
                animationEasing="ease-out"
                style={{ cursor: "pointer" }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    style={{
                      transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                      opacity: activeIndex === undefined || activeIndex === index ? 1 : 0.4,
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* No slice selected - show prompt */}
          {activeIndex === undefined && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center animate-fade-in">
                <p className="text-lg font-bold text-foreground">{data.length} Items</p>
                <p className="text-sm text-muted-foreground">Total: {formatValue(total)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Legend with smooth hover effects */}
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-3">Distribution</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.map((item, idx) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
              const isActive = activeIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(isActive ? undefined : idx)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                    "hover:bg-accent/10 hover:border-primary/30 hover:scale-[1.02]",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30",
                    isActive
                      ? "bg-primary/10 border-primary/50 scale-[1.02] shadow-md"
                      : "bg-card border-border/50"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full flex-shrink-0 transition-transform duration-200",
                      isActive && "scale-125"
                    )}
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1 text-left">
                    <span className={cn(
                      "block text-sm font-medium truncate transition-colors duration-200",
                      isActive && "text-primary"
                    )}>
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatValue(item.value)}
                    </span>
                  </span>
                  <span className={cn(
                    "text-sm font-bold transition-all duration-200",
                    isActive ? "text-primary scale-110" : "text-foreground"
                  )}>
                    {percentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
