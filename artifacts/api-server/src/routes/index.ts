import { Router, type IRouter } from "express";
import { optionalAuth } from "../middlewares/auth.js";
import healthRouter from "./health.js";
import usersRouter from "./users.js";
import resumesRouter from "./resumes.js";
import coverLettersRouter from "./cover_letters.js";
import interviewRouter from "./interview.js";
import paymentsRouter from "./payments.js";
import adminRouter from "./admin.js";
import statsRouter from "./stats.js";

const router: IRouter = Router();

router.use(optionalAuth);

router.use(healthRouter);
router.use(usersRouter);
router.use(resumesRouter);
router.use(coverLettersRouter);
router.use(interviewRouter);
router.use(paymentsRouter);
router.use(adminRouter);
router.use(statsRouter);

export default router;
