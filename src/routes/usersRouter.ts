import {Router} from "express";
import UserController from "../controllers/UserController";

const router = Router();

router.post("/", UserController.createNewUser);
router.get("/amILoggedIn", UserController.amILoggedIn);
router.get("/logOut", UserController.logOut);
router.post("/logIn", UserController.logIn);

export default router;
