import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export interface TenantGrowthDatum {
  month: string;
  count: number;
  cumulative: number;
}

const TenantGrowthChart: React.FC<{ data: TenantGrowthDatum[] }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    const styles = getComputedStyle(document.documentElement);
    const foreground = styles.getPropertyValue('--foreground').trim() || '#374151';
    const muted = styles.getPropertyValue('--muted-foreground').trim() || '#64748b';
    const border = styles.getPropertyValue('--border').trim() || '#e5e7eb';
    chart.setOption({
      animationDuration: 450,
      color: ['#4f46e5', '#0ea5e9'],
      grid: { left: 12, right: 12, top: 18, bottom: 48, containLabel: true },
      legend: { bottom: 0, itemWidth: 20, itemHeight: 3, textStyle: { color: foreground, fontSize: 12 } },
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'line', snap: true, lineStyle: { color: '#94a3b8', type: 'dashed' } },
        valueFormatter: (value: unknown) => `${Number(value || 0)} 家`,
      },
      xAxis: {
        type: 'category', boundaryGap: false, data: data.map(item => item.month),
        axisTick: { show: false }, axisLine: { lineStyle: { color: border } },
        axisLabel: { color: muted, fontSize: 11, formatter: (value: string) => value.slice(5) },
      },
      yAxis: {
        type: 'value', min: 0, minInterval: 1,
        axisLabel: { color: muted, formatter: '{value} 家' },
        splitLine: { lineStyle: { color: border, type: 'dashed', opacity: 0.75 } },
      },
      series: [
        { name: '新增租户', type: 'line', smooth: 0.3, symbol: 'circle', symbolSize: 7, showSymbol: false, emphasis: { focus: 'series', scale: 1.5 }, lineStyle: { width: 3 }, areaStyle: { opacity: 0.06 }, data: data.map(item => item.count) },
        { name: '累计租户', type: 'line', smooth: 0.3, symbol: 'circle', symbolSize: 7, showSymbol: false, emphasis: { focus: 'series', scale: 1.5 }, lineStyle: { width: 3, type: 'dashed' }, data: data.map(item => item.cumulative) },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [data]);

  return <div ref={containerRef} data-testid="tenant-growth-chart" className="h-full min-h-0 w-full" />;
};

export default TenantGrowthChart;
