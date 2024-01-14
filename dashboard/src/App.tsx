import "./App.css";
import React from "react";
import axios from "axios";
import { MAPACHE_API_URL } from "./consts/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";

function App() {
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    checkVpnConnection();
    const interval = setInterval(() => {
      checkVpnConnection();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const checkVpnConnection = async () => {
    try {
      const response = await axios.get(`${MAPACHE_API_URL}/ping`);
      if (response.status == 200) {
        setConnected(true);
      }
    } catch (error) {
      setConnected(false);
      return;
    }
  };

  return (
    <div className="flex">
      <main className="relative min-h-screen md:ml-[60px] md:w-[calc(100vw-60px)] bg-slate-100">
        <div className="pt-16">
          <div className="max-w-3xl p-6">
            <header className="absolute top-0 left-0 flex items-center w-full bg-white px-6 py-4 h-[60px] ">
              <div className="w-40 h-8">Home</div>
            </header>
            <section className="">
              <div className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16">
                <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl">
                  Mapache
                </h1>
                {!connected ? (
                  <p className="mb-8 text-2xl font-normal text-gray-500">
                    Don't forget to connect to the Axm Dev VPN if you haven't
                    already!
                  </p>
                ) : (
                  <div />
                )}
                <div className="flex justify-center content-center items-center mt-8">
                  <FontAwesomeIcon
                    icon={connected ? faCheckCircle : faTimesCircle}
                    size="xl"
                    className={`${
                      connected ? `text-green-500` : `text-red-500`
                    } mr-4`}
                  />
                  <span className="text-xl font-normal text-gray-500">
                    {connected
                      ? "Connected to Axm Dev VPN!"
                      : "Not connected to Axm Dev VPN"}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
