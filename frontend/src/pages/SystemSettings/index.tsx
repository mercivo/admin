import React, { useEffect, useRef, useState } from "react";
import { Input, InputNumber, Select, Switch, message } from "antd";
import { BellRing, Coins, Store, Trash2 } from "lucide-react";
import { AppEditableTable, PageContent, PageHeader, TableActionButton, TableAddRowButton } from "../../components/shared";
import { workspaceApi } from "../../services/api/index";
import { DEFAULT_SALES_CONFIG, DEFAULT_SYSTEM_CONFIG, type CurrencyOption, type SalesConfig, type SystemConfig } from "../../config/sales";

type SaveState = "loading" | "saved" | "saving" | "error";

const SystemSettingsPage: React.FC = () => {
  const [sales, setSales] = useState<SalesConfig>(DEFAULT_SALES_CONFIG);
  const [system, setSystem] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const salesSaved = useRef("");
  const systemSaved = useRef("");

  useEffect(() => {
    void Promise.all([workspaceApi.getConfig<Partial<SalesConfig>>("currency"), workspaceApi.getConfig<Partial<SystemConfig>>("system")])
      .then(([salesValue, systemValue]) => {
        const nextSales = { ...DEFAULT_SALES_CONFIG, ...salesValue, currencies: salesValue.currencies?.length ? salesValue.currencies : DEFAULT_SALES_CONFIG.currencies };
        const nextSystem = { inventoryWarning: { ...DEFAULT_SYSTEM_CONFIG.inventoryWarning, ...systemValue.inventoryWarning }, storefront: { ...DEFAULT_SYSTEM_CONFIG.storefront, ...systemValue.storefront } };
        salesSaved.current = JSON.stringify(nextSales); systemSaved.current = JSON.stringify(nextSystem);
        setSales(nextSales); setSystem(nextSystem); setSaveState("saved");
      }).catch(() => { setSaveState("error"); message.error("系统设置加载失败"); });
  }, []);

  useEffect(() => {
    if (saveState === "loading" || JSON.stringify(system) === systemSaved.current) return;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try { const saved = await workspaceApi.updateConfig<SystemConfig>("system", system); systemSaved.current = JSON.stringify(saved); setSystem(saved); setSaveState("saved"); }
      catch { setSaveState("error"); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [system]);

  useEffect(() => {
    if (saveState === "loading" || JSON.stringify(sales) === salesSaved.current) return;
    const normalized = sales.currencies.map(item => ({ ...item, code: item.code.trim().toUpperCase(), name: item.name.trim(), symbol: item.symbol.trim() }));
    const valid = normalized.length > 0 && normalized.every(item => /^[A-Z]{3}$/.test(item.code) && item.name && item.symbol) && new Set(normalized.map(item => item.code)).size === normalized.length && normalized.some(item => item.enabled);
    if (!valid) return;
    const defaultCurrency = normalized.some(item => item.code === sales.defaultCurrency && item.enabled) ? sales.defaultCurrency : normalized.find(item => item.enabled)!.code;
    const purchaseDefaultCurrency = normalized.some(item => item.code === sales.purchaseDefaultCurrency && item.enabled) ? sales.purchaseDefaultCurrency : defaultCurrency;
    const salesDefaultCurrency = normalized.some(item => item.code === sales.salesDefaultCurrency && item.enabled) ? sales.salesDefaultCurrency : defaultCurrency;
    const value = { currencies: normalized, defaultCurrency, purchaseDefaultCurrency, salesDefaultCurrency };
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try { const saved = await workspaceApi.updateConfig<SalesConfig>("currency", value); salesSaved.current = JSON.stringify(saved); setSales(saved); setSaveState("saved"); }
      catch { setSaveState("error"); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [sales]);

  const updateCurrency = (index: number, value: Partial<CurrencyOption>) => setSales(current => ({ ...current, currencies: current.currencies.map((item, i) => i === index ? { ...item, ...value } : item) }));
  const section = "rounded-2xl border border-border bg-card p-4 shadow-sm";
  const row = "flex min-h-14 items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0";
  const heading = (icon: React.ReactNode, title: string, description: string) => <div className="mb-3 flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div><div className="min-w-0"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div></div>;

  return <PageContent>
    <PageHeader title="系统设置" description="修改后自动保存" action={<span className={`text-xs ${saveState === "error" ? "text-red-500" : "text-muted-foreground"}`}>{saveState === "saving" ? "正在保存…" : saveState === "error" ? "自动保存失败，请重试" : saveState === "saved" ? "已自动保存" : "加载中…"}</span>} />
    <div className="grid items-start gap-4 xl:grid-cols-2">
    <section className={section}>
      {heading(<BellRing size={19} />, "库存预警", "设置低库存提醒")}
      <div className={row}><div><div className="text-sm font-medium">启用库存预警</div><div className="mt-1 text-xs text-muted-foreground">关闭后不再标记低库存</div></div><Switch checked={system.inventoryWarning.enabled} onChange={enabled => setSystem(current => ({ ...current, inventoryWarning: { ...current.inventoryWarning, enabled } }))} /></div>
      <div className={row}><div><div className="text-sm font-medium">预警阈值</div><div className="mt-1 text-xs text-muted-foreground">达到该数量时预警</div></div><InputNumber min={0} max={999999} precision={0} disabled={!system.inventoryWarning.enabled} value={system.inventoryWarning.threshold} addonAfter="件" onChange={value => setSystem(current => ({ ...current, inventoryWarning: { ...current.inventoryWarning, threshold: Number(value ?? 0) } }))} /></div>
    </section>
    <section className={section}>
      {heading(<Store size={19} />, "游客访问与价格", "设置游客访问和价格显示")}
      <div className={row}><div><div className="text-sm font-medium">允许游客访问</div><div className="mt-1 text-xs text-muted-foreground">关闭后游客只能登录</div></div><Switch checked={system.storefront.guestAccessEnabled} onChange={guestAccessEnabled => setSystem(current => ({ ...current, storefront: { ...current.storefront, guestAccessEnabled } }))} /></div>
      <div className={row}>
        <div><div className="text-sm font-medium">游客价格策略</div><div className="mt-1 text-xs text-muted-foreground">登录客户仍使用等级价</div></div>
        <div className="flex shrink-0 items-center gap-2">
          <Select className="w-44" value={system.storefront.guestPriceMode} onChange={guestPriceMode => setSystem(current => ({ ...current, storefront: { ...current.storefront, guestPriceMode } }))} options={[{ value: "base", label: "显示基础价" }, { value: "hidden", label: "不显示价格" }, { value: "percentage", label: "按基础价百分比" }]} />
          {system.storefront.guestPriceMode === "percentage" && <InputNumber className="w-36" min={0} max={1000} precision={2} aria-label="基础价百分比" value={system.storefront.guestPricePercentage} addonAfter="%" onChange={value => setSystem(current => ({ ...current, storefront: { ...current.storefront, guestPricePercentage: Number(value ?? 0) } }))} />}
        </div>
      </div>
    </section>
    <section className={`${section} xl:col-span-2`}>
      {heading(<Coins size={19} />, "通用币种", "维护可用币种和默认币种")}
      <AppEditableTable rowKey={(_, index) => index} dataSource={sales.currencies} emptyText="暂无币种，请添加币种" columns={[{ title: "币种编码", width: 180 }, { title: "币种名称" }, { title: "货币符号", width: 180 }, { title: "启用", width: 100 }, { title: "默认", width: 100 }, { title: "", width: 56, className: "text-center" }]} renderRow={(item, index) => [
        <Input value={item.code} maxLength={3} placeholder="如 CNY" variant="borderless" onChange={event => updateCurrency(index, { code: event.target.value.toUpperCase() })} />,
        <Input value={item.name} placeholder="如 人民币" variant="borderless" onChange={event => updateCurrency(index, { name: event.target.value })} />,
        <Input value={item.symbol} placeholder="如 ¥" variant="borderless" onChange={event => updateCurrency(index, { symbol: event.target.value })} />,
        <Switch checked={item.enabled} onChange={enabled => updateCurrency(index, { enabled })} />,
        <input type="radio" name="default-currency" aria-label={`设 ${item.code} 为默认币种`} disabled={!item.enabled} checked={sales.defaultCurrency === item.code} onChange={() => setSales(current => ({ ...current, defaultCurrency: item.code }))} />,
        <TableActionButton title="删除币种" tone="danger" onClick={() => setSales(current => ({ ...current, currencies: current.currencies.filter((_, i) => i !== index) }))}><Trash2 size={15} /></TableActionButton>,
      ]} />
      <TableAddRowButton onClick={() => setSales(current => ({ ...current, currencies: [...current.currencies, { code: "", name: "", symbol: "", enabled: true }] }))}>添加币种</TableAddRowButton>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[{ key: "defaultCurrency", label: "商品价格默认币种" }, { key: "purchaseDefaultCurrency", label: "采购订单默认币种" }, { key: "salesDefaultCurrency", label: "销售订单默认币种" }].map(item => <label key={item.key} className="space-y-1"><span className="text-xs text-muted-foreground">{item.label}</span><Select className="w-full" value={sales[item.key as keyof Pick<SalesConfig, 'defaultCurrency' | 'purchaseDefaultCurrency' | 'salesDefaultCurrency'>]} options={sales.currencies.filter(currency => currency.enabled).map(currency => ({ value: currency.code, label: `${currency.code} · ${currency.name}` }))} onChange={value => setSales(current => ({ ...current, [item.key]: value }))} /></label>)}
      </div>
    </section>
    </div>
  </PageContent>;
};
export default SystemSettingsPage;
