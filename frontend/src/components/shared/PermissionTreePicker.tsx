import React, { useMemo } from 'react';
import { Checkbox } from 'antd';
import type { PermissionItem } from '../../services/api/index';

interface PermissionTreePickerProps {
  catalog: PermissionItem[];
  value: string[];
  onChange: (value: string[]) => void;
  title?: string;
}

const levelLabels: Record<PermissionItem['level'], string> = {
  primary: '一级菜单',
  secondary: '二级菜单',
  page: '功能页面',
  button: '按钮',
};

const PermissionLevelTag = ({ level }: { level: PermissionItem['level'] }) => (
  <span className={`inline-flex h-5 min-w-[4.5rem] items-center justify-center rounded px-1.5 text-xs leading-none ${level === 'page' ? 'bg-blue-50 text-blue-600' : level === 'button' ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary'}`}>
    {levelLabels[level]}
  </span>
);

export const PermissionTreePicker: React.FC<PermissionTreePickerProps> = ({ catalog, value, onChange, title = '菜单与功能权限' }) => {
  const childrenByParent = useMemo(() => {
    const result = new Map<string | null, PermissionItem[]>();
    catalog.forEach(item => result.set(item.parentKey, [...(result.get(item.parentKey) || []), item]));
    return result;
  }, [catalog]);

  const descendants = (key: string): PermissionItem[] => (childrenByParent.get(key) || []).flatMap(item => [item, ...descendants(item.key)]);
  const selection = new Set(value);
  const stateOf = (key: string) => {
    const childKeys = descendants(key).map(item => item.key);
    const selectedCount = childKeys.filter(child => selection.has(child)).length;
    return { checked: selection.has(key) && selectedCount === childKeys.length, indeterminate: selectedCount > 0 && selectedCount < childKeys.length };
  };
  const toggle = (item: PermissionItem, checked: boolean) => {
    const selected = new Set(value);
    const branch = [item, ...descendants(item.key)];
    if (checked) {
      branch.forEach(node => selected.add(node.key));
      let current = item;
      while (current.parentKey) {
        selected.add(current.parentKey);
        current = catalog.find(node => node.key === current.parentKey) || current;
        if (current.key === item.key) break;
      }
    } else {
      branch.forEach(node => selected.delete(node.key));
      let parentKey = item.parentKey;
      while (parentKey) {
        if (!descendants(parentKey).some(node => selected.has(node.key))) selected.delete(parentKey);
        parentKey = catalog.find(node => node.key === parentKey)?.parentKey || null;
      }
    }
    onChange(catalog.filter(node => selected.has(node.key)).map(node => node.key));
  };
  const allSelected = catalog.length > 0 && catalog.every(item => selection.has(item.key));

  return <div>
    <div className="mb-3 flex items-center justify-between">
      <div><span className="text-sm font-medium">{title}</span><span className="ml-2 text-xs text-muted-foreground">已选 {value.length} 项</span></div>
      <button type="button" onClick={() => onChange(allSelected ? [] : catalog.map(item => item.key))} className="text-xs text-primary">{allSelected ? '取消全选' : '全选'}</button>
    </div>
    <div className="max-h-[440px] space-y-3 overflow-auto rounded-xl border border-border bg-secondary/20 p-4">
      {(childrenByParent.get(null) || []).map(primary => {
        const primaryState = stateOf(primary.key);
        const directLeaves = (childrenByParent.get(primary.key) || []).filter(item => item.level === 'page' || item.level === 'button');
        return <section key={primary.key} className="rounded-xl border border-border bg-white p-4">
          <Checkbox className="items-center" checked={primaryState.checked} indeterminate={primaryState.indeterminate} onChange={event => toggle(primary, event.target.checked)}>
            <span className="inline-flex items-center gap-2 text-sm font-normal"><span>{primary.label}</span><PermissionLevelTag level="primary"/></span>
          </Checkbox>
          {directLeaves.length > 0 && <div className="mt-3 grid gap-2 pl-6 sm:grid-cols-2 xl:grid-cols-3">
            {directLeaves.map(leaf => <div key={leaf.key} className="rounded-lg border border-border/70 bg-secondary/20 px-2.5 py-2">
              <Checkbox className="items-center" checked={selection.has(leaf.key)} onChange={event => toggle(leaf, event.target.checked)}>
                <span className="inline-flex items-center gap-2 text-sm font-normal"><span>{leaf.label}</span><PermissionLevelTag level={leaf.level}/></span>
              </Checkbox>
            </div>)}
          </div>}
          <div className="mt-3 space-y-4 border-l-2 border-primary/10 pl-5">
            {(childrenByParent.get(primary.key) || []).filter(item => item.level === 'secondary').map(secondary => {
              const secondaryState = stateOf(secondary.key);
              return <div key={secondary.key}>
                <Checkbox className="items-center" checked={secondaryState.checked} indeterminate={secondaryState.indeterminate} onChange={event => toggle(secondary, event.target.checked)}>
                  <span className="inline-flex items-center gap-2 text-sm font-normal"><span>{secondary.label}</span><PermissionLevelTag level="secondary"/></span>
                </Checkbox>
                <div className="mt-2 grid gap-2 pl-6 sm:grid-cols-2 xl:grid-cols-3">
                  {(childrenByParent.get(secondary.key) || []).map(leaf => <div key={leaf.key} className="rounded-lg border border-border/70 bg-secondary/20 px-2.5 py-2">
                    <Checkbox className="items-center" checked={selection.has(leaf.key)} onChange={event => toggle(leaf, event.target.checked)}>
                      <span className="inline-flex items-center gap-2 text-sm font-normal"><span>{leaf.label}</span><PermissionLevelTag level={leaf.level}/></span>
                    </Checkbox>
                  </div>)}
                </div>
              </div>;
            })}
          </div>
        </section>;
      })}
    </div>
  </div>;
};
