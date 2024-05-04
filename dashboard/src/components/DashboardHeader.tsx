import { Separator } from "./ui/separator";

interface HeaderProps {
  className?: string;
  style?: React.CSSProperties;
}

const DashboardHeader = (props: HeaderProps) => {
  return (
    <nav
      className={`fixed top-0 w-full items-center justify-start bg-black ${props.className}`}
      style={props.style}
    >
      <div className="flex flex-row items-center p-4">
        <img src="logo/mapache.png" className="h-12 pr-4" />
        <h1 className="">Mapache</h1>
      </div>
      <Separator />
    </nav>
  );
};

export default DashboardHeader;
