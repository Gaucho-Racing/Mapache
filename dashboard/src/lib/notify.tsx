import {
  faCheckCircle,
  faWarning,
  faXmarkCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "sonner";

interface Notify {
  info(message: string, description?: string): void;
  success(message: string, description?: string): void;
  warning(message: string, description?: string): void;
  error(message: string, description?: string): void;
}

export const notify: Notify = {
  info: (title: string, description?: string) => {
    toast(title, {
      description: description,
    });
  },
  success: (title: string, description?: string) => {
    toast(title, {
      icon: <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />,
      description: description,
    });
  },
  warning: (title: string, description?: string) => {
    toast(title, {
      icon: <FontAwesomeIcon icon={faWarning} className="text-yellow-400" />,
      description: description,
    });
  },
  error: (title: string, description?: string) => {
    toast(title, {
      icon: <FontAwesomeIcon icon={faXmarkCircle} className="text-red-400" />,
      description: description,
    });
  },
};
