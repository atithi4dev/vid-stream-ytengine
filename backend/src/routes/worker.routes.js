import {Router} from "express"
import uploadonmongodb from "../controllers/worker.controller.js";
const router = Router();

router.post("/", uploadonmongodb)

export default router;
