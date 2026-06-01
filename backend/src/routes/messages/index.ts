import { Router } from "express";
import conversationsRouter from "./conversations";
import membersRouter from "./members";
import messagesCrudRouter from "./messages-crud";
import mediaRouter from "./media";
import pollsRouter from "./polls";
import gameNightsRouter from "./game-nights";

const router = Router();

router.use(conversationsRouter);
router.use(membersRouter);
router.use(messagesCrudRouter);
router.use(mediaRouter);
router.use(pollsRouter);
router.use(gameNightsRouter);

export default router;
