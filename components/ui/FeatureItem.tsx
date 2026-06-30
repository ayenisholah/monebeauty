type IconType = React.ComponentType<{
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold";
  className?: string;
}>;

/** Thin accent icon + uppercase title + muted description (hero advantages, features strip). */
export function FeatureItem({
  icon: Icon,
  title,
  description,
  iconSize = 30,
}: {
  icon: IconType;
  title: string;
  description: string;
  iconSize?: number;
}) {
  return (
    <div className="flex flex-col gap-[11px]">
      <Icon size={iconSize} weight="thin" className="text-accent" />
      <div className="font-sans text-[12px] leading-[1.35] font-semibold tracking-[.07em] text-ink uppercase">
        {title}
      </div>
      <div className="font-sans text-[11.5px] leading-[1.5] font-light text-muted">
        {description}
      </div>
    </div>
  );
}
