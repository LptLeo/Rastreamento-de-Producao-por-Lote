import { Router } from "express";
import { getAllInsumos } from "../controllers/insumo.controller.js";

const routes = Router();

routes.get('/', getAllInsumos);

export default routes;
