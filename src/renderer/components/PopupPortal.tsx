import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PopupPortalProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}

export default function PopupPortal({
  anchorRef,
  onClose,
  width = 280,
  children,
}: PopupPortalProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  // Calculate position from anchor
  useEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) {
      let left = rect.left;
      let top = rect.bottom + 6;
      if (left + width > window.innerWidth - 12) {
        left = window.innerWidth - width - 12;
      }
      const estimatedHeight = 320;
      if (top + estimatedHeight > window.innerHeight - 12) {
        top = rect.top - estimatedHeight - 6;
      }
      setStyle({ left, top, width });
    }
  }, [anchorRef, width]);

  // Close on click outside (use a small delay so the opening click doesn't close it)
  useEffect(() => {
    const id = setTimeout(() => {
      const handler = (e: PointerEvent) => {
        const target = e.target as Node;
        const insidePopup = popupRef.current?.contains(target) ?? false;
        const insideAnchor = anchorRef.current?.contains(target) ?? false;
        if (!insidePopup && !insideAnchor) {
          onClose();
        }
      };
      document.addEventListener("pointerdown", handler);
      return () => document.removeEventListener("pointerdown", handler);
    }, 50);
    return () => clearTimeout(id);
  }, [onClose, anchorRef]);

  return createPortal(
    <>
      <div className="popup-overlay" />
      <div ref={popupRef} className="popup-box" style={style}>
        {children}
      </div>
    </>,
    document.body
  );
}
