import { LockKeyhole } from "lucide-react";

interface WarehouseSelectOptionProps {
  name: string;
  isLocked?: boolean;
  activeCountDocumentNo?: string | null;
}

/** Shared warehouse option content used by inventory-affecting order forms. */
export const WarehouseSelectOption = ({
  name,
  isLocked = false,
  activeCountDocumentNo,
}: WarehouseSelectOptionProps) => (
  <span className="flex min-w-0 items-center gap-1.5">
    <span className="truncate">{name}</span>
    {isLocked && (
      <span
        className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
        title={
          activeCountDocumentNo
            ? `盘点中：${activeCountDocumentNo}`
            : "盘点中，仓库已锁定"
        }
      >
        <LockKeyhole aria-hidden="true" size={13} />
        盘点中
      </span>
    )}
  </span>
);
