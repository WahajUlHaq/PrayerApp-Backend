import { Router } from "express";
import { getNextHijriMonthInfo } from "#controllers/next-hijri-month";

const nextHijriMonthRoutes = (router: Router) => {
  router.get("/next-hijri-month", getNextHijriMonthInfo);
};

export default nextHijriMonthRoutes;
