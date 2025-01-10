import SixDots from "@/assets/icons/SixDots";
import { COLORS, FUNCTION_DEFAULTS } from "@/constants/workflow";
import { SVGDimensions } from "@/types/workflow";
import { createPath } from "@/utils/workflow";
import Image from "next/image";
import background from "@/assets/background/pattern.png";
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

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const FIXED_EXECUTION_ORDER = {
  1: 2, // Function 1 can only connect to Function 2
  2: 4, // Function 2 can only connect to Function 4
  4: 5, // Function 4 can only connect to Function 5
  5: 3, // Function 5 can only connect to Function 3
  3: -1, // Function 3 can only connect to Final Output
};

const evaluateExpression = (expression: string, x: number): number => {
  try {
    // First replace x^2 with x**2 for JavaScript math
    let jsExpression = expression.replace(/x\^(\d+)/g, "x**$1");

    // Handle implicit multiplication (like 2x) by adding *
    jsExpression = jsExpression.replace(/(\d)x/g, "$1*x");

    // Then replace x with the number
    jsExpression = jsExpression.replace(/x/g, `${x}`);

    // Create a safe function to evaluate the expression
    const mathFunction = new Function("return " + jsExpression);
    const result = mathFunction();

    console.log(`Expression: ${expression}, x: ${x}, evaluated: ${result}`);
    return Number(result.toFixed(2));
  } catch (error) {
    console.error("Error evaluating expression:", error);
    return 0;
  }
};

