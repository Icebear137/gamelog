import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

interface Option { value: string; label: string }

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  className?: string;
}

export function RadixSelect({ value, onValueChange, options, placeholder, className }: Props) {
  const current = options.find((o) => o.value === value);
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className={`flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/8 hover:border-white/20 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none transition-colors min-w-36 ${className ?? ""}`}>
        <Select.Value>{current?.label ?? placeholder}</Select.Value>
        <Select.Icon className="ml-auto">
          <ChevronDown size={14} className="text-gray-500" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-xl z-50" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
