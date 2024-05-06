import "./App.css";
import React, { useReducer } from "react";
import axios from "axios";
import { MAPACHE_API_URL } from "./consts/config";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAxiosErrorCode,
  getAxiosErrorMessage,
} from "./lib/axios-error-handler";
import { useNavigate } from "react-router-dom";
import { checkCredentials } from "./lib/auth";

function App() {
  const navigate = useNavigate();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const [connected, setConnected] = React.useState(false);
  const [pingResponse, setPingResponse] = React.useState<any>({});

  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");

  React.useEffect(() => {
    init();
    checkVpnConnection();
    const interval = setInterval(() => {
      // checkVpnConnection();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const checkVpnConnection = async () => {
    try {
      const response = await axios.get(`${MAPACHE_API_URL}/ping`);
      if (response.status == 200) {
        setConnected(true);
        setPingResponse(response.data);
      }
    } catch (error) {
      setConnected(false);
      return;
    }
  };

  const init = async () => {
    if (
      localStorage.getItem("id") != null &&
      localStorage.getItem("token") != null
    ) {
      navigate("/auth/register");
    }
  };

  const register = async () => {
    if (loginEmail == "" || loginPassword == "") return;
    setLoginLoading(true);
    try {
      const response = await axios.post(`${MAPACHE_API_URL}/auth/register`, {
        email: loginEmail,
        password: loginPassword,
      });
      if (response.status == 200) {
        localStorage.setItem("id", response.data.id);
        localStorage.setItem("token", response.data.token);
        navigate("/auth/register");
      }
    } catch (error: any) {
      if (getAxiosErrorCode(error) == 409) {
        return login();
      }
      toast(getAxiosErrorMessage(error));
    }
    setLoginLoading(false);
  };

  const login = async () => {
    setLoginLoading(true);
    try {
      const response = await axios.post(`${MAPACHE_API_URL}/auth/login`, {
        email: loginEmail,
        password: loginPassword,
      });
      if (response.status == 200) {
        localStorage.setItem("id", response.data.id);
        localStorage.setItem("token", response.data.token);
        navigate("/auth/register");
      }
    } catch (error: any) {
      toast(getAxiosErrorMessage(error));
    }
    setLoginLoading(false);
  };

  return (
    <>
      <div className=""></div>
      <div className="flex">
        <div className="h-screen w-1/2 overflow-y-auto bg-gradient-to-r from-gr-pink to-gr-purple">
          <div className="flex flex-col p-16">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Mapache
            </h1>
          </div>
          <div className="absolute bottom-0 left-0 z-20 p-16">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Theory will take you only so far&rdquo;
              </p>
              <footer className="text-sm">Tien Nguyen</footer>
            </blockquote>
          </div>
        </div>
        <div className="mx-auto h-screen w-1/2 bg-black text-center">
          <div className="flex h-full flex-col items-center justify-center p-32">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign In with Email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign into your account to continue. If you don't have an account,
              one will be created for you.
            </p>
            <Input
              id="email"
              className="mt-4"
              placeholder="Email"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={loginLoading}
              onChange={(e) => {
                setLoginEmail(e.target.value);
              }}
            />
            <Input
              className="mt-2"
              id="password"
              placeholder="Password"
              type="password"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={loginLoading}
              onChange={(e) => {
                setLoginPassword(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  register();
                }
              }}
            />
            <Button
              disabled={loginLoading}
              className="mt-4 w-full"
              onClick={register}
            >
              {loginLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign In with Email
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
