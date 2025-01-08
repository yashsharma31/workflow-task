export interface Function {
  id: number;
  equation: string;
  nextFunction?: number;
  previousFunction?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Connection {
  start: Point;
  end: Point;
  isTerminal?: boolean;
}

export interface DragConnection {
  start: Point;
  end: Point;
}

export interface ActivePoint {
  functionId: number;
  type: "input" | "output";
}

export interface ConnectionPoint {
  element: Element;
  type: "input" | "output";
  containerRect: DOMRect;
}

export interface SVGDimensions {
  width: number;
  height: number;
}
