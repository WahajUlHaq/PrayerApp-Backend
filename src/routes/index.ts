import { Router } from "express";

import namazTimingsroutes from "#routes/namaz-timings";
import masjidConfigRoutes from "#routes/masjid-config";
import iqamaahTimesRoutes from "#routes/iqamaah-times";
import bannersRoutes from "#routes/banners";
import pagesRoutes from "#routes/pages";

const router = Router();

namazTimingsroutes(router);
masjidConfigRoutes(router);
iqamaahTimesRoutes(router);
bannersRoutes(router);
pagesRoutes(router);

export default router;
