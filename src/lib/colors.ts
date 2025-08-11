export type ColorPair = { light: string; dark: string };

export const colorPairs: ColorPair[] = [
  { dark: "#286b33", light: "#84bf5c" },
  { dark: "#426b1f", light: "#adc13d" },
  { dark: "#786603", light: "#f0b737" },
  { dark: "#7a4f07", light: "#f39353" },
  { dark: "#82380f", light: "#f6746c" },
  { dark: "#88231f", light: "#f05b77" },
  { dark: "#961d48", light: "#ef63a7" },
  { dark: "#852150", light: "#c770b2" },
  { dark: "#64285c", light: "#9a78c4" },
  { dark: "#462f6c", light: "#7086d0" },
  { dark: "#2e4175", light: "#559ed2" },
  { dark: "#1d587a", light: "#43b9d3" },
  { dark: "#0c6c7c", light: "#38d2d0" },
];

export const pickRandomColorPair = (): ColorPair =>
  colorPairs[Math.floor(Math.random() * colorPairs.length)];
