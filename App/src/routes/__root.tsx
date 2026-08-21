import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { DensityProvider } from "@/lib/density";
import { ThemeProvider } from "@/lib/theme";
import appCss from "@/styles.css?url";
import sideNavCss from "@/styles-side-nav.css?url";
import chromeCss from "@/chrome.css?url";

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
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: sideNavCss },
      { rel: "stylesheet", href: chromeCss },
    ],
    scripts: [
      {
        children: `(function(){try{var e=document.documentElement,pref=null,dn=null,mode="dark";try{pref=localStorage.getItem("rpma-theme")}catch(_){}try{dn=localStorage.getItem("daynight-theme")}catch(_){}if(dn==="snow"||pref==="light")mode="light";else if(dn==="carbon"||pref==="dark")mode="dark";else if(pref==="auto"||pref==="system")mode=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";e.dataset.theme=mode;e.style.colorScheme=mode;if(mode==="dark"){e.classList.add("dark","carbon");e.classList.remove("snow")}else{e.classList.add("snow");e.classList.remove("dark","carbon")}var q=new URLSearchParams(location.search).get("palette");if(q){e.dataset.palette=String(q).toLowerCase();}}catch(e){}})();`,
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
