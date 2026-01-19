import * as photoshop from "./photoshop"; 
import { uxp } from "../globals";
import * as uxpLib from "./uxp";

const hostName =
  uxp?.host?.name.toLowerCase().replace(/\s/g, "") || "";

let host = {};

if (hostName.startsWith("photoshop")) host = photoshop; 

export const api = { ...uxpLib, ...host };
