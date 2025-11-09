import { useEffect } from "react";

/**
 * Масштабує внутрішню обгортку (#app-scale) під вікно.
 * Пише --scale і --offsetX у :root, щоб topbar та інші елементи
 * могли синхронно підлаштовуватись.
 */
export const useAutoScale = (baseWidth = 1920, targetId = "app-scale") => {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;

    const apply = () => {
      const vw = window.innerWidth;
      const scale = Math.min(1, vw / baseWidth); // не збільшуємо >1, тільки зменшуємо
      const offsetX = Math.max(0, (vw - baseWidth * scale) / 2);

      // експортуємо змінні для CSS
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty("--scale", String(scale));
      rootStyle.setProperty("--offsetX", `${offsetX}px`);

      // власне масштабування полотна
      el.style.width = `${baseWidth}px`;
      el.style.transformOrigin = "top left";
      el.style.transform = `translateX(${offsetX}px) scale(${scale})`;
    };

    let t: number | undefined;
    const onResize = () => {
      if (t) cancelAnimationFrame(t);
      t = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [baseWidth, targetId]);
};
