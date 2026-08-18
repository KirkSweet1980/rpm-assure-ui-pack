import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { DensityProvider } from "@/lib/density";
import { ThemeProvider } from "@/lib/theme";
import appCss from "@/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "RPM | Assurance Delivered" },
      {
        name: "description",
        content:
          "Multitenant RPM Assure reporting for managed customers — SYSPRO and more.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        children: `(function(){try{var e=document.documentElement;e.dataset.theme="dark";e.style.colorScheme="dark";e.classList.add("dark","carbon");e.classList.remove("snow");var q=new URLSearchParams(location.search).get("palette");if(q){e.dataset.palette=String(q).toLowerCase();}}catch(e){}})();`,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en-ZA" className="rpma-crisp">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <DensityProvider>
              <Outlet />
            </DensityProvider>
          </ThemeProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
