import React from "react";
import "./DataStatusIcon.css";
import earthActiveIcon from "../assets/icons/earthActive.png";
import earthInactiveIcon from "../assets/icons/earthInactive.png";

export const DataStatusIcon = ({ isActive }) => {
  return (
    <div className="data-status" aria-live="polite">
      <img
        className="data-status-indicator"
        src={isActive ? earthActiveIcon : earthInactiveIcon}
        alt={isActive ? "Data loaded" : "Data not loaded"}
      />
      {/* <span className="data-status-text">
        {isActive ? "Data loaded" : "Data not loaded"}
      </span> */}
    </div>
  );
};
