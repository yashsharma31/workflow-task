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

  // Add new state for dropdown
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

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
    functions.forEach((sourceFunc) => {
      if (sourceFunc.nextFunction === undefined) return;

      const sourceBox = Array.from(boxes).find(
        (b) => parseInt(b.getAttribute("data-id") || "0") === sourceFunc.id
      );

      let targetElement: Element | null = null;

      if (sourceFunc.nextFunction === -1) {
        // Connection to final output
        targetElement = finalOutputEl;
      } else if (sourceFunc.nextFunction === 0) {
        // Connection from initial value
        targetElement = initialValueEl;
      } else {
        // Connection between functions
        targetElement = Array.from(boxes).find(
          (b) =>
            parseInt(b.getAttribute("data-id") || "0") ===
            sourceFunc.nextFunction
        );
      }

      if (sourceBox && targetElement) {
        const startPoint = getConnectionPoint(
          sourceBox,
          "output",
          containerRect
        );
        const endPoint = getConnectionPoint(
          targetElement,
          "input",
          containerRect
        );

        if (startPoint && endPoint) {
          newConnections.push({
            start: startPoint,
            end: endPoint,
            isTerminal:
              sourceFunc.nextFunction === -1 || sourceFunc.nextFunction === 0,
          });
        }
      }
    });

    // Add initial value connections
    const initialConnections = functions.filter(
      (f) => f.previousFunction === 0
    );
    initialConnections.forEach((targetFunc) => {
      const targetBox = Array.from(boxes).find(
        (b) => parseInt(b.getAttribute("data-id") || "0") === targetFunc.id
      );

      if (initialValueEl && targetBox) {
        const startPoint = getConnectionPoint(
          initialValueEl,
          "output",
          containerRect
        );
        const endPoint = getConnectionPoint(targetBox, "input", containerRect);

        if (startPoint && endPoint) {
          newConnections.push({
            start: startPoint,
            end: endPoint,
            isTerminal: true,
          });
        }
      }
    });

    setConnections(newConnections);
  }, [functions]);

  // Add an effect to update connections when functions change
  useEffect(() => {
    updateDimensionsAndConnections();
  }, [updateDimensionsAndConnections, functions]);

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

  // Add this function after the other handlers
  const handleDotClick = (
    e: React.MouseEvent,
    functionId: number,
    type: "input" | "output"
  ) => {
    e.stopPropagation();

    setFunctions((prev) =>
      prev.map((f) => {
        if (type === "input" && f.id === functionId) {
          // Remove incoming connection
          return { ...f, previousFunction: undefined };
        } else if (type === "output" && f.id === functionId) {
          // Remove outgoing connection
          return { ...f, nextFunction: undefined };
        } else if (type === "output" && f.nextFunction === functionId) {
          // Remove connection where this function is the target
          return { ...f, nextFunction: undefined };
        } else if (type === "input" && f.previousFunction === functionId) {
          // Remove connection where this function is the source
          return { ...f, previousFunction: undefined };
        }
        return f;
      })
    );
  };

  // Add equation validation function
  const validateEquation = (equation: string): boolean => {
    // Allow numbers, x, basic operators (+,-,*,/), exponent (^), and spaces
    const validPattern = /^[0-9x\s\+\-\*\/\^()\.]+$/;
    return validPattern.test(equation);
  };

  // Add function to handle equation changes
  const handleEquationChange = (functionId: number, newEquation: string) => {
    if (validateEquation(newEquation)) {
      setFunctions((prev) =>
        prev.map((f) =>
          f.id === functionId ? { ...f, equation: newEquation } : f
        )
      );
    }
  };

  // Add this function to handle dropdown changes
  const handleNextFunctionChange = (sourceId: number, targetId: string) => {
    // Convert targetId to number (-1 for final output, or function id)
    const targetIdNum = parseInt(targetId);

    // If selecting "none" option, remove the connection
    if (targetId === "") {
      setFunctions((prev) =>
        prev.map((f) => {
          if (f.id === sourceId) {
            return { ...f, nextFunction: undefined };
          }
          // Also remove any previous connection to this function
          if (f.previousFunction === sourceId) {
            return { ...f, previousFunction: undefined };
          }
          return f;
        })
      );
      return;
    }

    // Check for invalid connections
    const sourceFunc = functions.find((f) => f.id === sourceId);
    const targetFunc = functions.find((f) => f.id === targetIdNum);

    // Don't allow self-connection
    if (sourceId === targetIdNum) {
      return;
    }

    // Don't allow circular connections
    let currentId = targetIdNum;
    let visited = new Set([sourceId]);
    while (currentId > 0) {
      if (visited.has(currentId)) {
        return; // Circular dependency detected
      }
      visited.add(currentId);
      currentId = functions.find((f) => f.id === currentId)?.nextFunction || 0;
    }

    // Don't allow connection if target already has an input
    if (targetIdNum > 0 && targetFunc?.previousFunction !== undefined) {
      return;
    }

    // Don't allow connection if source already has an output
    if (sourceFunc?.nextFunction !== undefined) {
      return;
    }

    // Update the connections
    setFunctions((prev) =>
      prev.map((f) => {
        if (f.id === sourceId) {
          return { ...f, nextFunction: targetIdNum };
        }
        if (targetIdNum > 0 && f.id === targetIdNum) {
          return { ...f, previousFunction: sourceId };
        }
        return f;
      })
    );
  };

  // Add this component inside Workflow but before the return statement
  const CustomDropdown = ({
    functionId,
    currentValue,
    onSelect,
  }: {
    functionId: number;
    currentValue?: number;
    onSelect: (value: string) => void;
  }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setOpenDropdownId(null);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Get available connections
    const availableConnections = [
      { value: "", label: "None" },
      ...functions
        .filter((f) => {
          if (f.id === functionId) return false;
          if (
            f.previousFunction !== undefined &&
            f.previousFunction !== functionId
          )
            return false;

          let currentId = f.id;
          let visited = new Set([functionId]);
          while (currentId > 0) {
            if (visited.has(currentId)) return false;
            visited.add(currentId);
            currentId =
              functions.find((ff) => ff.id === currentId)?.nextFunction || 0;
          }
          return true;
        })
        .map((f) => ({
          value: f.id.toString(),
          label: `Function: ${f.id}`,
        })),
      ...(!functions.some((f) => f.nextFunction === -1)
        ? [{ value: "-1", label: "Final Output" }]
        : []),
    ];

    const handleOptionClick = (value: string) => {
      onSelect(value);
      setOpenDropdownId(null);
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdownId(
              openDropdownId === functionId ? null : functionId
            );
          }}
          className="flex justify-between items-center border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 border rounded-md w-full"
        >
          <span className="text-gray-700">
            {currentValue === undefined
              ? "None"
              : currentValue === -1
              ? "Final Output"
              : `Function: ${currentValue}`}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${
              openDropdownId === functionId ? "transform rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {openDropdownId === functionId && (
          <div className="z-50 absolute border-gray-200 bg-white shadow-lg mt-1 border rounded-md w-full max-h-60 overflow-auto">
            {availableConnections.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full text-left px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                  currentValue === Number(option.value) ? "bg-blue-100" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick(option.value);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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
                onClick={(e) => handleDotClick(e, 0, "output")}
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
                    onChange={(e) =>
                      handleEquationChange(func.id, e.target.value)
                    }
                    className="border-gray-200 p-2 border rounded-md w-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-700 text-sm">Next function</label>
                  <CustomDropdown
                    functionId={func.id}
                    currentValue={func.nextFunction}
                    onSelect={(value) =>
                      handleNextFunctionChange(func.id, value)
                    }
                  />
                </div>
                <div className="relative h-5">
                  <div
                    className="top-1/2 -left-1.5 absolute border-2 bg-white hover:bg-blue-100 border-blue-500 rounded-full w-3 h-3 -translate-y-1/2 cursor-pointer input-point"
                    onMouseDown={(e) => handleMouseDown(e, func.id, "input")}
                    onMouseUp={(e) => handleMouseUp(e, func.id, "input")}
                    onClick={(e) => handleDotClick(e, func.id, "input")}
                  />
                  <div
                    className="top-1/2 -right-1.5 absolute border-2 bg-white hover:bg-blue-100 border-blue-500 rounded-full w-3 h-3 -translate-y-1/2 cursor-pointer output-point"
                    onMouseDown={(e) => handleMouseDown(e, func.id, "output")}
                    onMouseUp={(e) => handleMouseUp(e, func.id, "output")}
                    onClick={(e) => handleDotClick(e, func.id, "output")}
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
                onClick={(e) => handleDotClick(e, -1, "input")}
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
