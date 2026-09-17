import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface Props {
  option: echarts.EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  onEvents?: Record<string, (params: unknown) => void>;
}

export function EChart({ option, className, style, onEvents }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onEvents) return;
    for (const [evt, handler] of Object.entries(onEvents)) {
      chart.on(evt, handler);
    }
    return () => {
      for (const evt of Object.keys(onEvents)) chart.off(evt);
    };
  }, [onEvents]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
