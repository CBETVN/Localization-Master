import React, { useEffect, useState } from "react";

import boltUxpLogo from "./assets/bolt-uxp.png";
import viteLogo from "./assets/vite.png";
import tsLogo from "./assets/typescript.png";
import sassLogo from "./assets/sass.png";
import reactLogo from "./assets/react.png";

import { uxp, photoshop} from "./globals";
import { api } from "./api/api";

export const App = () => {
  const webviewUI = import.meta.env.VITE_BOLT_WEBVIEW_UI === "true";
  
  const [count, setCount] = useState(0);
  const increment = () => setCount((prev) => prev + 1);

  const hostName = (uxp.host.name).toLowerCase();

  //* Call Functions Conditionally by App
  if (hostName === "photoshop") {
    console.log("Hello from Photoshop", photoshop);
  }
      
  //* Or call the unified API object directly and the correct app function will be used
  const simpleAlert = () => {
    api.notify("Hello World");
  };
  return (
    <>
      {!webviewUI ? (
        <main>
          <div>
            <img className="logo-lg" src={boltUxpLogo} alt="" />
          </div>
          <div className="stack-icons">
            <img src={viteLogo} className="logo" alt="" />
            <span> + </span>
            <img src={tsLogo} className="logo" alt="" />
            <span> + </span>
            <img src={sassLogo} className="logo" alt="" />
            <span> + </span>
            <img src={reactLogo} className="logo" alt="" />
          </div>
          <h1>Built with Bolt UXP</h1>
          <div className="card">
            <button onClick={increment}>count is {count}</button>
          </div>
          <p>
            Edit <code>src/main.jsx</code> and save to test HMR
          </p>
          <div className="card">
            <button onClick={simpleAlert}>Complex Alert</button>
          </div>
        </main>
      ) : (
        <div>
          <h1>Hello World</h1>
          <p>This is a Bolt WebView UI plugin.</p>
        </div>
      )}
    </>
  );
};
