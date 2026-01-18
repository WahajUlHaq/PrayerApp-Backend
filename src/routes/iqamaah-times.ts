import { Router } from "express";

import {
  createIqamaahTimes,
  createIqamaahTimesRange,
  deleteIqamaahTimesRange,
  getIqamaahTimesForMonth,
  updateIqamaahTimesRange,
} from "#controllers/iqamaah-times";

const BASE_ROUTE = "/iqamaah-times";

const iqamaahTimesRoutes = (router: Router) => {
  router.post(`${BASE_ROUTE}`, createIqamaahTimes);
  router.post(`${BASE_ROUTE}/range`, createIqamaahTimesRange);
  router.patch(`${BASE_ROUTE}/range`, updateIqamaahTimesRange);
  router.delete(`${BASE_ROUTE}/range`, deleteIqamaahTimesRange);
  router.get(`${BASE_ROUTE}/month`, getIqamaahTimesForMonth);
};

export default iqamaahTimesRoutes;
