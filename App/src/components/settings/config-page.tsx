export function ConfigPageHead({
  description,
  blurb,
  actions,
}: {
  kicker?: string;
  title?: string;
  description?: string;
  blurb?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const copy = settingsPageCopy(pathname);
  const blurbText = description ?? blurb ?? copy.description;