import { Router } from "express";

import { getMasjidConfig, upsertMasjidConfig } from "#controllers/masjid-config";

const BASE_ROUTE = "/masjid-config";

const masjidConfigRoutes = (router: Router) => {
  router.post(`${BASE_ROUTE}`, upsertMasjidConfig);
  router.get(`${BASE_ROUTE}`, getMasjidConfig);
  router.patch(`${BASE_ROUTE}`, upsertMasjidConfig);
};

export default masjidConfigRoutes;
