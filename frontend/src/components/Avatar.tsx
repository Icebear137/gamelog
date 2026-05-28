import * as RadixAvatar from "@radix-ui/react-avatar";
import clsx from "clsx";

interface AvatarProps {
  src?: string | null;
  username: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl" };

export default function Avatar({ src, username, size = "md" }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={clsx(
        // block + explicit size: đảm bảo overflow-hidden hoạt động đúng
        // dù RadixAvatar.Root render dưới dạng <span>
        "block rounded-full overflow-hidden shrink-0 bg-violet-700",
        sizes[size]
      )}
    >
      <RadixAvatar.Image
        src={src ?? undefined}
        alt={username}
        className="block w-full h-full object-cover"
      />
      <RadixAvatar.Fallback className="flex items-center justify-center w-full h-full text-white font-bold uppercase select-none">
        {username[0]}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