// Move CustomDropdown outside of Workflow component
const CustomDropdown = ({
  functionId,
  currentValue,
  onSelect,
  openDropdownId,
  setOpenDropdownId,
  functions,
}: {
  functionId: number;
  currentValue?: number;
  onSelect: (value: string) => void;
  openDropdownId: number | null;
  setOpenDropdownId: (id: number | null) => void;
  functions: Function[];
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allowedNextFunction =
    FIXED_EXECUTION_ORDER[functionId as keyof typeof FIXED_EXECUTION_ORDER];

  const availableConnections: DropdownOption[] = [
    {
      value: "",
      label: "None",
      disabled: functionId === 1,
    },
    ...functions
      .filter((f) => f.id !== functionId)
      .map((f) => ({
        value: f.id.toString(),
        label: `Function: ${f.id}`,
        disabled: allowedNextFunction !== f.id,
      })),
  ];

  if (!functions.some((f) => f.nextFunction === -1)) {
    availableConnections.push({
      value: "-1",
      label: "Final Output",
      disabled: allowedNextFunction !== -1,
    });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger button */}
      <div
        onClick={() =>
          setOpenDropdownId(openDropdownId === functionId ? null : functionId)
        }
        className="flex justify-between items-center border-[#D3D3D3] bg-white hover:bg-gray-50 px-3 py-2 border rounded-lg w-full font-medium text-xs cursor-pointer"
      >
        <span className="text-gray-700">
          {currentValue === undefined
            ? "None"
            : currentValue === -1
            ? "Final Output"
            : `Function: ${currentValue}`}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${
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
      </div>

      {/* Dropdown menu */}
      {openDropdownId === functionId && (
        <div
          className="z-[9999] absolute border-[#D3D3D3] bg-white shadow-lg mt-1 border rounded-lg w-full max-h-60 overflow-auto"
          style={{
            minWidth: "200px",
            position: "absolute",
            top: "100%",
            left: 0,
          }}
        >
          {availableConnections.map((option) => (
            <div
              key={option.value}
              className={`px-4 py-2 text-xs font-medium ${
                option.disabled
                  ? "cursor-not-allowed text-gray-400 bg-gray-50"
                  : "cursor-pointer hover:bg-blue-50"
              } ${currentValue === Number(option.value) ? "bg-blue-100" : ""}`}
              onClick={() => {
                if (!option.disabled) {
                  onSelect(option.value);
                  setOpenDropdownId(null);
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Workflow() {
  const [functions, setFunctions] = useState<Function[]>([
    { id: 1, equation: "x^2", previousFunction: 0, nextFunction: 2 },
    { id: 2, equation: "2x+4", previousFunction: 1, nextFunction: 4 },
    { id: 3, equation: "x^2+20", previousFunction: 5, nextFunction: -1 },
    { id: 4, equation: "x-2", previousFunction: 2, nextFunction: 5 },
    { id: 5, equation: "x/2", previousFunction: 4, nextFunction: 3 },
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [initialValue, setInitialValue] = useState(2);
  const [finalOutput, setFinalOutput] = useState(0);

  // Add state for SVG dimensions
  const [svgDimensions, setSvgDimensions] = useState<SVGDimensions>({
    width: 0,
    height: 0,
  });

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
        targetElement =
          Array.from(boxes).find(
            (b) =>
              parseInt(b.getAttribute("data-id") || "0") ===
              sourceFunc.nextFunction
          ) || null;
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

  // Add this function to calculate the final output
  const calculateOutput = useCallback(() => {
    let currentValue = initialValue;
    let currentFunctionId: number | undefined = functions.find(
      (f) => f.previousFunction === 0
    )?.id;

    console.log("Starting calculation with initial value:", currentValue);

    while (currentFunctionId && currentFunctionId > 0) {
      const currentFunction = functions.find((f) => f.id === currentFunctionId);
      if (!currentFunction) break;

      console.log(
        `Processing Function ${currentFunctionId}:`,
        currentFunction.equation
      );
      currentValue = evaluateExpression(currentFunction.equation, currentValue);
      console.log(`Result after Function ${currentFunctionId}:`, currentValue);

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
    // If "None" is selected, remove connections
    if (targetId === "") {
      setFunctions((prev) =>
        prev.map((f) => {
          if (f.id === sourceId) {
            return { ...f, nextFunction: undefined };
          }
          if (f.previousFunction === sourceId) {
            return { ...f, previousFunction: undefined };
          }
          return f;
        })
      );
      return;
    }

    const targetIdNum = parseInt(targetId);

    // Handle connections similar to dot connections
    setFunctions((prev) => {
      // First check if the connection is valid
      const isValid = prev.every((f) => {
        // Don't allow self-connection
        if (sourceId === targetIdNum) return false;

        // Don't allow if target already has an input (except when it's the current connection)
        if (
          targetIdNum > 0 &&
          f.id === targetIdNum &&
          f.previousFunction !== undefined &&
          f.previousFunction !== sourceId
        ) {
          return false;
        }

        return true;
      });

      if (!isValid) return prev;

      // Check for circular dependency
      let currentId = targetIdNum;
      const visited = new Set([sourceId]);
      while (currentId > 0) {
        if (visited.has(currentId)) return prev; // Circular dependency found
        visited.add(currentId);
        const nextFunc = prev.find((f) => f.id === currentId);
        if (!nextFunc) break;
        currentId = nextFunc.nextFunction || 0;
      }

      // If all checks pass, update the connections
      return prev.map((f) => {
        if (f.id === sourceId) {
          return { ...f, nextFunction: targetIdNum };
        }
        if (targetIdNum > 0 && f.id === targetIdNum) {
          return { ...f, previousFunction: sourceId };
        }
        return f;
      });
    });
  };

  // Add this effect after other effects
  useEffect(() => {
    // Update on window resize
    const handleResize = () => updateDimensionsAndConnections();
    window.addEventListener("resize", handleResize);

    // Update on DOM mutations
    const mutationObserver = new MutationObserver(() => {
      updateDimensionsAndConnections();
    });

    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      mutationObserver.disconnect();
    };
  }, [updateDimensionsAndConnections]);

  return (
    <div
      className="relative flex items-center gap-8 bg-gray-50 p-8 min-h-screen"
      ref={containerRef}
    >
      <div className="top-0 left-0 fixed bg-gray-50 w-full h-full">
        <Image
          src={background}
          alt="Background"
          layout="fill"
          objectFit="cover"
        />
      </div>
      {/* Main content */}
      <div className="relative z-10 flex items-center gap-8 w-full">
        {/* Initial Value */}
        <div className="flex flex-col items-center gap-2 mb-[174px] initial-value">
          <span className="bg-[#F5A524] px-4 py-2 rounded-3xl font-semibold text-white text-xs whitespace-nowrap">
            Initial value of x
          </span>
          <div className="relative flex items-center gap-4 border-[#F5A524] border-2 bg-white shadow-md rounded-2xl">
            <input
              type="number"
              value={initialValue}
              onChange={(e) => setInitialValue(Number(e.target.value))}
              className="pl-4 max-w-[60px] font-bold text-2xl text-gray-800 outline-none"
            />
            <div className="border-[#F5A524] border-l w-10 h-12">
              <div className="top-1/2 right-4 absolute flex bg-blue-500 rounded-full w-2 h-2 -translate-y-1/2 outline outline-[#DBDBDB] outline-2 outline-offset-2 output-point" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-x-40 gap-y-20">
          {functions.map((func) => (
            <div
              key={func.id}
              data-id={func.id}
              className="relative border-[#D3D3D3] bg-white px-5 py-4 border rounded-[15px] w-[250px] function-box"
              style={{
                position: "relative",
                zIndex: openDropdownId === func.id ? 9999 : 1,
              }}
            >
              <div className="flex items-center gap-2 mb-4 font-semibold text-[#A5A5A5] text-sm">
                <SixDots />
                Function: {func.id}
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-gray-700 text-xs">
                    Equation
                  </label>
                  <input
                    type="text"
                    value={func.equation}
                    onChange={(e) =>
                      handleEquationChange(func.id, e.target.value)
                    }
                    className="border-[#D3D3D3] p-2 border rounded-lg w-full font-medium text-xs"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-gray-700 text-xs">
                    Next function
                  </label>
                  <CustomDropdown
                    functionId={func.id}
                    currentValue={func.nextFunction}
                    onSelect={(value) =>
                      handleNextFunctionChange(func.id, value)
                    }
                    openDropdownId={openDropdownId}
                    setOpenDropdownId={setOpenDropdownId}
                    functions={functions}
                  />
                </div>
              </div>
              <div className="relative mt-11 h-5">
                <div className="top-1/2 -left-1.5 absolute flex bg-blue-500 rounded-full w-2 h-2 -translate-y-1/2 input-point outline outline-[#DBDBDB] outline-2 outline-offset-2">
                  <p className="font-medium text-gray-700 text-xs -translate-y-1/2 translate-x-4">
                    input
                  </p>
                </div>
                <div className="top-1/2 -right-1.5 absolute flex bg-blue-500 rounded-full w-2 h-2 -translate-y-1/2 outline outline-[#DBDBDB] outline-2 outline-offset-2 output-point">
                  <p className="font-medium text-gray-700 text-xs -translate-x-[46px] -translate-y-1/2">
                    output
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Final Output */}
        <div className="flex flex-col items-center gap-2 mb-[174px] final-output">
          <span className="bg-[#4CAF79] px-4 py-2 rounded-3xl font-semibold text-white text-xs whitespace-nowrap">
            Final Output y
          </span>
          <div className="relative flex items-center gap-4 border-[#4CAF79] border-2 bg-white shadow-md rounded-2xl">
            <div className="border-[#4CAF79] border-r w-10 h-12">
              <div className="top-1/2 left-3 absolute flex bg-blue-500 rounded-full w-2 h-2 -translate-y-1/2 input-point outline outline-[#DBDBDB] outline-2 outline-offset-2" />
            </div>
            <span className="pr-4 min-w-[60px] font-bold text-2xl text-gray-800">
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
        style={{ zIndex: 50 }}
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
      </svg>
    </div>
  );
}
