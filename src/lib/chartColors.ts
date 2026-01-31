// Themed chart color palette - teal/mint focused to match Sayal Clinic branding
// Avoids harsh reds, dark blues, and greens - uses soft, professional tones

export const CHART_COLORS = {
  // Primary palette - teal/mint/gold tones matching logo
  primary: [
    "hsl(175, 50%, 42%)",   // Teal (primary)
    "hsl(190, 45%, 48%)",   // Cyan-teal
    "hsl(42, 55%, 52%)",    // Warm gold
    "hsl(160, 40%, 50%)",   // Mint
    "hsl(205, 45%, 55%)",   // Soft sky blue
  ],
  
  // Accent palette - warm complementary colors, muted
  accent: [
    "hsl(42, 55%, 52%)",    // Warm gold
    "hsl(28, 50%, 55%)",    // Soft coral/peach
    "hsl(320, 35%, 55%)",   // Dusty mauve
    "hsl(260, 35%, 55%)",   // Soft lavender
    "hsl(15, 45%, 55%)",    // Terracotta
  ],
  
  // Extended palette for charts - alternating teal/warm tones
  extended: [
    "hsl(175, 50%, 42%)",   // Teal (brand primary)
    "hsl(42, 55%, 52%)",    // Warm gold
    "hsl(190, 45%, 48%)",   // Cyan-teal
    "hsl(28, 50%, 55%)",    // Soft coral
    "hsl(160, 40%, 50%)",   // Mint
    "hsl(320, 35%, 55%)",   // Dusty mauve
    "hsl(205, 45%, 55%)",   // Soft sky blue
    "hsl(260, 35%, 55%)",   // Soft lavender
    "hsl(145, 38%, 48%)",   // Sage
    "hsl(15, 45%, 55%)",    // Terracotta
  ],
  
  // Specific use cases - teal-focused
  success: "hsl(160, 45%, 45%)",
  warning: "hsl(42, 55%, 52%)",
  danger: "hsl(15, 50%, 55%)",
  info: "hsl(190, 45%, 50%)",
  
  // Payment methods - easily distinguishable
  cash: "hsl(160, 45%, 48%)",
  upi: "hsl(175, 50%, 42%)",
  card: "hsl(260, 35%, 55%)",
  
  // Patient types - clear differentiation
  newPatient: "hsl(175, 50%, 45%)",
  repeatPaying: "hsl(190, 45%, 48%)",
  repeatNonPaying: "hsl(28, 50%, 55%)",
  
  // Visit types
  normalVisit: "hsl(175, 50%, 42%)",
  labOnly: "hsl(42, 55%, 52%)",
  
  // Age groups - gradient from cool teal to warm
  age: [
    "hsl(175, 50%, 42%)",   // 0-17 - Teal
    "hsl(190, 45%, 48%)",   // 18-29 - Cyan
    "hsl(160, 40%, 50%)",   // 30-44 - Mint
    "hsl(42, 55%, 52%)",    // 45-59 - Gold
    "hsl(28, 50%, 55%)",    // 60+ - Coral
  ],
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
