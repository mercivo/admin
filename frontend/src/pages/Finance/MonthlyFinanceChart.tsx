import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

interface MonthlyFinanceRow {
  monthLabel: string;
  salesAmount: number;
  purchaseAmount: number;
  receiptAmount: number;
  paymentAmount: number;
}

const currency = (value: number) =>
  `¥${Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const barData = (values: number[]) =>
  values.map((value) => ({
    value,
    itemStyle: {
      borderRadius: value < 0 ? [0, 0, 6, 6] : [6, 6, 0, 0],
    },
  }));

const MonthlyFinanceChart: React.FC<{ data: MonthlyFinanceRow[] }> = ({
  data,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, {
      renderer: "canvas",
    });
    const styles = getComputedStyle(document.documentElement);
    const foreground = styles.getPropertyValue("--foreground").trim() || "#374151";
    const border = styles.getPropertyValue("--border").trim() || "#e5e7eb";
    chart.setOption({
      animationDuration: 450,
      color: ["#7c5cff", "#2f7df6", "#52c41a", "#fa8c16"],
      grid: { left: 18, right: 20, top: 24, bottom: 48, containLabel: true },
      legend: {
        bottom: 0,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { color: foreground, fontSize: 12 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (value: unknown) => currency(Number(value || 0)),
      },
      xAxis: {
        type: "category",
        data: data.map((item) => item.monthLabel),
        axisTick: { show: false },
        axisLine: { show: true, onZero: true, lineStyle: { color: border } },
        axisLabel: { color: foreground },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: border, type: "dashed", opacity: 0.75 } },
        axisLabel: {
          color: foreground,
          formatter: (value: number) =>
            Math.abs(value) >= 10000
              ? `${Number((value / 10000).toFixed(1))}万`
              : String(value),
        },
      },
      series: [
        {
          name: "销售额",
          type: "bar",
          data: barData(data.map((item) => item.salesAmount)),
          barMaxWidth: 30,
        },
        {
          name: "采购额",
          type: "bar",
          data: barData(data.map((item) => item.purchaseAmount)),
          barMaxWidth: 30,
        },
        {
          name: "已确认收款",
          type: "bar",
          data: barData(data.map((item) => item.receiptAmount)),
          barMaxWidth: 30,
        },
        {
          name: "已确认付款",
          type: "bar",
          data: barData(data.map((item) => item.paymentAmount)),
          barMaxWidth: 30,
        },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data]);

  return <div ref={containerRef} className="h-full w-full" />;
};

export default MonthlyFinanceChart;
