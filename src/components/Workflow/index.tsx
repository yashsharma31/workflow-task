import { COLORS, FUNCTION_DEFAULTS } from "@/constants/workflow";
import { SVGDimensions } from "@/types/workflow";
import React, { useState, useEffect, useRef, useCallback } from "react";

interface Function {
  id: number;
  equation: string;
  nextFunction?: number;
  previousFunction?: number;
}

interface Connection {
  start: { x: number; y: number };
  end: { x: number; y: number };
  isTerminal?: boolean;
}

interface DragConnection {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

const evaluateExpression = (expression: string, x: number): number => {
  try {
    // Replace x^2 with x**2 for JavaScript math
    let jsExpression = expression.replace(/x\^(\d+)/g, "x**$1");

    // Replace x with the actual number
    jsExpression = jsExpression.replace(/x/g, x.toString());

    // Evaluate the expression
    const result = eval(jsExpression);
    return Number(result.toFixed(2));
  } catch (error) {
    console.error("Error evaluating expression:", error);
    return 0;
  }
};

export default function Workflow() {
  const [functions, setFunctions] = useState<Function[]>([
    { id: 1, equation: "x^2" },
    { id: 2, equation: "2x+4" },
    { id: 3, equation: "x^2+20" },
    { id: 4, equation: "x-2" },
    { id: 5, equation: "x/2" },
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [initialValue, setInitialValue] = useState(2);
  const [finalOutput, setFinalOutput] = useState(120);

  // Add state for SVG dimensions
  const [svgDimensions, setSvgDimensions] = useState<SVGDimensions>({
    width: 0,
    height: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragConnection, setDragConnection] = useState<DragConnection | null>(
    null
  );
  const [activePoint, setActivePoint] = useState<{
    functionId: number;
    type: "input" | "output";
  } | null>(null);

  const getConnectionPoint = (
    element: Element,
    type: "input" | "output",
    containerRect: DOMRect
  ) => {
    const point =
      type === "input"
        ? element.querySelector(".input-point")?.getBoundingClientRect()
        : element.querySelector(".output-point")?.getBoundingClientRect();

    if (!point) return null;

    return {
      x: point.left + point.width / 2 - containerRect.left,
      y: point.top + point.height / 2 - containerRect.top,
    };
  };

  const updateDimensionsAndConnections = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    setSvgDimensions({
      width: containerRect.width,
      height: containerRect.height,
    });

    const newConnections: Connection[] = [];
    const boxes = containerRef.current.getElementsByClassName("function-box");
    const initialValueEl = containerRef.current.querySelector(".initial-value");
    const finalOutputEl = containerRef.current.querySelector(".final-output");

    // Add connections between function boxes
    Array.from(boxes).forEach((box) => {
      const boxId = parseInt(box.getAttribute("data-id") || "0");
      const currentFunction = functions.find((f) => f.id === boxId);

      // Check for initial value connection
      if (currentFunction?.previousFunction === 0 && initialValueEl) {
        const startPoint = getConnectionPoint(
          initialValueEl,
          "output",
          containerRect
        );
        const endPoint = getConnectionPoint(box, "input", containerRect);

        if (startPoint && endPoint) {
          newConnections.push({
            start: startPoint,
            end: endPoint,
            isTerminal: true,
          });
        }
      }

      // Check for next function connection
      if (currentFunction?.nextFunction) {
        let nextElement: Element | null = null;

        if (currentFunction.nextFunction === -1) {
          nextElement = finalOutputEl;
        } else {
          nextElement =
            Array.from(boxes).find(
              (b) =>
                parseInt(b.getAttribute("data-id") || "0") ===
                currentFunction.nextFunction
            ) || null;
        }

        if (box && nextElement) {
          const startPoint = getConnectionPoint(box, "output", containerRect);
          const endPoint = getConnectionPoint(
            nextElement,
            "input",
            containerRect
          );

          if (startPoint && endPoint) {
            newConnections.push({
              start: startPoint,
              end: endPoint,
              isTerminal: currentFunction.nextFunction === -1,
            });
          }
        }
      }
    });

    setConnections(newConnections);
  }, [functions]);

  // Mouse event handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    functionId: number,
    type: "input" | "output"
  ) => {
    e.preventDefault(); // Prevent text selection
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const target = e.currentTarget.getBoundingClientRect();
    const point = {
      x: target.left + target.width / 2 - rect.left,
      y: target.top + target.height / 2 - rect.top,
    };

    setIsDragging(true);
    setActivePoint({ functionId, type });
    setDragConnection({
      start: point,
      end: point,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragConnection || !containerRef.current) return;
    e.preventDefault(); // Prevent text selection

    const rect = containerRef.current.getBoundingClientRect();
    setDragConnection({
      ...dragConnection,
      end: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
    });
  };

  const handleMouseUp = (
    e: React.MouseEvent,
    functionId?: number,
    type?: "input" | "output"
  ) => {
    if (isDragging && activePoint && type && functionId !== undefined) {
      if (functionId !== activePoint.functionId) {
        if (
          (activePoint.type === "output" && type === "input") ||
          (activePoint.type === "input" && type === "output")
        ) {
          const sourceId =
            activePoint.type === "output" ? activePoint.functionId : functionId;
          const targetId =
            activePoint.type === "output" ? functionId : activePoint.functionId;

          setFunctions((prev) => {
            const newFunctions = prev.map((f) => {
              if (f.id === sourceId) {
                return { ...f, nextFunction: targetId };
              }
              if (targetId > 0 && f.id === targetId) {
                return { ...f, previousFunction: sourceId };
              }
              return f;
            });
            return newFunctions;
          });
        }
      }
    }

    setIsDragging(false);
    setDragConnection(null);
    setActivePoint(null);
  };

  // Add mouse up handler to container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragConnection(null);
        setActivePoint(null);
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging]);

