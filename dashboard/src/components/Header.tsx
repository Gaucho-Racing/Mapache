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
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  className?: string;
  headerTitle?: string;
  style?: React.CSSProperties;
  scroll: number;
}

const Header = (props: HeaderProps) => {
  const navigate = useNavigate();
  const currentUser = useUser();

  return (
    <nav
      className={`fixed top-0 z-20 w-full items-center justify-start transition-all duration-200 ${props.scroll > 24 ? "bg-card shadow-lg" : "bg-background"} ${props.className}`}
      style={{ ...props.style }}
    >
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center p-4">
          <h1 className="text-2xl font-bold">{props.headerTitle}</h1>
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
                    `https://sso.gauchoracing.com/users/${currentUser.id}/edit`,
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
      {props.scroll > 24 ? <Separator /> : null}
    </nav>
  );
};

export default Header;
