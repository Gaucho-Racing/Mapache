import { initUser } from "@/models/user";
import createStore from "react-superstore";

export const [useUser, setUser, getUser] = createStore(initUser);
