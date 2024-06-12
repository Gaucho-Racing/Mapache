import { MAPACHE_API_URL, currentUser } from "@/consts/config";
import axios from "axios";

export const checkCredentials = async () => {
  if (
    localStorage.getItem("id") == null ||
    localStorage.getItem("token") == null
  ) {
    return 1;
  } else if (currentUser.id == "") {
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
          return 1;
        }
        return 0;
      }
    } catch (error) {
      return 1;
    }
  } else {
    return 0;
  }
};

export const logout = () => {
  localStorage.removeItem("id");
  localStorage.removeItem("token");
  currentUser.id = "";
  currentUser.firstName = "";
  currentUser.lastName = "";
  currentUser.email = "";
  currentUser.subteam = "";
  currentUser.roles = [];
};
