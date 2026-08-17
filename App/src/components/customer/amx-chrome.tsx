import type { ReactNode } from "react";
import { HelpCircle, Settings, Shield } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { CustomerSwitcher } from "@/components/nav/customer-switcher";
import { useCustomerList } from "@/lib/nav/customer-list-context";
import { cn } from "@/lib/utils";

export function AmxTopBar({
  customerCode,
  customerName,
  kicker = "Assurance matrix · Customer",
}: {
  customerCode: string;
  customerName: string;
  kicker?: string;
}) {
  const { customers } = useCustomerList();
  return (
    <header className="rpma-amx-top">
      <div className="rpma-amx-brand">
        <Shield className="size-4" aria-hidden />
        <span>{kicker}</span>
      </div>
      <div className="rpma-amx-top-right">
        <CustomerSwitcher
          customers={customers}
          currentCode={customerCode}
          variant="inline"
          label={customerName}
        />
        <SpaLink href="/settings/about" className="rpma-amx-iconbtn" title="Help">
          <HelpCircle className="size-4" />
        </SpaLink>
        <SpaLink href="/settings/infrastructure" className="rpma-amx-iconbtn" title="Settings">
          <Settings className="size-4" />
        </SpaLink>
      </div>
    </header>
  );
}

export function AmxFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("rpma-amx-canvas", className)}>{children}</div>;
}
