import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// qoreaesthetics.com is served by this same app. Its home page lives at the
// internal /aesthetics route; every other path (intake, privacy) is shared.
// aesthetics.localhost lets you preview it locally.
const AESTHETICS_HOST = /(^|\.)qoreaesthetics\.com$|^aesthetics\.localhost$/;
const AESTHETICS_HOME = "/aesthetics";

const isAestheticsHost = (url: URL) => AESTHETICS_HOST.test(url.hostname);

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => {
        if (isAestheticsHost(url) && url.pathname === "/") url.pathname = AESTHETICS_HOME;
        return url;
      },
      output: ({ url }) => {
        if (isAestheticsHost(url) && url.pathname === AESTHETICS_HOME) url.pathname = "/";
        return url;
      },
    },
  });

  return router;
};
