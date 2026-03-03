import * as photoshop from "./photoshop"; 
import { uxp } from "../globals";
import * as uxpLib from "./uxp";
import * as parsingLogic from "./parsingLogic";
import * as phraseGuesser from "./phraseGuesser";
import * as psdParser from "./psdParser";
import * as validateMasterFile from "./validateMasterFile";

const hostName =
  uxp?.host?.name.toLowerCase().replace(/\s/g, "") || "";

let host = {};

if (hostName.startsWith("photoshop")) host = photoshop; 

export const api = { ...uxpLib, ...host, ...parsingLogic, ...phraseGuesser, ...psdParser, ...validateMasterFile };
