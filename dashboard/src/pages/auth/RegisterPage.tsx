import React from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MAPACHE_API_URL } from "@/consts/config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function RegisterPage() {
  const { toast } = useToast();

  const [createAccountLoading, setCreateAccountLoading] = React.useState(false);

  React.useEffect(() => {
    checkCredentials();
  }, []);

  const checkCredentials = async () => {
    try {
      const response = await axios.get(`${MAPACHE_API_URL}/ping`);
      if (response.status == 200) {
      }
    } catch (error) {
      return;
    }
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
              <footer className="text-sm">J. Robert Oppenheimer</footer>
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
              disabled={createAccountLoading}
            />
            <Input
              className="mt-2"
              id="password"
              placeholder="Password"
              type="password"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={createAccountLoading}
            />
            <Button disabled={createAccountLoading} className="mt-4 w-full">
              {createAccountLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Account
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default RegisterPage;
