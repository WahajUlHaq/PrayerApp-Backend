import { Router } from "express";

import namazTimingsroutes from "#routes/namaz-timings";
import masjidConfigRoutes from "#routes/masjid-config";
import iqamaahTimesRoutes from "#routes/iqamaah-times";
import bannersRoutes from "#routes/banners";
import pagesRoutes from "#routes/pages";
import announcementRoutes from "#routes/announcements";
import nextHijriMonthRoutes from "#routes/next-hijri-month";

const router = Router();

namazTimingsroutes(router);
masjidConfigRoutes(router);
iqamaahTimesRoutes(router);
bannersRoutes(router);
pagesRoutes(router);
announcementRoutes(router);

nextHijriMonthRoutes(router);

export default router;
