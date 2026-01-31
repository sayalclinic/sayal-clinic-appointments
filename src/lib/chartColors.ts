// Themed chart color palette - subdued colors that match the medical theme
// Uses HSL values that complement the app's navy/mint/gold design system

export const CHART_COLORS = {
  // Primary palette - subdued, professional tones matching app theme
  primary: [
    "hsl(220, 70%, 45%)",   // Navy (primary brand)
    "hsl(165, 45%, 50%)",   // Mint/Teal
    "hsl(40, 65%, 50%)",    // Gold/Amber (accent)
    "hsl(200, 55%, 50%)",   // Ocean blue
    "hsl(280, 40%, 50%)",   // Muted purple
  ],
  
  // Accent palette - warm colors for contrast, still muted
  accent: [
    "hsl(40, 65%, 50%)",    // Gold/Amber
    "hsl(25, 55%, 50%)",    // Warm orange
    "hsl(350, 50%, 50%)",   // Muted rose
    "hsl(280, 40%, 50%)",   // Muted purple
    "hsl(320, 45%, 50%)",   // Soft pink
  ],
  
  // Extended palette for charts with many items - alternates between cool and warm
  extended: [
    "hsl(220, 70%, 45%)",   // Navy (brand primary)
    "hsl(165, 45%, 50%)",   // Mint/Teal
    "hsl(40, 65%, 50%)",    // Gold (accent)
    "hsl(200, 55%, 50%)",   // Ocean blue
    "hsl(350, 50%, 50%)",   // Muted rose
    "hsl(280, 40%, 50%)",   // Muted purple
    "hsl(145, 45%, 45%)",   // Sage green
    "hsl(25, 55%, 50%)",    // Warm orange
    "hsl(185, 50%, 45%)",   // Teal
    "hsl(320, 45%, 50%)",   // Soft pink
  ],
  
  // Specific use cases - more muted
  success: "hsl(142, 55%, 42%)",
  warning: "hsl(38, 70%, 50%)",
  danger: "hsl(0, 60%, 52%)",
  info: "hsl(200, 55%, 50%)",
  
  // Payment methods - distinguishable but muted
  cash: "hsl(145, 50%, 45%)",
  upi: "hsl(220, 65%, 48%)",
  card: "hsl(280, 40%, 50%)",
  
  // Patient types - clear differentiation
  newPatient: "hsl(165, 50%, 48%)",
  repeatPaying: "hsl(220, 65%, 48%)",
  repeatNonPaying: "hsl(350, 45%, 52%)",
  
  // Visit types
  normalVisit: "hsl(220, 65%, 48%)",
  labOnly: "hsl(40, 60%, 50%)",
  
  // Age groups - gradient from cool to warm
  age: [
    "hsl(220, 65%, 48%)",   // 0-17 - Navy
    "hsl(200, 55%, 50%)",   // 18-29 - Ocean
    "hsl(165, 50%, 48%)",   // 30-44 - Mint
    "hsl(40, 60%, 50%)",    // 45-59 - Gold
    "hsl(350, 50%, 50%)",   // 60+ - Rose
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
