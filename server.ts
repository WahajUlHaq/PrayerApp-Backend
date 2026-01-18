import express from "express";
import dotenv from "dotenv";
const cors = require("cors");

import connectDB from "#configs/mongodb";
import router from "#routes/index";
import { startNamazTimingsDailyCron } from "#cron/namaz-timings-refresh";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api", router);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  startNamazTimingsDailyCron();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
