import { useEffect } from "react";

export const useScrollLock = () => {
      useEffect(() => {
            // Get the original body overflow and padding
            const originalStyle = window.getComputedStyle(document.body);
            const originalOverflow = originalStyle.overflow;
            const originalPaddingRight = originalStyle.paddingRight;

            // Get width of scrollbar
            const scrollBarWidth =
                  window.innerWidth - document.documentElement.clientWidth;

            // Prevent scroll
            document.body.style.overflow = "hidden";
            // Add padding right to prevent content shift
            document.body.style.paddingRight = `${scrollBarWidth}px`;

            // Cleanup function to restore original styles
            return () => {
                  document.body.style.overflow = originalOverflow;
                  document.body.style.paddingRight = originalPaddingRight;
            };
      }, []); // Empty dependency array means this effect runs once on mount
};
