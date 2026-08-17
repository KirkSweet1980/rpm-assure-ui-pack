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
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
    scripts: [
      {
        children: `(function(){try{var dn=localStorage.getItem("daynight-theme");var p=dn==="carbon"?"dark":dn==="snow"?"light":(localStorage.getItem("rpma-theme")||"dark");var m=p==="auto"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;if(m!=="light"&&m!=="dark")m="dark";var e=document.documentElement;e.dataset.theme=m;e.style.colorScheme=m;e.classList.toggle("dark",m==="dark");e.classList.toggle("carbon",m==="dark");e.classList.toggle("snow",m==="light");}catch(e){}})();`,
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
