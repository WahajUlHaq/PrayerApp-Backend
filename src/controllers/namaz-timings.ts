import { Request, Response } from "express"; 
import { convertQueryToRealTypes } from "#utils/helpers";
import * as namazTimingsService from "#services/namaz-timings";
import { validateNamazTimingsRequest } from "#validators/namaz-timings";
import { NamazTimingsParams } from "#interfaces/namaz-timings";

export const fetchNamazTimings = async (req: Request, res: Response) => {
  try {
    const query = convertQueryToRealTypes(req.query) as NamazTimingsParams;

    validateNamazTimingsRequest(query);
    
    const response = await namazTimingsService.fetchNamazTimings(query);

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getNamazTimings = async (req: Request, res: Response) => {
  try {
    const response = await namazTimingsService.getNamazTimings();

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};


