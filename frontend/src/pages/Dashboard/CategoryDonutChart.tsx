import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([PieChart, TooltipComponent, CanvasRenderer]);

interface CategoryDatum {
  category: string;
  categoryName: string;
  count: number;
}

const CategoryDonutChart: React.FC<{ data: CategoryDatum[] }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    chart.setOption({
      color: ['#4f46e5', '#818cf8', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'],
      tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 件 ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '50%'],
        minAngle: 8,
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 4 },
        label: { show: true, position: 'outside', formatter: '{name|{b}}\n{percent|{d}%}', rich: { name: { color: '#374151', fontSize: 12, lineHeight: 18 }, percent: { color: '#6366f1', fontSize: 12, fontWeight: 700 } } },
        labelLine: { length: 12, length2: 8, smooth: 0.2 },
        data: data.map((item) => ({ name: item.categoryName, value: item.count })),
      }],
    });
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [data]);

  return <div ref={containerRef} className="h-full min-h-0 w-full" />;
};

export default CategoryDonutChart;
