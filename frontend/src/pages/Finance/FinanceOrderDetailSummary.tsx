import React from "react";
import { Tag } from "antd";
import dayjs from "dayjs";
import type { FinanceOrderDetail } from "../../services/api/index";

const displayValue = (value?: React.ReactNode) =>
  value === null || value === undefined || value === "" ? "-" : value;

const money = (value: number, currency = "CNY") =>
  `${currency} ${Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface FinanceOrderDetailSummaryProps {
  order: FinanceOrderDetail;
  isReceipt: boolean;
}

/** 收付款新增与查看共用的关联订单摘要，保证字段口径和展示始终一致。 */
const FinanceOrderDetailSummary: React.FC<FinanceOrderDetailSummaryProps> = ({
  order,
  isReceipt,
}) => (
  <section className="overflow-hidden rounded-xl border border-border bg-secondary/20 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-card/70 px-4 py-4">
      <div>
        <div className="font-semibold leading-5 text-foreground">{order.orderNo}</div>
        <div className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {isReceipt ? "客户" : "供应商"}：{order.partnerName} · 下单日期：
          {dayjs(order.orderDate).format("YYYY-MM-DD")}
          {order.fulfillmentDate
            ? ` · ${isReceipt ? "交付" : "预计到货"}：${dayjs(order.fulfillmentDate).format("YYYY-MM-DD")}`
            : ""}
        </div>
      </div>
      <Tag color="blue" className="m-0">
        {order.items.length} 项商品
      </Tag>
    </div>

    <div className="grid gap-4 border-b border-border px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <span className="text-xs text-muted-foreground">订单总额</span>
        <div className="mt-1.5 font-semibold leading-5">{money(order.orderAmount, order.currency)}</div>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">{isReceipt ? "优惠金额" : "税额"}</span>
        <div className="mt-1.5 font-semibold leading-5">{money(isReceipt ? order.discountAmount : order.taxAmount, order.currency)}</div>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">{isReceipt ? "应收金额" : "应付金额"}</span>
        <div className="mt-1.5 font-semibold leading-5 text-primary">{money(order.totalAmount, order.currency)}</div>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">{isReceipt ? "出库仓库" : "入库仓库"}</span>
        <div className="mt-1.5 font-semibold leading-5">{displayValue(order.warehouseName)}</div>
      </div>
    </div>

    <div className="max-h-72 overflow-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-secondary">
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">商品</th>
            <th className="px-4 py-3 font-medium">SKU / 规格</th>
            <th className="px-4 py-3 text-right font-medium">数量</th>
            <th className="px-4 py-3 text-right font-medium">金额</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {order.items.map((item) => (
            <tr key={item.id} className="bg-card/40 align-middle transition-colors hover:bg-card/70">
              <td className="px-4 py-4 font-medium leading-5 text-foreground">{displayValue(item.productName)}</td>
              <td className="px-4 py-4 leading-5 text-muted-foreground">
                {displayValue(item.productSku)} / {displayValue(item.variantLabel)}
              </td>
              <td className="px-4 py-4 text-right tabular-nums">{item.quantity}</td>
              <td className="px-4 py-4 text-right font-medium tabular-nums">{money(item.amount, order.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {order.items.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">暂无商品明细</div>
      )}
    </div>
  </section>
);

export default FinanceOrderDetailSummary;
