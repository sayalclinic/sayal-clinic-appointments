// Themed chart color palette - distinct, vibrant colors that work well with the medical theme

export const CHART_COLORS = {
  // Primary palette - blues and teals (medical theme)
  primary: [
    "hsl(220, 85%, 55%)",   // Deep blue
    "hsl(200, 80%, 50%)",   // Ocean blue
    "hsl(185, 70%, 45%)",   // Teal
    "hsl(165, 65%, 45%)",   // Mint green
    "hsl(145, 60%, 45%)",   // Emerald
  ],
  
  // Accent palette - warm colors for contrast
  accent: [
    "hsl(40, 85%, 55%)",    // Gold/Amber
    "hsl(25, 80%, 55%)",    // Orange
    "hsl(350, 75%, 55%)",   // Rose/Red
    "hsl(280, 65%, 55%)",   // Purple
    "hsl(320, 70%, 55%)",   // Pink
  ],
  
  // Extended palette for charts with many items
  extended: [
    "hsl(220, 85%, 55%)",   // Deep blue
    "hsl(40, 85%, 55%)",    // Gold
    "hsl(165, 65%, 45%)",   // Mint
    "hsl(350, 75%, 55%)",   // Rose
    "hsl(200, 80%, 50%)",   // Ocean
    "hsl(280, 65%, 55%)",   // Purple
    "hsl(145, 60%, 45%)",   // Emerald
    "hsl(25, 80%, 55%)",    // Orange
    "hsl(185, 70%, 45%)",   // Teal
    "hsl(320, 70%, 55%)",   // Pink
  ],
  
  // Specific use cases
  success: "hsl(142, 76%, 40%)",
  warning: "hsl(38, 96%, 56%)",
  danger: "hsl(0, 84%, 60%)",
  info: "hsl(200, 80%, 50%)",
  
  // Payment methods
  cash: "hsl(145, 60%, 50%)",
  upi: "hsl(220, 85%, 55%)",
  card: "hsl(280, 65%, 55%)",
  
  // Patient types
  newPatient: "hsl(165, 65%, 50%)",
  repeatPaying: "hsl(220, 85%, 55%)",
  repeatNonPaying: "hsl(350, 70%, 60%)",
  
  // Visit types
  normalVisit: "hsl(220, 85%, 55%)",
  labOnly: "hsl(40, 85%, 55%)",
};

// Get a color from the extended palette by index
export const getChartColor = (index: number): string => {
  return CHART_COLORS.extended[index % CHART_COLORS.extended.length];
};

// Get contrasting colors for a specific number of items
export const getContrastingColors = (count: number): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(getChartColor(i));
  }
  return colors;
};

// Generate a gradient string for CSS
export const getGradient = (color1: string, color2: string): string => {
  return `linear-gradient(135deg, ${color1}, ${color2})`;
};
