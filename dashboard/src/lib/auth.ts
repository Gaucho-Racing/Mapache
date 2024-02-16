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
      var userId = localStorage.getItem("id");
      const response = await axios.get(`${MAPACHE_API_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.status == 200) {
        currentUser.id = response.data.id;
        currentUser.firstName = response.data.first_name;
        currentUser.lastName = response.data.last_name;
        currentUser.email = response.data.email;
        currentUser.subteam = response.data.subteam;
        currentUser.roles = response.data.roles;
        currentUser.updatedAt = response.data.updated_at;
        currentUser.createdAt = response.data.created_at;

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
