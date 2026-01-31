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
      {/* Expanded outer slice with subtle shadow */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 16}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
          transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Subtle outer ring indicator */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 20}
        outerRadius={outerRadius + 23}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          opacity: 0.4,
          transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Center text - name */}
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fill="hsl(220, 70%, 25%)"
        className="text-sm font-semibold"
        style={{ transition: "all 150ms ease-out" }}
      >
        {payload.name}
      </text>
      {/* Center text - value */}
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fill="hsl(220, 70%, 30%)"
        className="text-lg font-bold"
        style={{ transition: "all 150ms ease-out" }}
      >
        {typeof value === "number" && value > 1000
          ? `₹${value.toLocaleString()}`
          : value}
      </text>
      {/* Center text - percentage */}
      <text
        x={cx}
        y={cy + 24}
        textAnchor="middle"
        fill="hsl(220, 30%, 50%)"
        className="text-xs"
        style={{ transition: "all 150ms ease-out" }}
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
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in bg-card">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Tap any slice to view details
          </p>
        </DialogHeader>

        <div className="relative">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                onClick={onPieClick}
                animationBegin={0}
                animationDuration={350}
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
                      transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                      opacity: activeIndex === undefined || activeIndex === index ? 1 : 0.35,
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

        {/* Legend with subtle hover effects */}
        <div className="mt-4 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Distribution</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {data.map((item, idx) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
              const isActive = activeIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(isActive ? undefined : idx)}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-md border transition-all duration-150",
                    "hover:bg-muted/50 hover:border-border",
                    "focus:outline-none focus:ring-1 focus:ring-primary/20",
                    isActive
                      ? "bg-muted/60 border-primary/40"
                      : "bg-background border-border/40"
                  )}
                >
                  <span
                    className={cn(
                      "w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-150",
                      isActive && "scale-110"
                    )}
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1 text-left min-w-0">
                    <span className={cn(
                      "block text-sm font-medium truncate transition-colors duration-150",
                      isActive && "text-primary"
                    )}>
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatValue(item.value)}
                    </span>
                  </span>
                  <span className={cn(
                    "text-sm font-semibold transition-colors duration-150",
                    isActive ? "text-primary" : "text-foreground"
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
