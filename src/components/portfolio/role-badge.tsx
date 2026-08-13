import { Badge } from "@/components/ui/badge";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";

export function RoleBadge() {
  const { profile, isPending } = useStaffProfile();
  if (isPending || !profile) {
    return <span className="h-5 w-16 animate-pulse rounded bg-black/10" />;
  }
  const variant =
    profile.role === "PlatformAdmin"
      ? "green"
      : profile.role === "Operator"
        ? "default"
        : profile.role === "ExCo"
          ? "amber"
          : "muted";
  return (
    <Badge variant={variant as "green" | "amber" | "muted" | "default"} title={`Source: ${profile.source}`}>
      {profile.permissions.label}
    </Badge>
  );
}
