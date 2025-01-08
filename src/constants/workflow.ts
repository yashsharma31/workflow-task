export const COLORS = {
  INITIAL_VALUE: "#F5A524",
  FINAL_OUTPUT: "#4CAF79",
  CONNECTION: "#0066FF",
} as const;

export const FUNCTION_DEFAULTS = {
  INITIAL_VALUE: 2,
  FINAL_OUTPUT: 120,
  CONNECTION_OPACITY: 0.3,
  CONNECTION_WIDTH: 7,
  ALIGNMENT_THRESHOLD: 20,
  CURVE_CURVATURE: 0.5,
} as const;

export const INITIAL_FUNCTIONS = [
  { id: 1, equation: "x^2" },
  { id: 2, equation: "2x+4" },
  { id: 3, equation: "x^2+20" },
  { id: 4, equation: "x-2" },
  { id: 5, equation: "x/2" },
] as const;

export const CONNECTION_TYPES = {
  INPUT: "input",
  OUTPUT: "output",
} as const;

export const SPECIAL_IDS = {
  INITIAL: 0,
  FINAL: -1,
} as const;

export const CLASSNAMES = {
  INPUT_POINT: "input-point",
  OUTPUT_POINT: "output-point",
} as const;
