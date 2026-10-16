import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

interface TrendDatum {
  month: string;
  label: string;
  sales: number;
  purchases: number;
}

const OrderTrendChart: React.FC<{ data: TrendDatum[] }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    const styles = getComputedStyle(document.documentElement);
    const foreground = styles.getPropertyValue('--foreground').trim() || '#374151';
    const border = styles.getPropertyValue('--border').trim() || '#e5e7eb';
    chart.setOption({
      animationDuration: 450,
      color: ['#4f46e5', '#0ea5e9'],
      grid: { left: 12, right: 22, top: 18, bottom: 48, containLabel: true },
      legend: { bottom: 0, itemWidth: 20, itemHeight: 3, textStyle: { color: foreground, fontSize: 12 } },
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'line', snap: true, lineStyle: { color: '#94a3b8', type: 'dashed' } },
        valueFormatter: (value: unknown) => `${Number(value || 0)} 单`,
      },
      xAxis: { type: 'category', boundaryGap: false, data: data.map((item) => item.label), axisTick: { show: false }, axisLine: { lineStyle: { color: border } }, axisLabel: { color: foreground, fontSize: 11 } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: foreground, formatter: '{value} 单' }, splitLine: { lineStyle: { color: border, type: 'dashed', opacity: 0.75 } } },
      series: [
        { name: '销售订单', type: 'line', smooth: 0.35, symbol: 'circle', symbolSize: 7, showSymbol: false, emphasis: { focus: 'series', scale: 1.5 }, lineStyle: { width: 3 }, areaStyle: { opacity: 0.06 }, data: data.map((item) => item.sales) },
        { name: '采购订单', type: 'line', smooth: 0.35, symbol: 'circle', symbolSize: 7, showSymbol: false, emphasis: { focus: 'series', scale: 1.5 }, lineStyle: { width: 3, type: 'dashed' }, data: data.map((item) => item.purchases) },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [data]);

  return <div ref={containerRef} className="h-full min-h-0 w-full" />;
};

export default OrderTrendChart;
