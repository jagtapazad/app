import { useEffect } from "react";

export default function useScrollReveal(ref) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      {
        threshold: 0.15,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref]);
}
