import { BACKEND_URL, SOCIAL_LINKS } from "@/consts/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGithub,
  faInstagram,
  faLinkedinIn,
  faTwitter,
} from "@fortawesome/free-brands-svg-icons";
import React from "react";
import axios from "axios";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { toast } from "sonner";

export default function Footer() {
  const [serverMessage, setServerMessage] = React.useState("");

  React.useEffect(() => {
    ping();
  }, []);

  const ping = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/ping`);
      console.log(response.data);
      setServerMessage(response.data.message);
    } catch (error: any) {
      toast(getAxiosErrorMessage(error));
    }
  };
  return (
    <footer className="w-full bg-gr-purple bg-opacity-0 p-8 text-white transition-all duration-200 lg:pl-32 lg:pr-32">
      <div className="flex items-end justify-between">
        <div className="">
          <div className="ml-2 flex items-center justify-start">
            <img
              src="/logo/gr-logo-blank.png"
              width={50}
              height={50}
              alt="Logo"
            />
            <h1 className="ml-4 mr-4 text-3xl lg:text-4xl">Gaucho Racing</h1>
          </div>
        </div>
        <div className="pr-4 text-gray-400">
          <p>{serverMessage}</p>
        </div>
      </div>
      <div className="my-4 h-0.5 w-full bg-gradient-to-r from-gr-pink to-gr-purple"></div>
      <div className="flex w-full items-center justify-between">
        <p className="text-md ml-4 mr-4 text-gray-400">
          © 2020 - {new Date().getFullYear()} Gaucho Racing
        </p>
        <div className="flex">
          <button onClick={() => window.open(SOCIAL_LINKS.github, "_blank")}>
            <FontAwesomeIcon
              icon={faGithub}
              className="ml-4 mr-4 h-6 w-6 text-gray-400 hover:text-white"
            />
          </button>
          <button onClick={() => window.open(SOCIAL_LINKS.instagram, "_blank")}>
            <FontAwesomeIcon
              icon={faInstagram}
              className="ml-4 mr-4 h-6 w-6 text-gray-400 hover:text-white"
            />
          </button>
          <button onClick={() => window.open(SOCIAL_LINKS.twitter, "_blank")}>
            <FontAwesomeIcon
              icon={faTwitter}
              className="ml-4 mr-4 h-6 w-6 text-gray-400 hover:text-white"
            />
          </button>
          <button onClick={() => window.open(SOCIAL_LINKS.linkedin, "_blank")}>
            <FontAwesomeIcon
              icon={faLinkedinIn}
              className="ml-4 mr-4 h-6 w-6 text-gray-400 hover:text-white"
            />
          </button>
        </div>
      </div>
    </footer>
  );
}