  useEffect(() => {
    // Initial update
    updateDimensionsAndConnections();

    // Add resize observer for more reliable updates
    const resizeObserver = new ResizeObserver(() => {
      updateDimensionsAndConnections();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [updateDimensionsAndConnections]); // Update dependency

  const createPath = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    isTerminal: boolean = false
  ) => {
    if (isTerminal) {
      // Straight line for initial/final connections
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const isHorizontal = Math.abs(dy) < 20;
    const isVertical = Math.abs(dx) < 20;

    if (isHorizontal || isVertical) {
      if (isHorizontal) {
        // Horizontal connection with semi-circle
        const radius = Math.abs(dx) / 2;
        const midX = (start.x + end.x) / 2;
        const midY = start.y + radius; // Move the arc downward

        return `M ${start.x} ${start.y}
                Q ${midX} ${midY},
                  ${end.x} ${end.y}`;
      } else {
        // Vertical connection with semi-circle
        const radius = Math.abs(dy) / 2;
        const midX = start.x + radius; // Move the arc rightward
        const midY = (start.y + end.y) / 2;

        return `M ${start.x} ${start.y}
                Q ${midX} ${midY},
                  ${end.x} ${end.y}`;
      }
    } else {
      // Smooth curve for diagonal connections
      const curvature = 0.5;

      const offsetX = dx * curvature;

      const cp1x = start.x + offsetX;
      const cp1y = start.y;
      const cp2x = end.x - offsetX;
      const cp2y = end.y;

      return `M ${start.x} ${start.y}
              C ${cp1x} ${cp1y},
                ${cp2x} ${cp2y},
                ${end.x} ${end.y}`;
    }
  };

  // Add this function to calculate the final output
  const calculateOutput = useCallback(() => {
    let currentValue = initialValue;
    let currentFunctionId: number | undefined = functions.find(
      (f) => f.previousFunction === 0
    )?.id;

    while (currentFunctionId && currentFunctionId > 0) {
      const currentFunction = functions.find((f) => f.id === currentFunctionId);
      if (!currentFunction) break;

      currentValue = evaluateExpression(currentFunction.equation, currentValue);

      if (currentFunction.nextFunction === -1) {
        setFinalOutput(currentValue);
        break;
      }
      currentFunctionId = currentFunction.nextFunction;
    }
  }, [functions, initialValue]);

  // Add effect to recalculate output when connections or initial value changes
  useEffect(() => {
    calculateOutput();
  }, [calculateOutput, functions, initialValue]);

  return (
    <div
      className={`relative flex items-center gap-8 bg-gray-50 p-8 min-h-screen ${
        isDragging ? "dragging" : ""
      }`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      {/* Main content */}
      <div className="relative z-10 flex items-center gap-8 w-full">
        {/* Initial Value */}
        <div className="flex flex-col items-center gap-2 initial-value">
          <span className="bg-[#F5A524] px-4 py-2 rounded-3xl font-medium text-white text-xs whitespace-nowrap">
            Initial value of x
          </span>
          <div className="relative flex justify-between items-center gap-4 border-[#F5A524] border-2 bg-white shadow-md px-8 py-0 rounded-2xl">
            <input
              type="number"
              value={initialValue}
              onChange={(e) => setInitialValue(Number(e.target.value))}
              className="w-10 font-bold text-2xl text-gray-800"
            />
            <div className="border-[#F5A524] border-l h-12">
              <div
                className="top-1/2 right-2 absolute border-2 bg-white hover:bg-blue-100 border-blue-500 rounded-full w-3 h-3 -translate-y-1/2 cursor-pointer output-point"
                onMouseDown={(e) => handleMouseDown(e, 0, "output")}
                onMouseUp={(e) => handleMouseUp(e, 0, "output")}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-20">
          {functions.map((func) => (
            <div
              key={func.id}
              data-id={func.id}
              className="relative bg-white shadow-md p-4 rounded-lg w-[250px] function-box"
            >
              <div className="mb-4 text-gray-600 text-sm">
                Function: {func.id}
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-700 text-sm">Equation</label>
                  <input
                    type="text"
                    value={func.equation}
                    readOnly
                    className="border-gray-200 p-2 border rounded-md w-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-700 text-sm">Next function</label>
                  <select
                    value={func.nextFunction || ""}
                    className="border-gray-200 p-2 border rounded-md w-full"
                  >
                    <option value="">-</option>
                    {functions.map((f) => (
                      <option key={f.id} value={f.id}>
                        Function: {f.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative h-5">
                  <div
                    className="top-1/2 -left-1.5 absolute border-2 bg-white hover:bg-blue-100 border-blue-500 rounded-full w-3 h-3 -translate-y-1/2 cursor-pointer input-point"
                    onMouseDown={(e) => handleMouseDown(e, func.id, "input")}
                    onMouseUp={(e) => handleMouseUp(e, func.id, "input")}
                  />
                  <div
                    className="top-1/2 -right-1.5 absolute border-2 bg-white hover:bg-blue-100 border-blue-500 rounded-full w-3 h-3 -translate-y-1/2 cursor-pointer output-point"
                    onMouseDown={(e) => handleMouseDown(e, func.id, "output")}
                    onMouseUp={(e) => handleMouseUp(e, func.id, "output")}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Final Output */}
        <div className="flex flex-col items-center gap-2 final-output">
          <span className="bg-[#4CAF79] px-4 py-2 rounded-3xl font-medium text-white text-xs whitespace-nowrap">
            Final Output y
          </span>
          <div className="relative flex justify-between items-center gap-4 border-[#4CAF79] border-2 bg-white shadow-md px-8 py-0 rounded-2xl">
            <div className="border-[#4CAF79] border-r h-12">
              <div
                className="top-1/2 left-2 absolute border-2 bg-white hover:bg-blue-100 border-blue-500 rounded-full w-3 h-3 -translate-y-1/2 cursor-pointer input-point"
                onMouseDown={(e) => handleMouseDown(e, -1, "input")}
                onMouseUp={(e) => handleMouseUp(e, -1, "input")}
              />
            </div>
            <span className="w-auto min-w-[40px] font-bold text-2xl text-gray-800">
              {finalOutput}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Layer */}
      <svg
        className="fixed inset-0 pointer-events-none"
        width={svgDimensions.width}
        height={svgDimensions.height}
        style={{
          zIndex: 50,
        }}
      >
        {connections.map((conn, index) => (
          <path
            key={index}
            d={createPath(conn.start, conn.end, conn.isTerminal)}
            fill="none"
            stroke={COLORS.CONNECTION}
            strokeOpacity={FUNCTION_DEFAULTS.CONNECTION_OPACITY}
            strokeWidth={FUNCTION_DEFAULTS.CONNECTION_WIDTH}
            strokeLinecap="round"
            style={{ transition: "all 0.3s ease" }}
          />
        ))}
        {dragConnection && activePoint && (
          <path
            d={createPath(
              dragConnection.start,
              dragConnection.end,
              activePoint.functionId <= 0
            )}
            fill="none"
            stroke={COLORS.CONNECTION}
            strokeOpacity={FUNCTION_DEFAULTS.CONNECTION_OPACITY}
            strokeWidth={FUNCTION_DEFAULTS.CONNECTION_WIDTH}
            strokeLinecap="round"
            strokeDasharray="10,10"
          />
        )}
      </svg>
    </div>
  );
}
