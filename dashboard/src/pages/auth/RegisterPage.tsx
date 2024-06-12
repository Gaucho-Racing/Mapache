import React from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MAPACHE_API_URL, currentUser } from "@/consts/config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { useNavigate, useSearchParams } from "react-router-dom";

function RegisterPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [queryParameters] = useSearchParams();

  const [loading, setLoading] = React.useState(true);
  const [createAccountLoading, setCreateAccountLoading] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [subteam, setSubteam] = React.useState("Select subteam");

  React.useEffect(() => {
    checkCredentials();
  }, []);

  const checkCredentials = async () => {
    if (
      localStorage.getItem("id") == null ||
      localStorage.getItem("token") == null
    ) {
      navigate("/");
    }
    try {
      const userId = localStorage.getItem("id");
      const response = await axios.get(`${MAPACHE_API_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.status == 200) {
        currentUser.id = response.data.data.id;
        currentUser.firstName = response.data.data.first_name;
        currentUser.lastName = response.data.data.last_name;
        currentUser.email = response.data.data.email;
        currentUser.subteam = response.data.data.subteam;
        currentUser.roles = response.data.data.roles;
        currentUser.updatedAt = response.data.data.updated_at;
        currentUser.createdAt = response.data.data.created_at;

        if (currentUser.firstName != "" && currentUser.lastName != "") {
          const route = queryParameters.get("route");
          if (route) {
            navigate(route);
          } else {
            navigate("/dash");
          }
        }
      }
    } catch (error) {
      toast({
        title: "Something went wrong!",
        description: getAxiosErrorMessage(error),
      });
      localStorage.removeItem("id");
      localStorage.removeItem("token");
      navigate("/");
      return;
    }
    setLoading(false);
  };

  const createAccount = async () => {
    if (firstName == "" || lastName == "" || subteam == "Select subteam")
      return;
    setCreateAccountLoading(true);
    try {
      const userId = localStorage.getItem("id");
      const response = await axios.post(
        `${MAPACHE_API_URL}/users/${userId}`,
        {
          first_name: firstName,
          last_name: lastName,
          subteam: subteam,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (response.status == 200) {
        currentUser.id = response.data.data.id;
        currentUser.firstName = response.data.data.first_name;
        currentUser.lastName = response.data.data.last_name;
        currentUser.email = response.data.data.email;
        currentUser.subteam = response.data.data.subteam;
        currentUser.roles = response.data.data.roles;
        currentUser.updatedAt = response.data.data.updated_at;
        currentUser.createdAt = response.data.data.created_at;
        navigate("/dash");
      }
    } catch (error) {
      toast({
        title: "Something went wrong!",
        description: getAxiosErrorMessage(error),
      });
    }
    setCreateAccountLoading(false);
  };

  const LoadingComponent = () => {
    return (
      <div className="flex h-full flex-col items-center justify-center p-32">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">
          Please wait while we check your credentials.
        </p>
      </div>
    );
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
          {loading ? (
            <LoadingComponent />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-32">
              <h1 className="text-2xl font-semibold tracking-tight">
                Finish Creating Your Account
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Just a few more steps to get started!
              </p>
              <Input
                id="first-name"
                className="mt-4"
                placeholder="First Name"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="false"
                disabled={createAccountLoading}
                onChange={(e) => {
                  setFirstName(e.target.value);
                }}
              />
              <Input
                className="mt-2"
                id="last-name"
                placeholder="Last Name"
                type="text"
                autoComplete="false"
                autoCapitalize="none"
                autoCorrect="off"
                disabled={createAccountLoading}
                onChange={(e) => {
                  setLastName(e.target.value);
                }}
              />
              <div className="mt-2 w-full">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-full" variant="outline">
                      Subteam: {subteam}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuRadioGroup
                      value={subteam}
                      onValueChange={setSubteam}
                    >
                      <DropdownMenuRadioItem value="Aero">
                        Aero
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Business">
                        Business
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Chassis">
                        Chassis
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Controls">
                        Controls
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Powertrain">
                        Powertrain
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Suspension">
                        Suspension
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                disabled={createAccountLoading}
                onClick={createAccount}
                className="mt-4 w-full"
              >
                {createAccountLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Account
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default RegisterPage;
