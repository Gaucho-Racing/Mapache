import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { logout } from "@/lib/auth";
import { useUser } from "@/lib/store";

interface HeaderProps {
  className?: string;
  style?: React.CSSProperties;
}

const Header = (props: HeaderProps) => {
  const navigate = useNavigate();
  const currentUser = useUser();
  return (
    <div
      className={`w-full items-center justify-start border-b border-neutral-800 transition-all duration-200 lg:pl-32 lg:pr-32 ${props.className}`}
      style={{ ...props.style }}
    >
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center p-4">
          <h1>Jiffy</h1>
        </div>
        <div className="mr-4 flex flex-row p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarImage src={currentUser.avatar_url} />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mt-2 w-56" align="end">
              <DropdownMenuItem>
                <div className="flex flex-col">
                  <p>
                    {currentUser.first_name} {currentUser.last_name}
                  </p>
                  <p className="text-gray-400">{currentUser.email}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    "https://sso.gauchoracing.com/users/348220961155448833/edit",
                    "_blank",
                  )
                }
              >
                <div className="flex">Profile</div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex">Settings</div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  logout();
                  navigate("/auth/login");
                }}
              >
                <div className="flex flex-col text-red-500">Sign Out</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default Header;
