import { Router } from "express";

import {fetchNamazTimings, getNamazTimings} from "#controllers/namaz-timings";

const BASE_ROUTE = "/namaz-timings";

const namazTimingsroutes = (router: Router) => {
    router.get(`${BASE_ROUTE}/fetch`, fetchNamazTimings);
    router.get(`${BASE_ROUTE}`, getNamazTimings);
};

export default namazTimingsroutes;