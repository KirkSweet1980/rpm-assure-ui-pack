/** Scroll the app chrome (not the customer rail) back to the top of the page. */
export function scrollChromeToTop() {
  if (typeof document === "undefined") return;
  const nodes = document.querySelectorAll<HTMLElement>(
    ".rpma-topnav-main, .rpma-d3-detail",
  );
  nodes.forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
