import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

export const gnSelectTriggerCls = "flex items-center justify-between gap-1 w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-sm text-white hover:bg-white/8 transition-colors outline-none data-[placeholder]:text-gray-600";
export const gnSelectContentCls = "bg-zinc-900 border border-white/10 rounded-xl p-1 shadow-2xl overflow-hidden";
export const gnSelectItemCls = "px-3 py-1.5 text-sm text-white rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-emerald-400";

export function GNSelect({ value, onValueChange, options, placeholder }: {
  value: string;
  onValueChange: (v: string) => void;
  options: { v: string; l: string }[];
  placeholder: string;
}) {
  return (
    <Select.Root value={value || undefined} onValueChange={onValueChange}>
      <Select.Trigger className={gnSelectTriggerCls}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon><ChevronDown size={11} className="text-gray-500 shrink-0" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={gnSelectContentCls} position="popper" sideOffset={4}>
          <Select.Viewport className="max-h-44 overflow-y-auto">
            {options.map((o) => (
              <Select.Item key={o.v} value={o.v} className={gnSelectItemCls}>
                <Select.ItemText>{o.l}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
