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
      <main className="relative min-h-screen bg-slate-100 md:ml-[60px] md:w-[calc(100vw-60px)]">
        <div className="pt-16">
          <div className="max-w-3xl p-6">
            <header className="absolute left-0 top-0 flex h-[60px] w-full items-center bg-white px-6 py-4 ">
              <div className="h-8 w-40">Home</div>
            </header>
            <section className="">
              <div className="mx-auto max-w-screen-xl px-4 py-8 text-center lg:py-16">
                <h1 className="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
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
                <div className="mt-8 flex content-center items-center justify-center">
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
