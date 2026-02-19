import React from "react";
import { uxp } from "../globals";
import { api } from "../api/api";

export const LoadFDiskButton = ({ onFileLoaded }) => {
  const handleLoadFile = async () => {
    const file = await uxp.storage.localFileSystem.getFileForOpening({
    types: ["xlsx", "xls"]
    });
    // TODO: Open file picker with uxp.storage.localFileSystem.getFileForOpening
    // TODO: Get file object
    // const parsedData = await api.parseExcelFile(file); // TODO: file not defined yet
    // onFileLoaded(parsedData);
  };

  return (
    <sp-action-button onClick={handleLoadFile}>
      Load From Disk
    </sp-action-button>
  );
};


