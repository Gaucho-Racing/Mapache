import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "./ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentUser } from "@/consts/config";
import { SHA256 } from "crypto-js";
import { useNavigate } from "react-router-dom";
import { logout } from "@/lib/auth";

interface HeaderProps {
  className?: string;
  style?: React.CSSProperties;
  scroll: number;
}

const Header = (props: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <nav
      className={`fixed top-0 z-20 w-full items-center justify-start transition-all duration-200 ${props.scroll > 24 ? "bg-card shadow-lg" : "bg-background"} ${props.className}`}
      style={{ ...props.style }}
    >
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center p-4">bruh</div>
        <div className="mr-4 flex flex-row p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarImage
                  src={`https://gravatar.com/avatar/${SHA256(currentUser.email)}`}
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem>
                <div className="flex flex-col">
                  <p>
                    {currentUser.firstName} {currentUser.lastName}
                  </p>
                  <p className="text-gray-500">{currentUser.email}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
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
                  navigate("/auth/register");
                }}
              >
                <div className="flex flex-col text-red-500">Sign Out</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {props.scroll > 24 ? <Separator /> : null}
    </nav>
  );
};

export default Header;
