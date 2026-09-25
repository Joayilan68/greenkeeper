// src/lib/usePageMeta.js
// Met à jour titre, description, adresse canonique et indexation à chaque changement de page
// dans l'app (navigation sans rechargement). Même source que les pages pré-générées au build
// (scripts/seo-build.mjs) : src/lib/seoPages.json. Pages privées : non indexables.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import pages from "./seoPages.json";

const SITE = "https://mongazon360.fr";

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

export function usePageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = pages.find(p => p.path === pathname) || { ...pages[0], noindex: true };
    const url  = SITE + (page.path === "/" ? "" : page.path);
    document.title = page.title;
    setMeta('meta[name="description"]', "content", page.description);
    setMeta('meta[name="robots"]', "content", page.noindex ? "noindex, follow" : "index, follow");
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:title"]', "content", page.title);
    setMeta('meta[property="og:description"]', "content", page.description);
  }, [pathname]);
}
