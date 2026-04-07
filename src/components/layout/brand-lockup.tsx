import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLockupProps = {
  subtitle?: string;
  imageWidth?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLockup({
  subtitle,
  imageWidth = 220,
  className,
  priority = false,
}: BrandLockupProps) {
  return (
    <Link href="/" className={cn("inline-flex flex-col gap-3", className)}>
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080c24] shadow-[0_24px_70px_rgba(7,11,34,0.45)]">
        <Image
          src="/party-swami-logo.png"
          alt="Party Swami logo"
          width={imageWidth}
          height={imageWidth}
          priority={priority}
          className="h-auto w-full object-contain"
        />
      </div>
      {subtitle ? <p className="text-sm leading-6 text-ink-muted">{subtitle}</p> : null}
    </Link>
  );
}
