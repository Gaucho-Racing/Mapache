import React from "react";
import axios from "axios";
import {
  BACKEND_URL,
  SENTINEL_CLIENT_ID,
  SENTINEL_OAUTH_BASE_URL,
} from "@/consts/config";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { useNavigate, useSearchParams } from "react-router-dom";
import { checkCredentials, saveAccessToken } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { OutlineButton } from "@/components/ui/outline-button";
import { QUOTES } from "@/consts/quotes";

function LoginPage() {
  const navigate = useNavigate();
  const [queryParameters] = useSearchParams();

  const [sentinelMsg, setSentinelMsg] = React.useState("");
  const [loginStatus, setLoginStatus] = React.useState("none");

  React.useEffect(() => {
    ping();
    login();
  }, []);

  const [quote] = React.useState(
    QUOTES[Math.floor(Math.random() * QUOTES.length)],
  );

  const ping = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/auth/ping`);
      console.log(response.data.data);
      setSentinelMsg(response.data.data.message);
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const loginSentinel = async () => {
    const redirect_url = window.location.origin + "/auth/login";
    const scope = "user:read";
    let oauthUrl = `${SENTINEL_OAUTH_BASE_URL}?client_id=${SENTINEL_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_url)}&scope=${encodeURIComponent(scope)}&prompt=none`;
    const route = queryParameters.get("route");
    if (route) {
      oauthUrl += `&state=${encodeURIComponent(route)}`;
    }
    window.location.href = oauthUrl;
  };

  const checkAuth = async () => {
    const status = await checkCredentials();
    if (status == 0) {
      handleRedirect();
    }
  };

  const login = async () => {
    setLoginStatus("loading");
    const code = queryParameters.get("code");
    if (!code) {
      setLoginStatus("none");
      // Auto-login if we came from non-root route
      const route = queryParameters.get("route");
      if (route) {
        loginSentinel();
      }
      return;
    }
    try {
      const response = await axios.post(
        `${BACKEND_URL}/auth/login?code=${code}`,
      );
      if (response.status == 200) {
        saveAccessToken(response.data.data.access_token);
        checkAuth();
      }
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
      setLoginStatus("error");
    }
  };

  const handleRedirect = () => {
    const route = queryParameters.get("state");
    if (route && route != "null") {
      navigate(route);
    } else {
      navigate("/");
    }
  };

  const LoadingCard = () => {
    return (
      <Card className="border-none p-4 md:w-[500px] md:p-8">
        <div className="flex flex-col items-center justify-center">
          <img
            src="/logo/mechanic-logo.png"
            alt="Gaucho Racing"
            className="mx-auto h-20 md:h-24"
          />
          <Loader2 className="mt-8 h-16 w-16 animate-spin" />
        </div>
      </Card>
    );
  };

  const LoginCard = () => {
    return (
      <Card className="p-4 md:w-[500px] md:p-8">
        <div className="items-center">
          <img
            src="/logo/mechanic-logo.png"
            alt="Gaucho Racing"
            className="mx-auto h-20 md:h-24"
          />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            Login with Sentinel
          </h1>
          <p className="mt-4">Login to Mapache using your Sentinel account.</p>
          <OutlineButton
            className="mt-4 w-full"
            onClick={() => {
              loginSentinel();
            }}
          >
            Sentinel Sign On
          </OutlineButton>
        </div>
      </Card>
    );
  };

  const InvalidCodeCard = () => {
    return (
      <Card className="p-4 md:w-[500px] md:p-8">
        <div className="items-center">
          <img
            src="/logo/mechanic-logo.png"
            alt="Gaucho Racing"
            className="mx-auto h-20 md:h-24"
          />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            Sentinel Sign On Error
          </h1>
          <p className="mt-4">Invalid or expired code. Please try again.</p>
          <OutlineButton
            className="mt-4 w-full"
            onClick={() => {
              loginSentinel();
            }}
          >
            Sentinel Sign On
          </OutlineButton>
        </div>
      </Card>
    );
  };

  return (
    <>
      <div className="flex">
        <div className="h-screen w-1/2 overflow-y-auto bg-gradient-to-r from-gr-pink to-gr-purple">
          <div className="flex flex-col p-16">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Mapache
            </h1>
          </div>
          <div className="absolute bottom-0 left-0 z-20 p-16">
            <blockquote className="space-y-2">
              <p className="whitespace-pre text-lg">
                &ldquo;{quote.quote}&rdquo;
              </p>
              <footer className="text-md">{quote.author}</footer>
            </blockquote>
          </div>
        </div>
        <div className="mx-auto h-screen w-1/2 bg-black text-center">
          <div className="flex h-full flex-col items-center justify-center p-32">
            {loginStatus == "loading" ? (
              <LoadingCard />
            ) : loginStatus == "error" ? (
              <InvalidCodeCard />
            ) : (
              <LoginCard />
            )}
          </div>
        </div>
        <div className="fixed bottom-0 right-0 z-50 p-4 text-gray-500">
          <p>{sentinelMsg}</p>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
