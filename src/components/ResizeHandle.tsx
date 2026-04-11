import { useCallback, useRef, useEffect, useState } from "react";

interface ResizeHandleProps {
  side: "left" | "right"; // which panel's width we're controlling
  initialSize: number;
  minSize?: number;
  maxSize?: number;
  onResize: (size: number) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  side,
  initialSize,
  minSize = 120,
  maxSize = 600,
  onResize,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartSize = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartSize.current = initialSize;
    },
    [initialSize]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const delta = side === "left" ? e.clientX - dragStartX.current : dragStartX.current - e.clientX;
      const newSize = Math.max(minSize, Math.min(maxSize, dragStartSize.current + delta));
      onResize(newSize);
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, side, minSize, maxSize, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`relative cursor-col-resize flex-shrink-0 ${
        isDragging ? "bg-brand-500/40" : ""
      }`}
      style={{ width: 0 }}
    >
      <div
        className={`absolute inset-y-0 -left-[2px] w-[5px] hover:bg-brand-500/30 transition-colors ${
          isDragging ? "bg-brand-500/40" : ""
        }`}
      />
    </div>
  );
};
