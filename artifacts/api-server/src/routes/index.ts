import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactRouter from "./contact";
import stripeRouter from "./stripe";
import ebayRouter from "./ebay";
import portalRouter from "./portal";
import technicianApplicationsRouter from "./technician-applications";
import phoneRouter from "./phone";

const router: IRouter = Router();
router.use(healthRouter);
router.use(contactRouter);
router.use(stripeRouter);
router.use(ebayRouter);
router.use(technicianApplicationsRouter);
router.use(portalRouter);
router.use(phoneRouter);
export default router;
